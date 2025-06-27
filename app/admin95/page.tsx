"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Globe,
  Plus,
  Search,
  TextIcon as Telegram,
  Home,
  Upload,
  Download,
  LogOut,
  ShieldAlert,
  Zap,
  Users,
  DropletsIcon as DepositIcon,
  Landmark,
  BarChart3,
  Package,
  Banknote,
  Dice6,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProxyForm from "../components/ProxyForm"
import BulkImportModal from "../components/BulkImportModal"
import ExportModal from "../components/ExportModal"
import { useAuth } from "../components/AuthProvider"
import { useProxyListPagination } from "../hooks/useProxyListPagination"
import ProxyListWithPagination from "../components/ProxyListWithPagination"
import Link from "next/link"
import AdminLoginForm from "../components/AdminLoginForm"
import DatabaseStatus from "../components/DatabaseStatus"
import UserManagementTable from "../components/UserManagementTable"
import DepositsTable from "../components/admin/DepositsTable"
import BankAccountsManagement from "../components/admin/BankAccountsManagement"
import AdminTransactionStats from "../components/admin/AdminTransactionStats"
import ProxyPlansManager from "../components/admin/ProxyPlansManager"
import ProxyStatsTable from "../components/admin/ProxyStatsTable"
import { StatusModal } from "@/components/StatusModal"
import WithdrawalRequestsTable from "../components/admin/WithdrawalRequestsTable"
import WebshareProxyManager from "../components/admin/WebshareProxyManager"
import { LotteryDrawManager } from "../components/admin/LotteryDrawManager"

