"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { Eye, CheckCircle, XCircle, Clock, Edit3, Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils" // Đảm bảo import đúng
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"

interface DepositRequest {
  id: string
  user_id: string
  users: {
    username: string
    full_name: string | null
  }
  amount: number
  transaction_id: string
  status: "pending" | "completed" | "cancelled" | "failed"
  payment_info_snapshot: {
    bank_id: string
    bank_name: string
    account_number: string
    account_name: string
    transfer_memo: string
    qr_code_url: string
    amount_deposited: number
    used_bank_account_details: any
  }
  admin_notes: string | null
  created_at: string
  updated_at: string
}

interface DepositsTableProps {
  token: string
}

export default function DepositsTable({ token }: DepositsTableProps) {
  // Đổi tên component
  const [requests, setRequests] = useState<DepositRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalRequests, setTotalRequests] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState<string>("")

  const [editingRequest, setEditingRequest] = useState<DepositRequest | null>(null)
  const [newStatus, setNewStatus] = useState<"completed" | "cancelled" | "failed" | "">("")
  const [adminNotes, setAdminNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (statusFilter) params.append("status", statusFilter)
      if (searchTerm) params.append("searchTerm", searchTerm)

      const response = await fetch(`/api/admin/deposits?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Không thể tải danh sách yêu cầu.")
      }
      const data = await response.json()
      setRequests(data.data || [])
      setTotalRequests(data.pagination?.total || 0)
      setPage(data.pagination?.page || 1)
      setLimit(data.pagination?.limit || 10)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.")
    } finally {
      setLoading(false)
    }
  }, [token, page, limit, statusFilter, searchTerm])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchRequests()
    }, 300)
    return () => clearTimeout(debounce)
  }, [fetchRequests, searchTerm])

  const handleUpdateStatus = async () => {
    if (!editingRequest || !newStatus) return
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/admin/deposits/${editingRequest.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, admin_notes: adminNotes }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Cập nhật thất bại.")
      }
      setSuccess(data.message || "Cập nhật thành công!")
      setEditingRequest(null)
      setNewStatus("")
      setAdminNotes("")
      fetchRequests()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định khi cập nhật.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (request: DepositRequest) => {
    setEditingRequest(request)
    setNewStatus(request.status === "pending" ? "" : request.status)
    setAdminNotes(request.admin_notes || "")
    setError(null)
    setSuccess(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            Chờ xử lý
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Hoàn thành
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
            <XCircle className="w-3 h-3 mr-1" />
            Đã hủy
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Thất bại
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const totalPages = Math.ceil(totalRequests / limit)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleLimitChange = (newLimit: string) => {
    const limit = Number.parseInt(newLimit)
    setLimit(limit)
    setPage(1)
  }

  const getBorderClassForRequest = (status: string) => {
    switch (status) {
      case "pending":
        return "border-l-4 border-yellow-500"
      case "completed":
        return "border-l-4 border-green-500"
      case "cancelled":
        return "border-l-4 border-gray-400"
      case "failed":
        return "border-l-4 border-red-500"
      default:
        return "border-l-4 border-gray-400"
    }
  }

  const formatAmount = (amount: number) => {
    return <span className="font-semibold text-green-600">+{formatCurrency(amount)} VNĐ</span>
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "HH:mm:ss dd/MM/yyyy")
    } catch (e) {
      return dateString
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-700">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Tìm theo Mã GD hoặc Username..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value === "all" ? "" : value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ xử lý</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
            <SelectItem value="failed">Thất bại</SelectItem>
          </SelectContent>
        </Select>
        <Select value={limit.toString()} onValueChange={handleLimitChange}>
          <SelectTrigger className="w-full md:w-[120px]">
            <SelectValue placeholder="Số mục/trang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / trang</SelectItem>
            <SelectItem value="20">20 / trang</SelectItem>
            <SelectItem value="50">50 / trang</SelectItem>
            <SelectItem value="100">100 / trang</SelectItem>
            <SelectItem value="500">500 / trang</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setPage(1)} variant="outline" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Làm mới / Tìm
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-2">Đang tải dữ liệu...</p>
        </div>
      )}

      {!loading && requests.length === 0 && (
        <p className="text-center text-gray-500 py-8">Không có yêu cầu nạp tiền nào.</p>
      )}

      {!loading && requests.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Mã GD</TableHead>
                  <TableHead className="text-right">Số tiền (VNĐ)</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thông tin CK</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className={getBorderClassForRequest(req.status)}>
                    <TableCell>
                      <div>{req.users?.full_name || req.users?.username}</div>
                      <div className="text-xs text-gray-500">@{req.users?.username}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{req.transaction_id}</TableCell>
                    <TableCell className="text-right font-semibold">{formatAmount(req.amount)}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell>{formatDate(req.created_at)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Chi tiết chuyển khoản (Mã GD: {req.transaction_id})</DialogTitle>
                          </DialogHeader>
                          {req.payment_info_snapshot && (
                            <div className="space-y-2 mt-2 text-sm">
                              <p>
                                <strong>Ngân hàng:</strong> {req.payment_info_snapshot.bank_name}
                              </p>
                              <p>
                                <strong>Chủ TK:</strong> {req.payment_info_snapshot.account_name}
                              </p>
                              <p>
                                <strong>Số TK:</strong> {req.payment_info_snapshot.account_number}
                              </p>
                              <p>
                                <strong>Số tiền:</strong> {formatCurrency(req.payment_info_snapshot.amount_deposited)}{" "}
                                VNĐ
                              </p>
                              <p>
                                <strong>Nội dung:</strong>{" "}
                                <span className="font-bold text-blue-600">
                                  {req.payment_info_snapshot.transfer_memo}
                                </span>
                              </p>
                              {req.payment_info_snapshot.qr_code_url && (
                                <div className="mt-2">
                                  <img
                                    src={req.payment_info_snapshot.qr_code_url || "/placeholder.svg"}
                                    alt="QR Code"
                                    className="mx-auto border rounded-md max-w-[200px]"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(req)}
                        disabled={req.status === "completed" || req.status === "cancelled"}
                      >
                        <Edit3 className="w-4 h-4 mr-1" /> Cập nhật
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Hiển thị {requests.length} trên tổng số {totalRequests} yêu cầu.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Trước
              </Button>
              <span className="text-sm">
                Trang {page} / {totalPages > 0 ? totalPages : 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || loading}
              >
                Sau <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingRequest && (
        <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cập nhật yêu cầu nạp tiền: {editingRequest.transaction_id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p>
                <strong>Người dùng:</strong> {editingRequest.users.full_name || editingRequest.users.username} (@
                {editingRequest.users.username})
              </p>
              <p>
                <strong>Số tiền:</strong> {formatCurrency(editingRequest.amount)} VNĐ
              </p>
              <p>
                <strong>Trạng thái hiện tại:</strong> {getStatusBadge(editingRequest.status)}
              </p>
              <Separator />
              <div>
                <Label htmlFor="newStatus">Trạng thái mới</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as any)}>
                  <SelectTrigger id="newStatus">
                    <SelectValue placeholder="Chọn trạng thái mới" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Hoàn thành (Sẽ cộng tiền vào tài khoản)</SelectItem>
                    <SelectItem value="cancelled">Đã hủy</SelectItem>
                    <SelectItem value="failed">Thất bại</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="adminNotes">Ghi chú của Admin</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Nhập ghi chú (nếu có)"
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setEditingRequest(null)}>
                  Hủy
                </Button>
              </DialogClose>
              <Button onClick={handleUpdateStatus} disabled={isSubmitting || !newStatus}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Xác nhận
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
