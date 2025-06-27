"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  History,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  CalendarIcon,
  Search,
  Filter,
  Settings,
  Loader2,
  Eye,
  Copy,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog" // Added Dialog components
import { Separator } from "@/components/ui/separator" // Added Separator
import { useToast } from "@/hooks/use-toast" // Added useToast

interface Transaction {
  id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  description: string
  status: string
  created_at: string
  user: {
    id: string
    username: string
    full_name: string | null
  }
  created_by_user?: {
    id: string
    username: string
    full_name: string | null
  }
  metadata?: {
    admin_notes?: string
    payment_info_snapshot?: {
      bank_name: string
      account_number: string
      account_name: string
      qr_code_url: string
      transaction_id: string
      amount: number
      memo: string
    }
    [key: string]: any
  }
}

interface AdminTransactionSummary {
  total_transactions: number
  total_deposits: number
  total_purchases: number
  total_adjustments: number
  total_refunds: number
  total_withdrawals: number
  total_volume: number
}

interface AdminTransactionStatsProps {
  token: string
}

export default function AdminTransactionStats({ token }: AdminTransactionStatsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<AdminTransactionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [userIdFilter, setUserIdFilter] = useState("")
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit, setLimit] = useState(10)
  const [stats, setStats] = useState<AdminTransactionSummary | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null) // State for modal

  const { toast } = useToast() // Initialize useToast

  const fetchTransactions = useCallback(
    async (page = 1, currentLimit = 10, type = "all", status = "all", userId = "", startDt?: Date, endDt?: Date) => {
      if (!token) {
        setError("Token không hợp lệ. Vui lòng đăng nhập lại.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      console.log(
        `[AdminTransactionStats] Fetching: page=${page}, limit=${currentLimit}, type=${type}, status=${status}, userId=${userId}, startDate=${startDt}, endDate=${endDt}`,
      )

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: currentLimit.toString(),
        })

        if (type !== "all") params.append("type", type)
        if (status !== "all") params.append("status", status)
        if (userId) params.append("userId", userId)
        if (startDt) params.append("startDate", startDt.toISOString())
        if (endDt) params.append("endDate", endDt.toISOString())

        const response = await fetch(`/api/admin/transactions?${params}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: `Lỗi ${response.status}` }))
          throw new Error(errorData.error || `Lỗi ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log("[AdminTransactionStats] Data received:", data)

        if (!data.success) {
          throw new Error(data.error || "Không thể tải dữ liệu giao dịch")
        }

        setTransactions(data.data || [])
        setStats(data.stats) // Set the stats data here
        setTotalPages(data.pagination?.totalPages || 1)
        setCurrentPage(data.pagination?.page || 1)
        setLimit(data.pagination?.limit || 10)
      } catch (err) {
        console.error("[AdminTransactionStats] Fetch error:", err)
        setError(err instanceof Error ? err.message : "Lỗi không xác định")
        setTransactions([])
        setStats(null) // Clear stats on error
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    fetchTransactions(currentPage, limit, typeFilter, statusFilter, userIdFilter, startDate, endDate)
  }, [currentPage, limit, typeFilter, statusFilter, userIdFilter, startDate, endDate, fetchTransactions])

  const handleRefresh = () => {
    fetchTransactions(currentPage, limit, typeFilter, statusFilter, userIdFilter, startDate, endDate)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage)
    }
  }

  const handleLimitChange = (newLimit: string) => {
    const parsedLimit = Number.parseInt(newLimit)
    setLimit(parsedLimit)
    setCurrentPage(1)
  }

  const handleClearFilters = () => {
    setTypeFilter("all")
    setStatusFilter("all")
    setUserIdFilter("")
    setStartDate(undefined)
    setEndDate(undefined)
    setCurrentPage(1)
  }

  // Adjustment modal states
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [adjustmentForm, setAdjustmentForm] = useState({
    userId: "",
    amount: "",
    description: "",
    type: "admin_adjustment",
  })
  const [adjustmentLoading, setAdjustmentLoading] = useState(false)

  const handleAdjustment = async () => {
    if (!adjustmentForm.userId || !adjustmentForm.amount || !adjustmentForm.description) {
      setError("Vui lòng điền đầy đủ thông tin")
      return
    }

    setAdjustmentLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch("/api/admin/transactions/adjustment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(adjustmentForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Không thể tạo giao dịch điều chỉnh")
      }

      setSuccess(data.message)
      setShowAdjustmentModal(false)
      setAdjustmentForm({
        userId: "",
        amount: "",
        description: "",
        type: "admin_adjustment",
      })

      // Refresh transactions
      fetchTransactions(currentPage, limit, typeFilter, statusFilter, userIdFilter, startDate, endDate)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định")
    } finally {
      setAdjustmentLoading(false)
    }
  }

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <TrendingUp className="w-5 h-5 text-green-600" />
    } else if (amount < 0) {
      return <TrendingDown className="w-5 h-5 text-red-600" />
    }
    return <DollarSign className="w-5 h-5 text-gray-600" />
  }

  const getTransactionTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      deposit: "Nạp tiền",
      proxy_purchase: "Mua proxy",
      admin_adjustment: "Điều chỉnh",
      refund: "Hoàn tiền",
      withdrawal: "Rút tiền",
      initial_balance: "Số dư ban đầu",
    }
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getStatusBadge = (status: string) => {
    const statusClasses: { [key: string]: string } = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    }
    const statusLabels: { [key: string]: string } = {
      completed: "Hoàn thành",
      pending: "Đang xử lý",
      failed: "Thất bại",
      cancelled: "Đã hủy",
    }
    return (
      <Badge className={statusClasses[status] || "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}>
        {statusLabels[status] || status}
      </Badge>
    )
  }

  const formatAmount = (transaction: Transaction) => {
    const absAmount = Math.abs(transaction.amount)
    let sign = ""
    let colorClass = ""

    if (transaction.type === "withdrawal") {
      sign = "-" // Withdrawals are negative for the user
      colorClass = "text-red-600" // Red for withdrawals
    } else if (transaction.type === "refund") {
      sign = "+" // Refunds are typically positive for the user
      colorClass = "text-yellow-600" // Yellow for refunds
    } else if (transaction.amount > 0) {
      sign = "+"
      colorClass = "text-green-600" // Green for positive
    } else if (transaction.amount < 0) {
      sign = "-"
      colorClass = "text-red-600" // Red for negative
    } else {
      // For zero-impact transactions (e.g., some admin adjustments that don't change balance)
      sign = ""
      colorClass = "text-gray-700" // Black/gray for no change
    }

    return (
      <span className={`font-semibold ${colorClass}`}>
        {sign}
        {absAmount.toLocaleString("vi-VN")} VNĐ
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    } catch (e) {
      return dateString
    }
  }

  const getBorderClass = (transaction: Transaction) => {
    if (transaction.type === "withdrawal") {
      return "border-l-4 border-red-500"
    }
    if (transaction.type === "refund") {
      return "border-l-4 border-yellow-500"
    }
    if (transaction.amount > 0) {
      return "border-l-4 border-green-500"
    }
    if (transaction.amount < 0) {
      return "border-l-4 border-red-500"
    }
    return "border-l-4 border-gray-400" // Default for other types or zero amount
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Đã sao chép!",
          description: `${label} đã được sao chép vào clipboard.`,
        })
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
        toast({
          title: "Lỗi sao chép",
          description: `Không thể sao chép ${label}.`,
          variant: "destructive",
        })
      })
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng giao dịch</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_transactions || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng nạp</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{(stats.total_deposits || 0).toLocaleString("vi-VN")} VNĐ
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng chi tiêu</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{(stats.total_purchases || 0).toLocaleString("vi-VN")} VNĐ
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Điều chỉnh</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats.total_adjustments || 0) > 0 ? "+" : ""}
                {(stats.total_adjustments || 0).toLocaleString("vi-VN")} VNĐ
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng hoàn tiền</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                +{(stats.total_refunds || 0).toLocaleString("vi-VN")} VNĐ
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng rút tiền</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{(stats.total_withdrawals || 0).toLocaleString("vi-VN")} VNĐ
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <History className="w-6 h-6" />
              Quản lý giao dịch
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Làm mới
              </Button>
              <Button onClick={handleClearFilters} variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Xóa bộ lọc
              </Button>
              <Dialog open={showAdjustmentModal} onOpenChange={setShowAdjustmentModal}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Settings className="w-4 h-4 mr-2" />
                    Điều chỉnh số dư
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Điều chỉnh số dư người dùng</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="userId">User ID</Label>
                      <Input
                        id="userId"
                        value={adjustmentForm.userId}
                        onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, userId: e.target.value }))}
                        placeholder="Nhập User ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="amount">Số tiền (VNĐ)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={adjustmentForm.amount}
                        onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, amount: e.target.value }))}
                        placeholder="Số dương để cộng, số âm để trừ"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Mô tả</Label>
                      <Input
                        id="description"
                        value={adjustmentForm.description}
                        onChange={(e) => setAdjustmentForm((prev) => ({ ...prev, description: e.target.value }))}
                        placeholder="Lý do điều chỉnh"
                      />
                    </div>
                    <Button onClick={handleAdjustment} disabled={adjustmentLoading} className="w-full">
                      {adjustmentLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Settings className="w-4 h-4 mr-2" />
                      )}
                      Thực hiện điều chỉnh
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="user-id-filter" className="sr-only">
                Lọc theo User ID
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user-id-filter"
                  placeholder="Lọc theo User ID"
                  value={userIdFilter}
                  onChange={(e) => setUserIdFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="type-filter" className="sr-only">
                Lọc theo loại
              </Label>
              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger id="type-filter" className="w-full">
                  <SelectValue placeholder="Loại giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="deposit">Nạp tiền</SelectItem>
                  <SelectItem value="proxy_purchase">Mua proxy</SelectItem>
                  <SelectItem value="admin_adjustment">Điều chỉnh</SelectItem>
                  <SelectItem value="refund">Hoàn tiền</SelectItem>
                  <SelectItem value="withdrawal">Rút tiền</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter" className="sr-only">
                Lọc theo trạng thái
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger id="status-filter" className="w-full">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="pending">Đang xử lý</SelectItem>
                  <SelectItem value="failed">Thất bại</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="limit-select" className="sr-only">
                Số mục mỗi trang
              </Label>
              <Select value={limit.toString()} onValueChange={handleLimitChange}>
                <SelectTrigger id="limit-select" className="w-full">
                  <SelectValue placeholder="Mục/trang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / trang</SelectItem>
                  <SelectItem value="20">20 / trang</SelectItem>
                  <SelectItem value="50">50 / trang</SelectItem>
                  <SelectItem value="100">100 / trang</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-full flex flex-col sm:flex-row gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Từ ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={2023}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Đến ngày"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={2023}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-600">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              Đang tải dữ liệu...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Không tìm thấy giao dịch</h3>
              <p className="text-gray-500">Không có giao dịch nào phù hợp với bộ lọc của bạn.</p>
              <Button onClick={handleClearFilters} variant="outline" className="mt-4">
                Xóa bộ lọc và thử lại
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                {/* Sử dụng HTML table thay vì shadcn/ui Table components */}
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">
                        Người dùng
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[150px]">
                        Loại
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Mô tả</th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[150px]">
                        Số tiền
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[150px]">
                        Số dư sau
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[120px]">
                        Trạng thái
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">
                        Người tạo
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[180px]">
                        Thời gian
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[80px]">
                        Chi tiết
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className={`border-b transition-colors hover:bg-muted/50 ${getBorderClass(transaction)}`}
                      >
                        <td className="p-4 align-middle font-medium">
                          <div>
                            <p className="font-medium">{transaction.user?.username}</p>
                            {transaction.user?.full_name && (
                              <p className="text-sm text-gray-600">{transaction.user.full_name}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.type, transaction.amount)}
                            <span className="font-medium">{getTransactionTypeLabel(transaction.type)}</span>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          <div className="max-w-xs truncate" title={transaction.description}>
                            {transaction.description || "Không có mô tả"}
                          </div>
                        </td>
                        <td className="p-4 align-middle text-right font-mono">{formatAmount(transaction)}</td>
                        <td className="p-4 align-middle text-right font-mono">
                          {transaction.balance_after.toLocaleString("vi-VN")} VNĐ
                        </td>
                        <td className="p-4 align-middle">{getStatusBadge(transaction.status)}</td>
                        <td className="p-4 align-middle text-sm text-gray-600">
                          {transaction.created_by_user ? (
                            <span className="text-sm">{transaction.created_by_user.username}</span>
                          ) : (
                            <span className="text-sm text-gray-500">Hệ thống</span>
                          )}
                        </td>
                        <td className="p-4 align-middle text-sm text-gray-600">{formatDate(transaction.created_at)}</td>
                        <td className="p-4 align-middle">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedTransaction(transaction)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            {selectedTransaction && selectedTransaction.id === transaction.id && (
                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>
                                    Chi tiết giao dịch: {getTransactionTypeLabel(selectedTransaction.type)}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4 text-sm">
                                  <p>
                                    <strong>Mã GD:</strong> {selectedTransaction.id}
                                  </p>
                                  <p>
                                    <strong>Người dùng:</strong> {selectedTransaction.user?.username} (
                                    {selectedTransaction.user?.full_name || "N/A"})
                                  </p>
                                  <p>
                                    <strong>Loại:</strong> {getTransactionTypeLabel(selectedTransaction.type)}
                                  </p>
                                  <p>
                                    <strong>Số tiền:</strong> {formatAmount(selectedTransaction)}
                                  </p>
                                  <p>
                                    <strong>Số dư trước:</strong>{" "}
                                    {selectedTransaction.balance_before.toLocaleString("vi-VN")} VNĐ
                                  </p>
                                  <p>
                                    <strong>Số dư sau:</strong>{" "}
                                    {selectedTransaction.balance_after.toLocaleString("vi-VN")} VNĐ
                                  </p>
                                  <p>
                                    <strong>Trạng thái:</strong> {getStatusBadge(selectedTransaction.status)}
                                  </p>
                                  <p>
                                    <strong>Thời gian:</strong> {formatDate(selectedTransaction.created_at)}
                                  </p>
                                  <p>
                                    <strong>Mô tả:</strong> {selectedTransaction.description || "Không có mô tả"}
                                  </p>
                                  <p>
                                    <strong>Người tạo:</strong>{" "}
                                    {selectedTransaction.created_by_user
                                      ? selectedTransaction.created_by_user.username
                                      : "Hệ thống"}
                                  </p>

                                  {/* Conditional details based on transaction type */}
                                  {selectedTransaction.type === "withdrawal" &&
                                    selectedTransaction.metadata?.admin_notes && (
                                      <>
                                        <Separator />
                                        <p>
                                          <strong>Ghi chú của Admin:</strong> {selectedTransaction.metadata.admin_notes}
                                        </p>
                                      </>
                                    )}

                                  {selectedTransaction.type === "deposit" &&
                                    selectedTransaction.metadata?.payment_info_snapshot && (
                                      <>
                                        <Separator />
                                        <h4 className="font-semibold mb-2">Thông tin nạp tiền</h4>
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <p>
                                              <strong>Ngân hàng:</strong>{" "}
                                              {selectedTransaction.metadata.payment_info_snapshot.bank_name}
                                            </p>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                copyToClipboard(
                                                  selectedTransaction.metadata.payment_info_snapshot.bank_name,
                                                  "Tên ngân hàng",
                                                )
                                              }
                                            >
                                              <Copy className="w-4 h-4" />
                                            </Button>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <p>
                                              <strong>Chủ TK:</strong>{" "}
                                              {selectedTransaction.metadata.payment_info_snapshot.account_name}
                                            </p>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                copyToClipboard(
                                                  selectedTransaction.metadata.payment_info_snapshot.account_name,
                                                  "Tên chủ tài khoản",
                                                )
                                              }
                                            >
                                              <Copy className="w-4 h-4" />
                                            </Button>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <p>
                                              <strong>Số TK:</strong>{" "}
                                              {selectedTransaction.metadata.payment_info_snapshot.account_number}
                                            </p>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                copyToClipboard(
                                                  selectedTransaction.metadata.payment_info_snapshot.account_number,
                                                  "Số tài khoản",
                                                )
                                              }
                                            >
                                              <Copy className="w-4 h-4" />
                                            </Button>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <p>
                                              <strong>Số tiền:</strong>{" "}
                                              {selectedTransaction.metadata.payment_info_snapshot.amount.toLocaleString(
                                                "vi-VN",
                                              )}{" "}
                                              VNĐ
                                            </p>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                copyToClipboard(
                                                  selectedTransaction.metadata.payment_info_snapshot.amount.toString(),
                                                  "Số tiền",
                                                )
                                              }
                                            >
                                              <Copy className="w-4 h-4" />
                                            </Button>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <p>
                                              <strong>Nội dung:</strong>{" "}
                                              {selectedTransaction.metadata.payment_info_snapshot.memo}
                                            </p>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                copyToClipboard(
                                                  selectedTransaction.metadata.payment_info_snapshot.memo,
                                                  "Nội dung chuyển khoản",
                                                )
                                              }
                                            >
                                              <Copy className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                        {selectedTransaction.metadata.payment_info_snapshot.qr_code_url && (
                                          <div className="flex flex-col items-center mt-4">
                                            <p className="text-sm font-medium mb-2">Quét mã QR để nạp tiền</p>
                                            <img
                                              src={
                                                selectedTransaction.metadata.payment_info_snapshot.qr_code_url ||
                                                "/placeholder.svg" ||
                                                "/placeholder.svg"
                                              }
                                              alt="QR Code"
                                              className="w-48 h-48 object-contain"
                                            />
                                          </div>
                                        )}
                                      </>
                                    )}
                                </div>
                                <DialogClose asChild>
                                  <Button type="button" variant="secondary">
                                    Đóng
                                  </Button>
                                </DialogClose>
                              </DialogContent>
                            )}
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Trang {currentPage} / {totalPages} (Tổng: {summary?.total_transactions || 0} giao dịch)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                      variant="outline"
                      size="sm"
                    >
                      Trước
                    </Button>
                    <Button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || loading}
                      variant="outline"
                      size="sm"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
