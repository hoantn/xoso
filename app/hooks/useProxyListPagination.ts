"use client"

import { useState, useCallback } from "react"
import type { Proxy } from "../types/proxy"

interface UseProxyListPaginationProps {
  apiEndpoint: string
  token?: string
}

interface ProxyListResponse {
  success: boolean
  proxies?: Proxy[]
  data?: Proxy[]
  total?: number
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export function useProxyListPagination({ apiEndpoint, token }: UseProxyListPaginationProps) {
  const [proxies, setProxies] = useState<Proxy[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Thêm tham số search vào fetchProxies
  const fetchProxies = useCallback(
    async (page = 1, limit = 10, search: string = "") => {
      setLoading(true)
      setError(null)

      try {
        const url = new URL(apiEndpoint, window.location.origin)
        url.searchParams.set("page", page.toString())
        url.searchParams.set("limit", limit.toString())
        if (search) {
          url.searchParams.set("search", search) // Thêm tham số search vào URL
        }

        const headers: HeadersInit = {
          "Content-Type": "application/json",
        }

        if (token) {
          headers.Authorization = `Bearer ${token}`
        }

        const response = await fetch(url.toString(), { headers })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data: ProxyListResponse = await response.json()

        if (!data.success) {
          throw new Error("API returned error")
        }

        // Handle both old and new response formats
        const proxyList = data.data || data.proxies || []
        const total = data.pagination?.total || data.total || proxyList.length

        setProxies(proxyList)
        setTotalCount(total)
      } catch (err) {
        console.error("Error fetching proxies:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
        setProxies([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    },
    [apiEndpoint, token],
  )

  return {
    proxies,
    totalCount,
    loading,
    error,
    fetchProxies,
  }
}
