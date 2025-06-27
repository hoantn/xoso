"use client"

import type React from "react"
import { useEffect, useRef, useCallback, useMemo } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/app/components/AuthProvider"

export function RealtimeNotificationProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const { user, refreshBalance } = useAuth()
  const supabase = useMemo(() => createClientComponentClient(), [])

  // Stable references to prevent unnecessary re-renders
  const channelRef = useRef<any>(null)
  const isConnectedRef = useRef(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const userIdRef = useRef<string | null>(null)

  const maxReconnectAttempts = 3
  const baseReconnectDelay = 2000 // 2 seconds

  // Stable channel name - only changes when user changes
  const channelName = useMemo(() => {
    return user ? `transactions-user-${user.id}` : null
  }, [user])

  // Stable event handler to prevent re-subscriptions
  const handleRealtimeEvent = useCallback(
    (payload: any) => {
      console.log("📡 REALTIME EVENT:", {
        eventType: payload.eventType,
        timestamp: new Date().toISOString(),
        userId: userIdRef.current,
      })

      // Reset reconnect attempts on successful event
      reconnectAttemptsRef.current = 0

      // Handle INSERT events (new completed deposits)
      if (payload.eventType === "INSERT") {
        const newRecord = payload.new
        if (newRecord?.type === "deposit" && newRecord?.status === "completed") {
          console.log("🎉 NEW COMPLETED DEPOSIT! Showing notification...")

          toast({
            title: "Nạp tiền thành công! 🎉",
            description: `Số tiền ${new Intl.NumberFormat("vi-VN").format(
              Number(newRecord.amount),
            )} VND đã được nạp vào tài khoản của bạn.`,
            duration: 8000,
          })

          // Use setTimeout to prevent blocking the realtime event handler
          setTimeout(() => {
            refreshBalance()
          }, 100)
        }
      }

      // Handle UPDATE events (deposits changed to completed)
      if (payload.eventType === "UPDATE") {
        const { new: newRecord, old: oldRecord } = payload
        if (newRecord?.type === "deposit" && newRecord?.status === "completed" && oldRecord?.status !== "completed") {
          console.log("🎉 DEPOSIT STATUS UPDATED TO COMPLETED! Showing notification...")

          toast({
            title: "Nạp tiền thành công! 🎉",
            description: `Số tiền ${new Intl.NumberFormat("vi-VN").format(
              Number(newRecord.amount),
            )} VND đã được nạp vào tài khoản của bạn.`,
            duration: 8000,
          })

          // Use setTimeout to prevent blocking the realtime event handler
          setTimeout(() => {
            refreshBalance()
          }, 100)
        }
      }
    },
    [toast, refreshBalance],
  )

  // Stable subscription status handler
  const handleSubscriptionStatus = useCallback(
    (status: string, err?: any) => {
      console.log(`📡 Realtime subscription status: ${status}`, new Date().toISOString())

      if (err) {
        console.error("❌ Realtime subscription error:", err)
      }

      if (status === "SUBSCRIBED") {
        console.log("✅ Successfully subscribed to transactions realtime updates")
        isConnectedRef.current = true
        reconnectAttemptsRef.current = 0

        // Clear any pending reconnection attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        isConnectedRef.current = false

        // Only attempt reconnection if we have a user and haven't exceeded max attempts
        if (userIdRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
          console.log(
            `🔄 Connection issue: ${status}. Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`,
          )

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            setupRealtimeSubscription()
          }, delay)
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error("❌ Max reconnection attempts reached.")
          toast({
            title: "Kết nối bị gián đoạn",
            description: "Vui lòng tải lại trang để nhận thông báo real-time.",
            duration: 10000,
          })
        }
      }
    },
    [toast],
  )

  // Setup realtime subscription - only called when necessary
  const setupRealtimeSubscription = useCallback(() => {
    if (!user || !channelName) {
      console.log("🔄 No user or channel name, skipping realtime subscription")
      return
    }

    // Don't create new subscription if already connected to the same user
    if (isConnectedRef.current && userIdRef.current === user.id && channelRef.current) {
      console.log("🔄 Already connected for this user, skipping setup")
      return
    }

    // Always clean up existing subscription before creating new one
    if (channelRef.current) {
      console.log("🧹 Cleaning up existing channel before creating new one")
      try {
        supabase.removeChannel(channelRef.current)
      } catch (error) {
        console.warn("Warning during channel cleanup:", error)
      }
      channelRef.current = null
      isConnectedRef.current = false
    }

    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    console.log(`🔄 Setting up realtime subscription for user: ${user.username}`)
    userIdRef.current = user.id

    // Create new channel with event handlers
    const channel = supabase.channel(channelName).on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "transactions",
        filter: `user_id=eq.${user.id}`,
      },
      handleRealtimeEvent,
    )

    // Store channel reference BEFORE subscribing
    channelRef.current = channel

    // Subscribe only once
    channel.subscribe(handleSubscriptionStatus)
  }, [user, channelName, supabase, handleRealtimeEvent, handleSubscriptionStatus])

  // Setup subscription when user changes
  useEffect(() => {
    setupRealtimeSubscription()

    // Cleanup only on unmount or when user becomes null
    return () => {
      console.log("🔄 Component cleanup triggered")
      if (channelRef.current) {
        console.log("🧹 Cleaning up realtime subscription in useEffect cleanup")
        try {
          supabase.removeChannel(channelRef.current)
        } catch (error) {
          console.warn("Warning during useEffect cleanup:", error)
        }
        channelRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      isConnectedRef.current = false
      userIdRef.current = null
    }
  }, [user?.id, supabase]) // Removed setupRealtimeSubscription from dependencies

  // Periodic health check - less aggressive than before
  useEffect(() => {
    if (!user) return

    const healthCheckInterval = setInterval(() => {
      if (channelRef.current && userIdRef.current === user.id) {
        const state = channelRef.current.state
        console.log("💓 Health check - Channel state:", state)

        // Only reconnect if channel is in a definitively bad state AND we're not already trying to reconnect
        if ((state === "closed" || state === "errored") && !isConnectedRef.current && !reconnectTimeoutRef.current) {
          console.log("💔 Channel in bad state, scheduling reconnection...")
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeSubscription()
          }, 1000)
        }
      }
    }, 60000) // Check every 60 seconds

    return () => clearInterval(healthCheckInterval)
  }, [user?.id])

  // Handle page visibility changes - reconnect when page becomes visible after being hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && user && !isConnectedRef.current) {
        console.log("👁️ Page became visible and not connected, checking connection...")
        setTimeout(() => {
          if (!isConnectedRef.current) {
            console.log("🔄 Reconnecting due to page visibility change...")
            setupRealtimeSubscription()
          }
        }, 2000) // Longer delay to ensure page is fully loaded
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
  }, [user?.id, setupRealtimeSubscription])

  return <>{children}</>
}
