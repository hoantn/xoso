"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/app/components/AuthProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  User,
  Key,
  Save,
  Eye,
  EyeOff,
  Home,
  LogOut,
  TextIcon as Telegram,
  Shield,
  Settings,
  CreditCard,
  Banknote,
  History,
  QrCode,
  Wallet,
  ShoppingCart,
  RefreshCw,
} from "lucide-react"
import Image from "next/image"
import TransactionHistory from "@/app/components/TransactionHistory"
import Link from "next/link"
// Import useProxyListPagination
import { useProxyListPagination } from "../hooks/useProxyListPagination"
// Import ProxyListWithPagination
import ProxyListWithPagination from "../components/ProxyListWithPagination"
import ProxyShop from "@/app/components/ProxyShop"
// Add the following import at the top of the file
import WithdrawalForm from "@/app/components/WithdrawalForm"

interface PageUserProfile {
  id: string
  username: string
  full_name: string | null
  role: string
  created_at: string
  balance: string
}

interface DepositRequestResponse {
  transaction_id: string
  bank_details: {
    bank_name: string
    account_name: string
    account_number: string
    transfer_memo: string
    amount: number
  }
  qr_code_url: string
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get tab from URL or default to 'account'
  const currentTab = searchParams.get("tab") || "account"

  // Function to handle tab change and update URL
  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("tab", newTab)
    router.push(`/dashboard?${params.toString()}`, { scroll: false })
  }

  // ... existing states
  const [isSpinning, setIsSpinning] = useState(false)
  const { user: authUser, loading: authLoading, signOut, isAdmin, balance: authBalance, refreshBalance } = useAuth()

  // Wrap the original refreshBalance call to add spinning effect
  const handleRefreshBalance = useCallback(async () => {
    setIsSpinning(true)
    await refreshBalance()
    setTimeout(() => {
      setIsSpinning(false)
    }, 1000) // Spin for 1 second
  }, [refreshBalance])

  const [profile, setProfile] = useState<PageUserProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [fullName, setFullName] = useState("")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [depositAmount, setDepositAmount] = useState("")
  const [isDepositing, setIsDepositing] = useState(false)
  const [depositInfo, setDepositInfo] = useState<DepositRequestResponse | null>(null)
  const [depositError, setDepositError] = useState<string | null>(null)

  const fetchPageProfile = useCallback(async () => {
    if (!authUser) return
    setLoadingProfile(true)
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Không thể tải thông tin tài khoản")
      }
      const data: PageUserProfile = await response.json()
      setProfile(data)
      setFullName(data.full_name || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định khi tải profile")
    } finally {
      setLoadingProfile(false)
    }
  }, [authUser, setLoadingProfile, setProfile, setFullName, setError])

  // Thêm hook useProxyListPagination
  const {
    proxies: userProxies,
    totalCount: totalUserProxies,
    loading: loadingProxies,
    error: proxyError,
    fetchProxies: fetchUserProxiesPaginated,
  } = useProxyListPagination({
    apiEndpoint: "/api/proxies/my",
    token: typeof window !== "undefined" ? localStorage.getItem("auth_token") || "" : "",
  })

  // Thêm useEffect để gọi fetchUserProxiesPaginated khi authUser thay đổi
  useEffect(() => {
    if (authUser) {
      fetchPageProfile()
      fetchUserProxiesPaginated(1, 10) // Fetch initial page
    }
  }, [authUser, fetchPageProfile, fetchUserProxiesPaginated])

  // Thêm hàm handlePageChange cho ProxyListWithPagination
  const handleUserProxiesPageChange = useCallback(
    (page: number, limit: number) => {
      fetchUserProxiesPaginated(page, limit)
    },
    [fetchUserProxiesPaginated],
  )

  useEffect(() => {
    if (authUser) {
      fetchPageProfile()
    }
  }, [authUser, fetchPageProfile])

  const handleDepositRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setDepositError(null)
    setDepositInfo(null)
    setIsDepositing(true)

    const amount = Number.parseFloat(depositAmount)
    if (isNaN(amount) || amount <= 0) {
      setDepositError("Vui lòng nhập số tiền hợp lệ.")
      setIsDepositing(false)
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/deposits/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Tạo yêu cầu nạp tiền thất bại.")
      }
      setDepositInfo(data)
      setDepositAmount("")
    } catch (err) {
      setDepositError(err instanceof Error ? err.message : "Lỗi không xác định khi nạp tiền.")
    } finally {
      setIsDepositing(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (newPassword && newPassword !== confirmNewPassword) {
      setError("Mật khẩu mới không khớp.")
      return
    }

    setLoadingProfile(true)
    try {
      const token = localStorage.getItem("auth_token")
      const payload: any = { fullName }
      if (newPassword) {
        payload.oldPassword = oldPassword
        payload.newPassword = newPassword
      }

      const response = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Cập nhật thất bại")
      }
      setSuccess(data.message || "Cập nhật thành công!")
      setOldPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
      await refreshBalance()
      if (data.user) {
        setProfile((prev) => (prev ? { ...prev, full_name: data.user.full_name } : null))
        setFullName(data.user.full_name || "")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định khi cập nhật profile")
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleDummyDeleteProxy = (id: string) => {
    console.log("Yêu cầu xóa proxy (chức năng demo):", id)
    alert("Tính năng xóa proxy từ dashboard người dùng chưa được triển khai đầy đủ.")
  }

  if (authLoading || (authUser && loadingProfile && !profile)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#229ED9] mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Đang tải dữ liệu người dùng...</p>
        </div>
      </div>
    )
  }

  if (!authUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Truy cập bị hạn chế</h2>
            <p className="text-gray-600 mb-6">Vui lòng đăng nhập để truy cập trang quản lý.</p>
            <Link href="/#login">
              <Button className="bg-[#229ED9] hover:bg-[#1a7db8]">Đăng nhập</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-4 sm:gap-y-0">
            <div className="flex items-center gap-3">
              <Telegram className="w-8 h-8 text-[#229ED9]" />
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <Badge className="bg-blue-100 text-blue-800">Người dùng</Badge>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-2">
              {authUser && (
                <>
                  <div className="text-right">
                    <div className="text-sm font-medium">{authUser.fullName || authUser.username}</div>
                    <div className="text-xs text-gray-500">@{authUser.username}</div>
                  </div>
                  <Badge
                    variant={authUser.role === "admin" || authUser.role === "super_admin" ? "destructive" : "secondary"}
                  >
                    {authUser.role}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm font-medium text-green-600 border border-green-200 bg-green-50 px-2 py-1 rounded-md">
                    <Wallet size={16} />
                    {authBalance !== null ? (
                      `${authBalance.toLocaleString("vi-VN")} VNĐ`
                    ) : (
                      <Loader2 size={16} className="animate-spin" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefreshBalance} // Change from refreshBalance to handleRefreshBalance
                      disabled={authLoading || isSpinning} // Disable while spinning
                      className={`h-6 w-6 text-green-600 hover:bg-green-100 ${isSpinning ? "animate-spin" : ""}`}
                    >
                      <RefreshCw size={14} />
                    </Button>
                  </div>
                </>
              )}
              {isAdmin && (
                <Link href="/admin95">
                  <Button variant="outline" size="sm">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Về trang chủ
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Chào mừng, {authUser.fullName || authUser.username}! 👋
          </h2>
          <p className="text-gray-600">Quản lý thông tin tài khoản và proxy của bạn tại đây.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex w-full flex-wrap gap-2 h-auto p-1 mb-8">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Thông tin tài khoản
            </TabsTrigger>
            <TabsTrigger value="proxies" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              Proxy của tôi
            </TabsTrigger>
            <TabsTrigger value="deposit" className="flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Nạp tiền
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Lịch sử giao dịch
            </TabsTrigger>
            {/* Add a new TabsTrigger inside the TabsList, after the "transactions" trigger */}
            <TabsTrigger value="withdraw" className="flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Rút tiền
            </TabsTrigger>
            <TabsTrigger value="shop" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Mua Proxy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Thông tin cơ bản
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Username</Label>
                    <p className="font-semibold text-lg">{authUser.username}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Vai trò</Label>
                    <div className="mt-1">
                      <Badge
                        variant={
                          authUser.role === "admin" || authUser.role === "super_admin" ? "destructive" : "secondary"
                        }
                      >
                        {authUser.role}
                      </Badge>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">Ngày tham gia</Label>
                    <p className="font-medium">
                      {profile
                        ? new Date(profile.created_at).toLocaleDateString("vi-VN")
                        : authUser?.createdAt
                          ? new Date(authUser.createdAt).toLocaleDateString("vi-VN")
                          : "N/A"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Cập nhật thông tin
                  </CardTitle>
                  <CardDescription>Thay đổi thông tin cá nhân và mật khẩu của bạn.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Họ và tên</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nhập họ tên của bạn"
                      />
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Đổi mật khẩu (để trống nếu không muốn thay đổi)
                      </h4>
                      <div className="space-y-2">
                        <Label htmlFor="oldPassword">Mật khẩu hiện tại</Label>
                        <div className="relative">
                          <Input
                            id="oldPassword"
                            type={showOldPassword ? "text" : "password"}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="Nhập mật khẩu hiện tại"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                            onClick={() => setShowOldPassword(!showOldPassword)}
                          >
                            {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">Mật khẩu mới</Label>
                          <div className="relative">
                            <Input
                              id="newPassword"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Ít nhất 6 ký tự"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmNewPassword">Xác nhận mật khẩu mới</Label>
                          <Input
                            id="confirmNewPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu mới"
                          />
                        </div>
                      </div>
                    </div>
                    <Button type="submit" disabled={loadingProfile} className="w-full bg-[#229ED9] hover:bg-[#1a7db8]">
                      {loadingProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Lưu thay đổi
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="proxies" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{totalUserProxies}</div>
                      <div className="text-gray-600">Tổng số Proxy</div>
                    </div>
                    <Key className="w-8 h-8 text-[#229ED9]" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {userProxies.filter((p) => p.is_active).length}
                      </div>
                      <div className="text-gray-600">Proxy hoạt động</div>
                    </div>
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">Premium</div>
                      <div className="text-gray-600">Loại tài khoản</div>
                    </div>
                    <CreditCard className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <ProxyListWithPagination
              title="Danh sách Proxy riêng"
              proxies={userProxies}
              totalCount={totalUserProxies}
              loading={loadingProxies}
              onPageChange={handleUserProxiesPageChange}
              showActions={false} // User dashboard doesn't show edit/delete actions
            />
          </TabsContent>

          <TabsContent value="deposit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="w-5 h-5" /> Tạo yêu cầu nạp tiền (VNĐ)
                </CardTitle>
                <CardDescription>
                  Nhập số tiền bạn muốn nạp. Hệ thống sẽ tạo mã QR và thông tin chuyển khoản. Số dư hiện tại:{" "}
                  {authLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin inline-block" />
                  ) : authBalance !== null ? (
                    `${authBalance.toLocaleString("vi-VN")} VNĐ`
                  ) : (
                    "N/A"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {depositInfo ? (
                  <div className="space-y-4 p-4 border rounded-md bg-green-50">
                    <h3 className="text-lg font-semibold text-green-700">Yêu cầu nạp tiền đã được tạo!</h3>
                    <p className="text-sm text-gray-600">
                      Vui lòng chuyển khoản chính xác thông tin dưới đây để được cộng tiền vào tài khoản.
                    </p>
                    <Separator />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p>
                          <strong>Ngân hàng:</strong> {depositInfo.bank_details.bank_name}
                        </p>
                        <p>
                          <strong>Chủ tài khoản:</strong> {depositInfo.bank_details.account_name}
                        </p>
                        <p>
                          <strong>Số tài khoản:</strong> {depositInfo.bank_details.account_number}
                        </p>
                        <p>
                          <strong>Số tiền:</strong>{" "}
                          <span className="font-bold text-red-600">
                            {depositInfo.bank_details.amount.toLocaleString("vi-VN")} VNĐ
                          </span>
                        </p>
                        <p>
                          <strong>Nội dung chuyển khoản:</strong>{" "}
                          <span className="font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            {depositInfo.bank_details.transfer_memo}
                          </span>
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          Lưu ý: Chuyển khoản chính xác nội dung để giao dịch được xử lý tự động (nếu có) hoặc nhanh
                          chóng bởi admin.
                        </p>
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <p className="mb-2 font-medium">Quét mã QR để thanh toán:</p>
                        <Image
                          src={depositInfo.qr_code_url || "/placeholder.svg"}
                          alt="VietQR Code"
                          width={250}
                          height={250}
                          className="border rounded-md"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setDepositInfo(null)
                        setDepositError(null)
                      }}
                      className="mt-4 w-full"
                    >
                      Tạo yêu cầu nạp tiền khác
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleDepositRequest} className="space-y-4">
                    <div>
                      <Label htmlFor="depositAmount">Số tiền cần nạp (VNĐ)</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Ví dụ: 100000 (tối thiểu 10,000 VNĐ)"
                        min="10000"
                        required
                      />
                    </div>
                    {depositError && (
                      <Alert variant="destructive">
                        <AlertDescription>{depositError}</AlertDescription>
                      </Alert>
                    )}
                    <Button type="submit" disabled={isDepositing} className="w-full bg-[#229ED9] hover:bg-[#1a7db8]">
                      {isDepositing ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <QrCode className="w-4 h-4 mr-2" />
                      )}
                      Xác nhận và lấy thông tin chuyển khoản
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            {authUser && <TransactionHistory token={localStorage.getItem("auth_token") || ""} />}
          </TabsContent>

          {/* Add a new TabsContent inside the Tabs component, after the "transactions" content */}
          <TabsContent value="withdraw" className="space-y-6">
            <WithdrawalForm />
          </TabsContent>

          <TabsContent value="shop" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cửa hàng Proxy</CardTitle>
                <CardDescription>Chọn một gói proxy phù hợp với nhu cầu của bạn.</CardDescription>
              </CardHeader>
              <CardContent>
                <ProxyShop />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
