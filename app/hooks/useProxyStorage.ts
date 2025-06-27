"use client"

import { useState, useEffect } from "react"
import type { Proxy } from "../types/proxy"

export function useProxyStorage() {
  const [proxies, setProxies] = useState<Proxy[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("telegram-proxies")
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Convert createdAt strings back to Date objects
        const proxiesWithDates = parsed.map((proxy: any) => ({
          ...proxy,
          createdAt: new Date(proxy.createdAt),
        }))
        setProxies(proxiesWithDates)
      } catch (error) {
        console.error("Error loading proxies from localStorage:", error)
      }
    }
  }, [])

  // Save to localStorage whenever proxies change
  useEffect(() => {
    localStorage.setItem("telegram-proxies", JSON.stringify(proxies))
  }, [proxies])

  const addProxy = (proxyData: Omit<Proxy, "id" | "createdAt">) => {
    const newProxy: Proxy = {
      ...proxyData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    }
    setProxies((prev) => [newProxy, ...prev])
  }

  const updateProxy = (id: string, proxyData: Omit<Proxy, "id" | "createdAt">) => {
    setProxies((prev) => prev.map((proxy) => (proxy.id === id ? { ...proxy, ...proxyData } : proxy)))
  }

  const deleteProxy = (id: string) => {
    setProxies((prev) => prev.filter((proxy) => proxy.id !== id))
  }

  return {
    proxies,
    addProxy,
    updateProxy,
    deleteProxy,
  }
}
