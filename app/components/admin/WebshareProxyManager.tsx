"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, RefreshCw, Replace, Settings, Search } from "lucide-react"
import { StatusModal } from "@/components/StatusModal"
import type { WebshareProxy, WebshareStatistics } from "@/app/types/webshare"
import { useAuth } from "@/app/components/AuthProvider"

export default function WebshareProxyManager() {
  const { user, loading: authLoading } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [proxies, setProxies] = useState<WebshareProxy[]>([])
  const [statistics, setStatistics] = useState<WebshareStatistics | null>(null)
  const [loadingProxies, setLoadingProxies] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProxiesCount, setTotalProxiesCount] = useState(0)

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusModalTitle, setStatusModalTitle] = useState("")
  const [statusModalMessage, setStatusModalMessage] = useState("")
  const [statusModalType, setStatusModalType] = useState<"success" | "error" | "info">("info")
  const [statusModalDetails, setStatusModalDetails] = useState<{ label: string; value: string | number }[] | undefined>(
    undefined,
  )

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token")
    setToken(storedToken)
  }, [])

  const showModal = (
    type: "success" | "error" | "info",
    title: string,
    message: string,
    details?: { label: string; value: string | number }[],
  ) => {
    setStatusModalType(type)
    setStatusModalTitle(title)
    setStatusModalMessage(message)
    setStatusModalDetails(details)
    setShowStatusModal(true)
  }

  const fetchWebshareProxies = useCallback(
    async (page: number, search: string) => {
      if (!token) return
      setLoadingProxies(true)
      setError(null)
      try {
        const response = await fetch(`/api/admin/webshare/proxies?page=${page}&limit=10&search=${search}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.message || "Failed to fetch Webshare proxies")
        }
        setProxies(result.data)
        setTotalProxiesCount(result.total)
        setTotalPages(Math.ceil(result.total / 10))
      } catch (err: any) {
        setError(err.message)
        showModal("error", "Lỗi tải Proxy Webshare", err.message)
      } finally {
        setLoadingProxies(false)
      }
    },
    [token],
  )

  const fetchWebshareStatistics = useCallback(async () => {
    if (!token) return
    setLoadingStats(true)
    try {
      const response = await fetch("/api/admin/webshare/statistics", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || "Failed to fetch Webshare statistics")
      }
      setStatistics(result.data)
    } catch (err: any) {
      setError(err.message)
      showModal("error", "Lỗi tải Thống kê Webshare", err.message)
    } finally {
      setLoadingStats(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      const handler = setTimeout(() => {
        fetchWebshareProxies(currentPage, searchTerm)
      }, 300)
      return () => clearTimeout(handler)
    }
  }, [token, currentPage, searchTerm, fetchWebshareProxies])

  useEffect(() => {
    if (token) {
      fetchWebshareStatistics()
    }
  }, [token, fetchWebshareStatistics])

  const handleReplaceProxy = async (proxyId: string) => {
    if (!confirm(`Bạn có chắc chắn muốn thay thế proxy ID: ${proxyId} này không?`)) {
      return
    }
    if (!token) {
      showModal("error", "Lỗi xác thực", "Không có token xác thực. Vui lòng đăng nhập lại.")
      return
    }
    try {
      const response = await fetch("/api/admin/webshare/proxies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "replace", proxyId, mode: "random" }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || "Failed to replace proxy")
      }
      showModal("success", "Thành công", "Proxy đã được thay thế thành công!")
      fetchWebshareProxies(currentPage, searchTerm) // Refresh list
    } catch (err: any) {
      showModal("error", "Lỗi thay thế Proxy", err.message)
    }
  }

  const handleUpdateConfig = async () => {
    // Đây là một ví dụ, bạn cần xây dựng UI để nhập cấu hình mới
    // và gửi nó qua API. Ví dụ này chỉ là một placeholder.
    const newConfig = {
      /* your new config object */
    }
    if (!confirm("Bạn có chắc chắn muốn cập nhật cấu hình Webshare không?")) {
      return
    }
    if (!token) {
      showModal("error", "Lỗi xác thực", "Không có token xác thực. Vui lòng đăng nhập lại.")
      return
    }
    try {
      const response = await fetch("/api/admin/webshare/proxies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "update_config", newConfig }),
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.message || "Failed to update Webshare config")
      }
      showModal("success", "Thành công", "Cấu hình Webshare đã được cập nhật!")
    } catch (err: any) {
      showModal("error", "Lỗi cập nhật cấu hình", err.message)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#229ED9] animate-spin" />
        <p className="ml-4 text-lg">Đang tải dữ liệu...</p>
      </div>
    )
  }

  if (!user) {
    return <p>Vui lòng đăng nhập để truy cập trang này.</p> // Should be handled by AdminPage parent
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-gray-900">{statistics?.total_proxies ?? "N/A"}</div>
            <div className="text-gray-600">Tổng số Proxy Webshare</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{statistics?.active_proxies ?? "N/A"}</div>
            <div className="text-gray-600">Proxy đang hoạt động</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">
              {statistics?.bandwidth_used_gb ?? "N/A"} / {statistics?.bandwidth_limit_gb ?? "N/A"} GB
            </div>
            <div className="text-gray-600">Băng thông đã sử dụng</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quản lý Proxy Webshare</CardTitle>
          <CardDescription>Xem và quản lý các proxy của bạn từ Webshare.io.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Tìm kiếm proxy theo host..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => fetchWebshareProxies(1, searchTerm)} variant="outline" className="text-gray-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Làm mới danh sách
              </Button>
              <Button onClick={handleUpdateConfig} variant="outline" className="text-gray-700">
                <Settings className="w-4 h-4 mr-2" />
                Cập nhật cấu hình
              </Button>
            </div>
          </div>

          {loadingProxies ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-8 h-8 text-[#229ED9] animate-spin" />
              <p className="ml-2">Đang tải proxy...</p>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : proxies.length === 0 ? (
            <div className="text-center text-gray-500 py-4">Không tìm thấy proxy nào.</div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Host</TableHead>
                      <TableHead>Port</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Quốc gia</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Hết hạn vào</TableHead>
                      <TableHead className="text-right">Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proxies.map((proxy) => (
                      <TableRow key={proxy.id}>
                        <TableCell className="font-medium">{proxy.id.substring(0, 8)}...</TableCell>
                        <TableCell>{proxy.host}</TableCell>
                        <TableCell>{proxy.port}</TableCell>
                        <TableCell>{proxy.type.toUpperCase()}</TableCell>
                        <TableCell>
                          {proxy.country_code} - {proxy.city_name}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              proxy.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {proxy.is_active ? "Hoạt động" : "Không hoạt động"}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(proxy.expires_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReplaceProxy(proxy.id)}
                            className="text-gray-700"
                          >
                            <Replace className="w-4 h-4 mr-2" />
                            Thay thế
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Trước
                </Button>
                <span>
                  Trang {currentPage} / {totalPages} (Tổng: {totalProxiesCount})
                </span>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Tiếp
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <StatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title={statusModalTitle}
        message={statusModalMessage}
        type={statusModalType}
        details={statusModalDetails}
      />
    </div>
  )
}
