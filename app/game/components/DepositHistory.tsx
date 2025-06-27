"use client"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowDownCircle,
  RefreshCw,
  AlertTriangle,
  Eye,
  Copy,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"

interface DepositRequest {
  id: string
  uuid: string
  user_id: string
  amount: number
  transaction_id: string
  status: string
  payment_info_snapshot: {
    bank_name: string
    account_number: string
    account_name: string
    qr_code_url?: string
    memo: string
  } | null
  admin_notes: string | null
  created_at: string
  updated_at: string
}

interface DepositSummary {
  total_requests: number
  total_completed: number
  total_pending: number
  total_amount: number
}

interface DepositHistoryProps {
  token: string
}

export default function DepositHistory({ token }: DepositHistoryProps) {
  const [deposits, setDeposits] = useState<DepositRequest[]>([])
  const [summary, setSummary] = useState<DepositSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [limit, setLimit] = useState(10)
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null)

  const { toast } = useToast()

  const fetchDeposits = useCallback(
    async (status = "all", page = 1, currentLimit = 10) => {
      if (!token) {
        setError("Token không hợp lệ. Vui lòng đăng nhập lại.")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: currentLimit.toString(),
        })

        if (status !== "all") params.append("status", status)

        const response = await fetch(`/api/game/deposit-history?${params}`, {
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

        if (!data.success) {
          throw new Error(data.error || "Không thể tải lịch sử nạp tiền")
        }

        setDeposits(data.data || [])
        setSummary(data.summary || null)
        setTotalPages(data.pagination?.totalPages || 1)
        setCurrentPage(data.pagination?.page || 1)
        setLimit(data.pagination?.limit || 10)
      } catch (err) {
        console.error("[DepositHistory] Fetch error:", err)
        setError(err instanceof Error ? err.message : "Lỗi không xác định")
        setDeposits([])
        setSummary(null)
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    fetchDeposits(statusFilter, currentPage, limit)
  }, [statusFilter, currentPage, limit, fetchDeposits])

  const handleRefresh = () => {
    fetchDeposits(statusFilter, currentPage, limit)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: "Hoàn thành", class: "bg-green-100 text-green-800", icon: CheckCircle },
      pending: { label: "Đang xử lý", class: "bg-yellow-100 text-yellow-800", icon: Clock },
      failed: { label: "Thất bại", class: "bg-red-100 text-red-800", icon: XCircle },
      cancelled: { label: "Đã hủy", class: "bg-gray-100 text-gray-800", icon: XCircle },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const IconComponent = config.icon

    return (
      <Badge className={config.class}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
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
          <p className="text-gray-600">Bạn cần đăng nhập để xem lịch sử nạp tiền.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white">
            <CardContent className="p-4 text-center">
              <CreditCard className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{summary.total_requests}</div>
              <div className="text-sm opacity-90">Tổng yêu cầu</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{summary.total_completed}</div>
              <div className="text-sm opacity-90">Đã hoàn thành</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{summary.total_pending}</div>
              <div className="text-sm opacity-90">Đang xử lý</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-violet-500 text-white">
            <CardContent className="p-4 text-center">
              <ArrowDownCircle className="w-8 h-8 mx-auto mb-2" />
              <div className="text-2xl font-bold">{summary.total_amount.toLocaleString()}</div>
              <div className="text-sm opacity-90">Tổng nạp (VNĐ)</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <ArrowDownCircle className="w-6 h-6 text-green-600" />
              Lịch sử nạp tiền
            </CardTitle>
            <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
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
          ) : deposits.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có yêu cầu nạp tiền</h3>
              <p className="text-gray-500">Bạn chưa có yêu cầu nạp tiền nào được ghi lại.</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {deposits.map((deposit) => (
                  <Card key={deposit.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ArrowDownCircle className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">Nạp tiền</span>
                          {getStatusBadge(deposit.status)}
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedDeposit(deposit)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          {selectedDeposit && selectedDeposit.id === deposit.id && (
                            <DialogContent className="w-full max-w-md">
                              <DialogHeader>
                                <DialogTitle>Chi tiết yêu cầu nạp tiền</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4 text-sm">
                                <p>
                                  <strong>Mã yêu cầu:</strong> {selectedDeposit.transaction_id}
                                </p>
                                <p>
                                  <strong>Số tiền:</strong> {selectedDeposit.amount.toLocaleString()} VNĐ
                                </p>
                                <p>
                                  <strong>Trạng thái:</strong> {getStatusBadge(selectedDeposit.status)}
                                </p>
                                <p>
                                  <strong>Thời gian tạo:</strong> {formatDate(selectedDeposit.created_at)}
                                </p>

                                {selectedDeposit.payment_info_snapshot && (
                                  <>
                                    <Separator />
                                    <h4 className="font-semibold mb-2">Thông tin chuyển khoản</h4>
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <p>
                                          <strong>Ngân hàng:</strong> {selectedDeposit.payment_info_snapshot.bank_name}
                                        </p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            copyToClipboard(
                                              selectedDeposit.payment_info_snapshot!.bank_name,
                                              "Tên ngân hàng",
                                            )
                                          }
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <p>
                                          <strong>Số tài khoản:</strong>{" "}
                                          {selectedDeposit.payment_info_snapshot.account_number}
                                        </p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            copyToClipboard(
                                              selectedDeposit.payment_info_snapshot!.account_number,
                                              "Số tài khoản",
                                            )
                                          }
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <p>
                                          <strong>Chủ tài khoản:</strong>{" "}
                                          {selectedDeposit.payment_info_snapshot.account_name}
                                        </p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            copyToClipboard(
                                              selectedDeposit.payment_info_snapshot!.account_name,
                                              "Tên chủ tài khoản",
                                            )
                                          }
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <p>
                                          <strong>Nội dung:</strong> {selectedDeposit.payment_info_snapshot.memo}
                                        </p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            copyToClipboard(
                                              selectedDeposit.payment_info_snapshot!.memo,
                                              "Nội dung chuyển khoản",
                                            )
                                          }
                                        >
                                          <Copy className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </>
                                )}

                                {selectedDeposit.admin_notes && (
                                  <>
                                    <Separator />
                                    <p>
                                      <strong>Ghi chú:</strong> {selectedDeposit.admin_notes}
                                    </p>
                                  </>
                                )}
                              </div>
                            </DialogContent>
                          )}
                        </Dialog>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <p>
                          <strong>Số tiền:</strong> {deposit.amount.toLocaleString()} VNĐ
                        </p>
                        <p>
                          <strong>Thời gian:</strong> {formatDate(deposit.created_at)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

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
