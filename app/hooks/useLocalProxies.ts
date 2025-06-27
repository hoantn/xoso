"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/components/AuthProvider"

export interface Proxy {
  id: string
  user_id: string
  server: string
  port: number
  username: string
  password: string
  description: string
  type: "http" | "socks5" | "mtproto"
  is_active: boolean
  created_at: string
  updated_at: string
}

export function useLocalProxies() {
  const { user, isAdmin } = useAuth()
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load proxies from localStorage
  const loadProxies = () => {
    try {
      setLoading(true)
      const stored = localStorage.getItem("telegram-proxies")

      if (stored) {
        const allProxies = JSON.parse(stored) as Proxy[]

        // Admin có thể xem tất cả proxy, user chỉ xem proxy của mình
        if (isAdmin) {
          setProxies(allProxies)
        } else if (user) {
          setProxies(allProxies.filter((proxy) => proxy.user_id === user.id))
        } else {
          setProxies([])
        }
      } else {
        setProxies([])
      }
    } catch (err) {
      setError("Lỗi khi tải dữ liệu proxy")
    } finally {
      setLoading(false)
    }
  }

  // Save proxies to localStorage
  const saveProxies = (newProxies: Proxy[]) => {
    try {
      // Lấy tất cả proxy hiện có
      const stored = localStorage.getItem("telegram-proxies")
      const allProxies: Proxy[] = stored ? JSON.parse(stored) : []

      // Cập nhật hoặc thêm proxy mới
      newProxies.forEach((newProxy) => {
        const existingIndex = allProxies.findIndex((p) => p.id === newProxy.id)
        if (existingIndex >= 0) {
          allProxies[existingIndex] = newProxy
        } else {
          allProxies.push(newProxy)
        }
      })

      localStorage.setItem("telegram-proxies", JSON.stringify(allProxies))
      loadProxies() // Reload để cập nhật state
    } catch (err) {
      setError("Lỗi khi lưu dữ liệu proxy")
    }
  }

  // Add new proxy
  const addProxy = async (proxyData: Omit<Proxy, "id" | "user_id" | "created_at" | "updated_at">) => {
    if (!user) throw new Error("User not authenticated")

    const newProxy: Proxy = {
      ...proxyData,
      id: crypto.randomUUID(),
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    saveProxies([newProxy])
    return newProxy
  }

  // Update proxy
  const updateProxy = async (id: string, proxyData: Partial<Omit<Proxy, "id" | "user_id" | "created_at">>) => {
    if (!user) throw new Error("User not authenticated")

    const existingProxy = proxies.find((p) => p.id === id)
    if (!existingProxy) throw new Error("Proxy not found")

    // Kiểm tra quyền: admin có thể sửa tất cả, user chỉ sửa proxy của mình
    if (!isAdmin && existingProxy.user_id !== user.id) {
      throw new Error("Không có quyền sửa proxy này")
    }

    const updatedProxy: Proxy = {
      ...existingProxy,
      ...proxyData,
      updated_at: new Date().toISOString(),
    }

    saveProxies([updatedProxy])
    return updatedProxy
  }

  // Delete proxy
  const deleteProxy = async (id: string) => {
    if (!user) throw new Error("User not authenticated")

    const existingProxy = proxies.find((p) => p.id === id)
    if (!existingProxy) throw new Error("Proxy not found")

    // Kiểm tra quyền: admin có thể xóa tất cả, user chỉ xóa proxy của mình
    if (!isAdmin && existingProxy.user_id !== user.id) {
      throw new Error("Không có quyền xóa proxy này")
    }

    try {
      const stored = localStorage.getItem("telegram-proxies")
      if (stored) {
        const allProxies = JSON.parse(stored) as Proxy[]
        const filteredProxies = allProxies.filter((p) => p.id !== id)
        localStorage.setItem("telegram-proxies", JSON.stringify(filteredProxies))
        loadProxies()
      }
    } catch (err) {
      setError("Lỗi khi xóa proxy")
    }
  }

  // Bulk import proxies
  const bulkImportProxies = async (proxiesData: Omit<Proxy, "id" | "user_id" | "created_at" | "updated_at">[]) => {
    if (!user) throw new Error("User not authenticated")

    const newProxies = proxiesData.map((data) => ({
      ...data,
      id: crypto.randomUUID(),
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    saveProxies(newProxies)
    return newProxies
  }

  useEffect(() => {
    loadProxies()
  }, [user, isAdmin])

  return {
    proxies,
    loading,
    error,
    addProxy,
    updateProxy,
    deleteProxy,
    bulkImportProxies,
    refreshProxies: loadProxies,
  }
}
