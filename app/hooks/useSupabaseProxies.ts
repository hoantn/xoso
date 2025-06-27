"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/app/components/AuthProvider"
import type { Database } from "@/lib/supabase"

type Proxy = Database["public"]["Tables"]["proxies"]["Row"]
type ProxyInsert = Database["public"]["Tables"]["proxies"]["Insert"]
type ProxyUpdate = Database["public"]["Tables"]["proxies"]["Update"]

export function useSupabaseProxies() {
  const { user, isAdmin } = useAuth()
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load proxies from Supabase
  const loadProxies = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log("🔄 Loading proxies for user:", user?.username, "isAdmin:", isAdmin)

      let query = supabase.from("proxies").select("*")

      // Nếu không phải admin, chỉ lấy proxy của user hiện tại
      if (!isAdmin && user) {
        query = query.eq("user_id", user.id)
        console.log("👤 Loading user-specific proxies for:", user.id)
      } else if (isAdmin) {
        console.log("👑 Loading all proxies (admin mode)")
      } else {
        // Không có user, không load gì
        console.log("❌ No user, skipping proxy load")
        setProxies([])
        setLoading(false)
        return
      }

      const { data, error } = await query.order("created_at", { ascending: false })

      if (error) {
        console.error("❌ Supabase error:", error)
        throw error
      }

      console.log("✅ Loaded proxies:", data?.length || 0)
      setProxies(data || [])
    } catch (err) {
      console.error("💥 Load proxies error:", err)
      setError(err instanceof Error ? err.message : "Lỗi khi tải proxy")
    } finally {
      setLoading(false)
    }
  }

  // Add new proxy
  const addProxy = async (proxyData: Omit<ProxyInsert, "user_id">) => {
    if (!user) throw new Error("User not authenticated")

    try {
      console.log("➕ Adding proxy:", proxyData)

      const { data, error } = await supabase
        .from("proxies")
        .insert({
          ...proxyData,
          user_id: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error("❌ Add proxy error:", error)
        throw error
      }

      console.log("✅ Proxy added:", data)
      setProxies((prev) => [data, ...prev])
      return data
    } catch (err) {
      console.error("💥 Add proxy error:", err)
      setError(err instanceof Error ? err.message : "Lỗi khi thêm proxy")
      throw err
    }
  }

  // Update proxy
  const updateProxy = async (id: string, proxyData: Omit<ProxyUpdate, "id" | "user_id">) => {
    if (!user) throw new Error("User not authenticated")

    try {
      console.log("✏️ Updating proxy:", id, proxyData)

      let query = supabase.from("proxies").update(proxyData).eq("id", id)

      // Nếu không phải admin, chỉ cho phép update proxy của user hiện tại
      if (!isAdmin) {
        query = query.eq("user_id", user.id)
      }

      const { data, error } = await query.select().single()

      if (error) {
        console.error("❌ Update proxy error:", error)
        throw error
      }

      console.log("✅ Proxy updated:", data)
      setProxies((prev) => prev.map((proxy) => (proxy.id === id ? data : proxy)))
      return data
    } catch (err) {
      console.error("💥 Update proxy error:", err)
      setError(err instanceof Error ? err.message : "Lỗi khi cập nhật proxy")
      throw err
    }
  }

  // Delete proxy
  const deleteProxy = async (id: string) => {
    if (!user) throw new Error("User not authenticated")

    try {
      console.log("🗑️ Deleting proxy:", id)

      let query = supabase.from("proxies").delete().eq("id", id)

      // Nếu không phải admin, chỉ cho phép xóa proxy của user hiện tại
      if (!isAdmin) {
        query = query.eq("user_id", user.id)
      }

      const { error } = await query

      if (error) {
        console.error("❌ Delete proxy error:", error)
        throw error
      }

      console.log("✅ Proxy deleted")
      setProxies((prev) => prev.filter((proxy) => proxy.id !== id))
    } catch (err) {
      console.error("💥 Delete proxy error:", err)
      setError(err instanceof Error ? err.message : "Lỗi khi xóa proxy")
      throw err
    }
  }

  // Bulk import proxies
  const bulkImportProxies = async (proxiesData: Omit<ProxyInsert, "user_id">[]) => {
    if (!user) throw new Error("User not authenticated")

    try {
      console.log("📦 Bulk importing proxies:", proxiesData.length, "for user:", user.id)

      // Prepare data with proper user_id
      const dataToInsert = proxiesData.map((proxy) => ({
        ...proxy,
        user_id: user.id,
        is_active: proxy.is_active ?? true,
      }))

      console.log("📦 Data to insert sample:", dataToInsert[0])

      const { data, error } = await supabase.from("proxies").insert(dataToInsert).select()

      if (error) {
        console.error("❌ Bulk import error:", error)
        throw error
      }

      console.log("✅ Bulk import successful:", data?.length)
      setProxies((prev) => [...(data || []), ...prev])
      return data
    } catch (err) {
      console.error("💥 Bulk import error:", err)
      setError(err instanceof Error ? err.message : "Lỗi khi import proxy")
      throw err
    }
  }

  // Log proxy usage
  const logProxyUsage = async (proxyId: string, success: boolean, errorMessage?: string) => {
    if (!user) return

    try {
      await supabase.from("proxy_usage_stats").insert({
        proxy_id: proxyId,
        user_id: user.id,
        success,
        error_message: errorMessage || null,
      })
      console.log("📊 Usage logged for proxy:", proxyId)
    } catch (err) {
      console.error("Failed to log proxy usage:", err)
    }
  }

  useEffect(() => {
    if (user !== null) {
      // Only load when user state is determined (not null)
      loadProxies()
    }
  }, [user, isAdmin])

  return {
    proxies,
    loading,
    error,
    addProxy,
    updateProxy,
    deleteProxy,
    bulkImportProxies,
    logProxyUsage,
    refreshProxies: loadProxies,
  }
}