export default function AdminPage() {
  const { user, loading: authLoading, signOut, isAdmin } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusModalTitle, setStatusModalTitle] = useState("")
  const [statusModalMessage, setStatusModalMessage] = useState("")
  const [statusModalType, setStatusModalType] = useState<"success" | "error" | "info">("info")
  const [statusModalDetails, setStatusModalDetails] = useState<{ label: string; value: string | number }[] | undefined>(
    undefined,
  )

  const { proxies, totalCount, loading, error, fetchProxies } = useProxyListPagination({
    apiEndpoint: "/api/admin/proxies",
    token: token || "",
  })

  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token")
    setToken(storedToken)
    console.log("🔑 Token loaded from localStorage:", storedToken ? `${storedToken.substring(0, 10)}...` : "null")
  }, [])

  useEffect(() => {
    if (token) {
      const handler = setTimeout(() => {
        fetchProxies(1, 10, searchTerm)
      }, 300)

      return () => {
        clearTimeout(handler)
      }
    }
  }, [token, searchTerm, fetchProxies])

  const handleAdminProxiesPageChange = useCallback(
    (page: number, limit: number) => {
      fetchProxies(page, limit, searchTerm)
    },
    [fetchProxies, searchTerm],
  )

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

  const handleAddProxy = async (proxyData: any) => {
    try {
      console.log("🔧 Adding proxy:", proxyData)
      console.log("🔑 Using token:", token ? `${token.substring(0, 10)}...` : "null")

      if (!token) {
        showModal("error", "Lỗi xác thực", "Không có token xác thực. Vui lòng đăng nhập lại.")
        return
      }

      const response = await fetch("/api/admin/proxies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(proxyData),
      })

      console.log("📡 Response status:", response.status)

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("❌ Non-JSON response:", textResponse)
        showModal("error", "Lỗi Server", "Server trả về phản hồi không phải JSON.", [
          { label: "Chi tiết", value: textResponse.substring(0, 200) + "..." },
        ])
        return
      }

      const result = await response.json()

      if (!response.ok) {
        console.error("❌ Failed to add proxy:", result)
        showModal(
          "error",
          "Thêm Proxy Thất Bại",
          result.message || result.error || "Đã xảy ra lỗi không xác định khi thêm proxy.",
          [{ label: "Mã lỗi", value: response.status }],
        )
        return
      }

      console.log("✅ Proxy added successfully:", result)
      setShowForm(false)
      fetchProxies(1, 10, searchTerm)
      showModal("success", "Thành công", "Proxy đã được thêm thành công!")
    } catch (err) {
      console.error("💥 Failed to add proxy:", err)
      showModal("error", "Lỗi Kết Nối", `Lỗi kết nối: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleUpdateProxy = async (proxyData: any) => {
    if (editingProxy) {
      try {
        console.log("🔧 Updating proxy:", editingProxy.id, proxyData)

        if (!token) {
          showModal("error", "Lỗi xác thực", "Không có token xác thực. Vui lòng đăng nhập lại.")
          return
        }

        const response = await fetch(`/api/admin/proxies/${editingProxy.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(proxyData),
        })

        console.log("📡 Response status:", response.status)

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const textResponse = await response.text()
          console.error("❌ Non-JSON response:", textResponse)
          showModal("error", "Lỗi Server", "Server trả về phản hồi không phải JSON.", [
            { label: "Chi tiết", value: textResponse.substring(0, 200) + "..." },
          ])
          return
        }

        const result = await response.json()

        if (!response.ok) {
          console.error("❌ Failed to update proxy:", result)
          showModal(
            "error",
            "Cập nhật Proxy Thất Bại",
            result.message || result.error || "Đã xảy ra lỗi không xác định khi cập nhật proxy.",
            [{ label: "Mã lỗi", value: response.status }],
          )
          return
        }

        console.log("✅ Proxy updated successfully:", result)
        setEditingProxy(null)
        setShowForm(false)
        fetchProxies(1, 10, searchTerm)
        showModal("success", "Thành công", "Proxy đã được cập nhật thành công!")
      } catch (err) {
        console.error("💥 Failed to update proxy:", err)
        showModal("error", "Lỗi Kết Nối", `Lỗi kết nối: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  const deleteProxy = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa proxy này?")) {
      return
    }

    try {
      console.log("🔧 Deleting proxy:", id)

      if (!token) {
        showModal("error", "Lỗi xác thực", "Không có token xác thực. Vui lòng đăng nhập lại.")
        return
      }

      const response = await fetch(`/api/admin/proxies/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("📡 Response status:", response.status)

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("❌ Non-JSON response:", textResponse)
        showModal("error", "Lỗi Server", "Server trả về phản hồi không phải JSON.", [
          { label: "Chi tiết", value: textResponse.substring(0, 200) + "..." },
        ])
        return
      }

      const result = await response.json()

      if (!response.ok) {
        console.error("❌ Failed to delete proxy:", result)
        showModal(
          "error",
          "Xóa Proxy Thất Bại",
          result.message || result.error || "Đã xảy ra lỗi không xác định khi xóa proxy.",
          [{ label: "Mã lỗi", value: response.status }],
        )
        return
      }

      console.log("✅ Proxy deleted successfully:", result)
      fetchProxies(1, 10, searchTerm)
      showModal("success", "Thành công", "Proxy đã được xóa thành công!")
    } catch (err) {
      console.error("💥 Failed to delete proxy:", err)
      showModal("error", "Lỗi Kết Nối", `Lỗi kết nối: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleBulkImport = async (proxiesData: any[]) => {
    try {
      console.log("🔧 Bulk importing proxies:", proxiesData.length)

      if (!token) {
        showModal("error", "Lỗi xác thực", "Không có token xác thực. Vui lòng đăng nhập lại.")
        return
      }

      const response = await fetch("/api/admin/proxies/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(proxiesData),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error("❌ Failed to bulk import:", result)
        showModal(
          "error",
          "Import Hàng Loạt Thất Bại",
          result.message || result.error || "Đã xảy ra lỗi không xác định khi import hàng loạt.",
          [{ label: "Mã lỗi", value: response.status }],
        )
        return
      }

      setShowBulkImport(false)
      fetchProxies(1, 10, searchTerm)
      showModal("success", "Thành công", `Đã import thành công ${result.added || 0} proxy.`)
    } catch (err) {
      console.error("Failed to bulk import:", err)
      showModal("error", "Lỗi Kết Nối", `Lỗi kết nối: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const [editingProxy, setEditingProxy] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [activeTab, setActiveTab] = useState("manage")

  const handleEditProxy = (proxy: any) => {
    setEditingProxy(proxy)
    setShowForm(true)
    setActiveTab("manage")
  }

  const handleCancelEdit = () => {
    setEditingProxy(null)
    setShowForm(false)
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const handleRefreshToken = () => {
    const storedToken = localStorage.getItem("auth_token")
    setToken(storedToken)
    console.log("🔄 Token refreshed:", storedToken ? `${storedToken.substring(0, 10)}...` : "null")
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Telegram className="w-12 h-12 text-[#229ED9] mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <AdminLoginForm />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Truy cập bị từ chối</h2>
            <p className="text-gray-600 mb-6">
              Bạn không có quyền truy cập trang này. Chỉ tài khoản admin mới có thể truy cập.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={handleSignOut} variant="outline">
                <LogOut className="w-4 h-4 mr-2" />
                Đăng xuất
              </Button>
              <Link href="/">
                <Button className="bg-[#229ED9] hover:bg-[#1a7db8]">
                  <Home className="w-4 h-4 mr-2" />
                  Về trang chủ
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-4 sm:gap-y-0">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-[#229ED9]" />
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <DatabaseStatus />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-2">
              {user && (
                <>
                  <div className="text-right">
                    <div className="text-sm font-medium">{user.fullName || user.username}</div>
                    <div className="text-xs text-gray-500">@{user.username}</div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{user.role}</Badge>
                </>
              )}
              <Button variant="outline" size="sm" onClick={handleRefreshToken}>
                <Zap className="w-4 h-4 mr-2" />
                Làm mới token
              </Button>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Về trang chủ
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full flex-wrap gap-2 h-auto p-1 mb-8">
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Telegram className="w-4 h-4" />
              Quản lý Proxy
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Quản lý User
            </TabsTrigger>
            <TabsTrigger value="deposits" className="flex items-center gap-2">
              <DepositIcon className="w-4 h-4" />
              Quản lý Nạp tiền
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Yêu cầu rút tiền
            </TabsTrigger>
            <TabsTrigger value="banks" className="flex items-center gap-2">
              <Landmark className="w-4 h-4" />
              Quản lý Ngân hàng
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Thống kê Giao dịch
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Gói Proxy
            </TabsTrigger>
            <TabsTrigger value="proxy-stats" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Thống kê Proxy
            </TabsTrigger>
            <TabsTrigger value="webshare" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Quản lý Webshare
            </TabsTrigger>
            <TabsTrigger value="lottery" className="flex items-center gap-2">
              <Dice6 className="w-4 h-4" />
              Quay số
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Tìm kiếm theo IP hoặc mô tả..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {proxies.length > 0 && (
                  <Button onClick={() => setShowExport(true)} variant="outline" className="text-gray-700">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}
                <Button onClick={() => setShowBulkImport(true)} variant="outline" className="text-gray-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Import Proxy
                </Button>
                <Button onClick={() => setShowForm(!showForm)} className="bg-[#229ED9] hover:bg-[#1a7db8] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm Proxy
                </Button>
              </div>
            </div>
            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingProxy ? "Chỉnh sửa Proxy" : "Thêm Proxy mới"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ProxyForm
                    initialData={editingProxy}
                    onSubmit={editingProxy ? handleUpdateProxy : handleAddProxy}
                    onCancel={handleCancelEdit}
                  />
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
                  <div className="text-gray-600">Tổng số Proxy</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-gray-900">{proxies.length}</div>
                  <div className="text-gray-600">Kết quả tìm kiếm (trang hiện tại)</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-green-600">✅ Ready</div>
                  <div className="text-gray-600">Database Status</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-blue-600">{proxies.filter((p) => p.is_active).length}</div>
                  <div className="text-gray-600">Proxy hoạt động (trang hiện tại)</div>
                </CardContent>
              </Card>
            </div>
            <ProxyListWithPagination
              title="Danh sách Proxy"
              proxies={proxies}
              totalCount={totalCount}
              loading={loading}
              onEdit={handleEditProxy}
              onDelete={deleteProxy}
              onPageChange={handleAdminProxiesPageChange}
              showActions={true}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách người dùng</CardTitle>
                <CardDescription>Quản lý tài khoản người dùng trong hệ thống.</CardDescription>
              </CardHeader>
              <CardContent>
                {" "}
                {/* Đã thêm thẻ đóng CardContent */}
                {token ? <UserManagementTable token={token} /> : <p>Không thể xác thực để tải danh sách người dùng.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deposits" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách yêu cầu nạp tiền</CardTitle>
                <CardDescription>Xem và duyệt các yêu cầu nạp tiền từ người dùng.</CardDescription>
              </CardHeader>
              <CardContent>
                {token ? <DepositsTable token={token} /> : <p>Không thể xác thực để tải danh sách yêu cầu nạp tiền.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banks" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Quản lý Tài khoản Ngân hàng</CardTitle>
                <CardDescription>Cấu hình các tài khoản ngân hàng để nhận tiền nạp từ người dùng.</CardDescription>
              </CardHeader>
              <CardContent>
                {" "}
                {/* Đã thêm thẻ đóng CardContent */}
                {token ? (
                  <BankAccountsManagement token={token} />
                ) : (
                  <p>Không thể xác thực để tải thông tin ngân hàng.</p>
                )}
              </CardContent>
            </Card>{" "}
            {/* Đã thêm thẻ đóng Card */}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Thống kê và Quản lý Giao dịch</CardTitle>
                <CardDescription>Xem thống kê chi tiết và quản lý tất cả giao dịch trong hệ thống.</CardDescription>
              </CardHeader>
              <CardContent>
                {token ? <AdminTransactionStats token={token} /> : <p>Không thể xác thực để tải thống kê giao dịch.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Quản lý Gói Proxy</CardTitle>
                <CardDescription>Tạo và quản lý các gói proxy để bán cho người dùng.</CardDescription>
              </CardHeader>
              <CardContent>
                {token ? <ProxyPlansManager token={token} /> : <p>Không thể xác thực để quản lý gói proxy.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proxy-stats" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Thống kê Người dùng Proxy</CardTitle>
                <CardDescription>Xem số lượng người dùng đang hoạt động trên mỗi proxy.</CardDescription>
              </CardHeader>
              <CardContent>
                {token ? <ProxyStatsTable token={token} /> : <p>Không thể xác thực để tải thống kê proxy.</p>}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="withdrawals" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách yêu cầu rút tiền</CardTitle>
                <CardDescription>Xem và duyệt các yêu cầu rút tiền từ người dùng.</CardDescription>
              </CardHeader>
              <CardContent>
                {token ? (
                  <WithdrawalRequestsTable token={token} />
                ) : (
                  <p>Không thể xác thực để tải danh sách yêu cầu rút tiền.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webshare" className="space-y-8">
            <WebshareProxyManager />
          </TabsContent>
          <TabsContent value="lottery" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Quản lý Quay Số Lô Đề</CardTitle>
                <CardDescription>Quay số tự động và thủ công cho các phiên lô đề nhanh.</CardDescription>
              </CardHeader>
              <CardContent>
                {token ? <LotteryDrawManager token={token} /> : <p>Không thể xác thực để quản lý quay số.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <BulkImportModal isOpen={showBulkImport} onClose={() => setShowBulkImport(false)} onImport={handleBulkImport} />
        <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} proxies={proxies} />

        <StatusModal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          title={statusModalTitle}
          message={statusModalMessage}
          type={statusModalType}
          details={statusModalDetails}
        />
      </div>
    </div>
  )
}
