"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { Label } from "@/components/ui/label"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  AlertTriangle,
  History,
  Filter,
  Eye,
  Copy,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog" // Import Dialog components
import { Separator } from "@/components/ui/separator" // Import Separator
import { useToast } from "@/hooks/use-toast" // Import useToast

interface Transaction {
  id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  description: string
  status: string
  created_at: string
  metadata?: {
    admin_notes?: string
    payment_info_snapshot?: {
      bank_name: string
      account_number: string
      account_name: string
      qr_code_url: string // Assuming this is stored in metadata
      transaction_id: string
      amount: number
      memo: string
    }
    [key: string]: any // Allow other properties
  }
  reference_id?: string
}

interface TransactionSummary {
  total_transactions: number
  total_deposits: number
  total_purchases: number
  total_adjustments: number
  total_refunds: number
  total_withdrawals: number
  current_balance: number
}

interface TransactionHistoryProps {
  token: string
}

export default function TransactionHistory({ token }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<TransactionSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all") // Lọc theo loại giao dịch
  const [statusFilter, setStatusFilter] = useState("all") // Lọc theo trạng thái
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit, setLimit] = useState(10) // Thêm state cho limit
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null) // State for modal

  const { toast } = useToast() // Initialize useToast

  const fetchTransactions = useCallback(
    async (type = "all", status = "all", page = 1, currentLimit = 10) => {
      if (!token) {
        setError("Token không hợp lệ. Vui lòng đăng nhập lại.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)
      console.log(`[TransactionHistory] Fetching: type=${type}, status=${status}, page=${page}, limit=${currentLimit}`)

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: currentLimit.toString(), // Sử dụng currentLimit
        })

        if (type !== "all") params.append("type", type)
        if (status !== "all") params.append("status", status)

        const response = await fetch(`/api/transactions/my?${params}`, {
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
        console.log("[TransactionHistory] Fetched data:", data)
        console.log("[TransactionHistory] Summary received:", data.summary)

        if (!data.success) {
          throw new Error(data.error || "Không thể tải lịch sử giao dịch")
        }

        setTransactions(data.data || []) // Sử dụng data.data
        setSummary(data.summary || null)
        setTotalPages(data.pagination?.totalPages || 1)
        setCurrentPage(data.pagination?.page || 1)
        setLimit(data.pagination?.limit || 10) // Cập nhật limit từ API
      } catch (err) {
        console.error("[TransactionHistory] Fetch error:", err)
        setError(err instanceof Error ? err.message : "Lỗi không xác định")
        setTransactions([]) // Xóa giao dịch cũ khi có lỗi
        setSummary(null)
      } finally {
        setLoading(false)
      }
    },
    [token],
  ) // Chỉ token là dependency chính

  useEffect(() => {
    fetchTransactions(activeTab, statusFilter, currentPage, limit)
  }, [activeTab, statusFilter, currentPage, limit, fetchTransactions]) // Thêm limit vào dependencies

  const handleRefresh = () => {
    fetchTransactions(activeTab, statusFilter, currentPage, limit)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage)
    }
  }

  const handleLimitChange = (newLimit: string) => {
    const parsedLimit = Number.parseInt(newLimit)
    setLimit(parsedLimit)
    setCurrentPage(1) // Reset về trang 1 khi đổi limit
  }

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <ArrowUpCircle className="w-5 h-5 text-green-600" />
    } else if (amount < 0) {
      return <ArrowDownCircle className="w-5 h-5 text-red-600" />
    }
    return <DollarSign className="w-5 h-5 text-gray-600" /> // Giao dịch 0 đồng (nếu có)
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

    // Logic mới cho các yêu cầu nạp tiền chưa hoàn thành
    if (transaction.type === "deposit" && transaction.status !== "completed") {
      sign = "" // Không có dấu
      colorClass = "text-gray-700" // Màu mặc định
    } else if (transaction.type === "withdrawal") {
      sign = "-" // Withdrawals are negative for the user
      colorClass = "text-red-600" // Red for withdrawals
    } else if (transaction.type === "refund") {
      sign = "+" // Hoàn tiền luôn là dương cho người dùng
      colorClass = "text-yellow-600" // Màu vàng cho hoàn tiền
    } else if (transaction.amount > 0) {
      sign = "+"
      colorClass = "text-green-600" // Màu xanh lá cây cho số tiền dương
    } else if (transaction.amount < 0) {
      sign = "-"
      colorClass = "text-red-600" // Màu đỏ cho số tiền âm
    } else {
      // Đối với các giao dịch không ảnh hưởng số dư (ví dụ: một số điều chỉnh của admin không thay đổi số dư)
      sign = ""
      colorClass = "text-gray-700" // Màu xám/đen cho không thay đổi
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
    // Không có viền cho các yêu cầu nạp tiền chưa hoàn thành
    if (transaction.type === "deposit" && transaction.status !== "completed") {
      return "" // Trả về chuỗi rỗng để không có viền
    }
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
    return "border-l-4 border-gray-400" // Mặc định cho các loại khác hoặc số tiền 0
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

  if (!token) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Vui lòng đăng nhập</p>
          <p className="text-gray-600">Bạn cần đăng nhập để xem lịch sử giao dịch.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Số dư hiện tại</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary.current_balance || 0).toLocaleString("vi-VN")} VNĐ</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng giao dịch</CardTitle>
              <History className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_transactions || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng nạp</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{(summary.total_deposits || 0).toLocaleString("vi-VN")} VNĐ
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng chi tiêu (Proxy)</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -{Number(summary.total_purchases || 0).toLocaleString("vi-VN")} VNĐ
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
                +{(summary.total_refunds || 0).toLocaleString("vi-VN")} VNĐ
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
                -{(summary.total_withdrawals || 0).toLocaleString("vi-VN")} VNĐ
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
              Lịch sử giao dịch
            </CardTitle>
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="type-filter" className="sr-only">
                Lọc theo loại
              </Label>
              <Select
                value={activeTab}
                onValueChange={(value) => {
                  setActiveTab(value)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger id="type-filter" className="w-full sm:w-[180px]">
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
            <div className="flex-1">
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
                <SelectTrigger id="status-filter" className="w-full sm:w-[180px]">
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
            <div className="flex-1">
              <Label htmlFor="limit-select" className="sr-only">
                Số mục mỗi trang
              </Label>
              <Select value={limit.toString()} onValueChange={handleLimitChange}>
                <SelectTrigger id="limit-select" className="w-full sm:w-[120px]">
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
              <p className="text-gray-500">
                {activeTab !== "all" || statusFilter !== "all"
                  ? "Không có giao dịch nào phù hợp với bộ lọc của bạn."
                  : "Bạn chưa có giao dịch nào được ghi lại."}
              </p>
              {(activeTab !== "all" || statusFilter !== "all") && (
                <Button
                  onClick={() => {
                    setActiveTab("all")
                    setStatusFilter("all")
                    setCurrentPage(1)
                  }}
                  variant="outline"
                  className="mt-4"
                >
                  Xóa bộ lọc và thử lại
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                {/* Sử dụng HTML table thay vì shadcn/ui Table components */}
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
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
                        <td className="p-4 align-middle text-sm text-gray-600">{formatDate(transaction.created_at)}</td>
                        <td className="p-4 align-middle">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedTransaction(transaction)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            {selectedTransaction && selectedTransaction.id === transaction.id && (
                              <DialogContent className="w-full max-w-md sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle>
                                    Chi tiết giao dịch: {getTransactionTypeLabel(selectedTransaction.type)}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4 text-sm">
                                  <p>
                                    <strong>Mã GD:</strong>{" "}
                                    {selectedTransaction.transaction_id || selectedTransaction.id}
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
                                              <strong>Mã GD:</strong>{" "}
                                              {selectedTransaction.metadata.payment_info_snapshot.transaction_id}
                                            </p>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                copyToClipboard(
                                                  selectedTransaction.metadata.payment_info_snapshot.transaction_id,
                                                  "Mã giao dịch",
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
                                          {selectedTransaction.metadata.payment_info_snapshot.qr_code_url && (
                                            <div className="text-center mt-4">
                                              <p className="font-semibold mb-2">Mã QR:</p>
                                              <img
                                                src={
                                                  selectedTransaction.metadata.payment_info_snapshot.qr_code_url ||
                                                  "/placeholder.svg" ||
                                                  "/placeholder.svg"
                                                }
                                                alt="Mã QR thanh toán"
                                                className="mx-auto w-48 h-48 object-contain border rounded-md"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </>
                                    )}
                                </div>
                              </DialogContent>
                            )}
                          </Dialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Trước
                  </Button>
                  <span className="text-sm text-gray-700">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Tiếp
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
