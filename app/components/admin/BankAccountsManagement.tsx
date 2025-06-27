"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { PlusCircle, Edit, Trash2, AlertTriangle, CheckCircle, Loader2, ChevronLeft, ChevronRight } from "lucide-react" // Import ChevronLeft, ChevronRight
import { useToast } from "@/components/ui/use-toast"

interface VietQRBank {
  id: number
  name: string
  code: string
  bin: string
  shortName: string
  logo: string
  transferSupported: number
  lookupSupported: number
  short_name: string // API sometimes returns short_name
  swift_code: string // API sometimes returns swift_code
}

interface BankAccount {
  id: string
  bank_id: string
  bank_name: string
  account_number: string
  account_name: string
  qr_template: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface BankAccountFormData {
  bank_id: string
  bank_name: string
  account_number: string
  account_name: string
  qr_template: string
  is_active: boolean
}

const initialFormData: BankAccountFormData = {
  bank_id: "",
  bank_name: "",
  account_number: "",
  account_name: "",
  qr_template: "compact2",
  is_active: false,
}

export default function BankAccountsManagement({ token }: { token: string }) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [vietQRBanks, setVietQRBanks] = useState<VietQRBank[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null)
  const [formData, setFormData] = useState<BankAccountFormData>(initialFormData)
  const { toast } = useToast()

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalAccounts, setTotalAccounts] = useState(0)

  const fetchBankAccounts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/bank-accounts?page=${page}&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Failed to fetch bank accounts")
      }
      const data = await response.json()
      setBankAccounts(data.data || []) // Sử dụng data.data
      setTotalAccounts(data.pagination?.total || 0) // Sử dụng data.pagination.total
      setPage(data.pagination?.page || 1)
      setLimit(data.pagination?.limit || 10)
    } catch (err: any) {
      setError(err.message)
      toast({ variant: "destructive", title: "Lỗi", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }, [token, page, limit, toast]) // Thêm page, limit vào dependencies

  const fetchVietQRBanks = useCallback(async () => {
    try {
      const response = await fetch("https://api.vietqr.io/v2/banks")
      if (!response.ok) throw new Error("Failed to fetch VietQR banks")
      const data = await response.json()
      if (data.data) {
        // Normalize name property
        const normalizedBanks = data.data.map((bank: VietQRBank) => ({
          ...bank,
          name: bank.name || bank.shortName || bank.short_name,
        }))
        setVietQRBanks(normalizedBanks)
      } else {
        setVietQRBanks([])
      }
    } catch (err: any) {
      console.error("Error fetching VietQR banks:", err)
      // Non-critical error, so don't show toast to user unless necessary
    }
  }, [])

  useEffect(() => {
    fetchBankAccounts()
    fetchVietQRBanks()
  }, [fetchBankAccounts, fetchVietQRBanks])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === "bank_id") {
      const selectedBank = vietQRBanks.find((b) => b.code === value)
      if (selectedBank) {
        setFormData((prev) => ({ ...prev, bank_name: selectedBank.name || selectedBank.shortName }))
      }
    }
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Client-side validation for bank_id and bank_name
    if (!formData.bank_id || !formData.bank_name) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: "Vui lòng chọn ngân hàng từ danh sách.",
      })
      setIsSubmitting(false)
      return
    }

    const url = editingAccount ? `/api/admin/bank-accounts/${editingAccount.id}` : "/api/admin/bank-accounts"
    const method = editingAccount ? "PUT" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })
      const responseData = await response.json()
      if (!response.ok) {
        throw new Error(responseData.error || `Failed to ${editingAccount ? "update" : "add"} bank account`)
      }
      toast({
        title: "Thành công!",
        description: `Tài khoản ngân hàng đã được ${editingAccount ? "cập nhật" : "thêm mới"}.`,
        className: "bg-green-500 text-white",
      })
      setShowFormDialog(false)
      fetchBankAccounts() // Refresh list
    } catch (err: any) {
      setError(err.message)
      toast({ variant: "destructive", title: "Lỗi", description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddNew = () => {
    setEditingAccount(null)
    setFormData(initialFormData)
    setShowFormDialog(true)
  }

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account)
    setFormData({
      bank_id: account.bank_id,
      bank_name: account.bank_name,
      account_number: account.account_number,
      account_name: account.account_name,
      qr_template: account.qr_template,
      is_active: account.is_active,
    })
    setShowFormDialog(true)
  }

  const handleDelete = async (accountId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài khoản ngân hàng này?")) return
    setIsSubmitting(true) // Use for delete operation as well
    try {
      const response = await fetch(`/api/admin/bank-accounts/${accountId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const responseData = await response.json()
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to delete bank account")
      }
      toast({
        title: "Đã xóa!",
        description: "Tài khoản ngân hàng đã được xóa.",
      })
      fetchBankAccounts() // Refresh list
    } catch (err: any) {
      toast({ variant: "destructive", title: "Lỗi", description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (account: BankAccount) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/admin/bank-accounts/${account.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !account.is_active }),
      })
      const responseData = await response.json()
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to update active status")
      }
      toast({
        title: "Thành công!",
        description: `Trạng thái hoạt động của tài khoản đã được cập nhật.`,
        className: "bg-green-500 text-white",
      })
      fetchBankAccounts() // Refresh list
    } catch (err: any) {
      toast({ variant: "destructive", title: "Lỗi", description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalPages = Math.ceil(totalAccounts / limit)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleLimitChange = (newLimit: string) => {
    const limit = Number.parseInt(newLimit)
    setLimit(limit)
    setPage(1) // Reset về trang 1 khi đổi limit
  }

  if (isLoading && bankAccounts.length === 0) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />{" "}
        <span className="ml-2">Đang tải danh sách ngân hàng...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Quản lý Tài khoản Ngân hàng</h2>
        <div className="flex gap-2 items-center">
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
          <Button onClick={handleAddNew} disabled={isSubmitting}>
            <PlusCircle className="mr-2 h-4 w-4" /> Thêm Tài khoản mới
          </Button>
        </div>
      </div>

      {error && !isLoading && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
          <p className="font-bold">Lỗi</p>
          <p>{error}</p>
        </div>
      )}

      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="w-full max-w-[525px] sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? "Chỉnh sửa Tài khoản Ngân hàng" : "Thêm Tài khoản Ngân hàng mới"}
            </DialogTitle>
            <DialogDescription>
              {editingAccount ? "Cập nhật thông tin chi tiết." : "Điền thông tin cho tài khoản ngân hàng mới."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div>
              <Label htmlFor="bank_id">Ngân hàng (VietQR)</Label>
              <Select
                name="bank_id"
                value={formData.bank_id}
                onValueChange={(value) => handleSelectChange("bank_id", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn ngân hàng" />
                </SelectTrigger>
                <SelectContent>
                  {vietQRBanks.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.shortName} ({bank.code}) - {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input type="hidden" name="bank_name" value={formData.bank_name} />

            <div>
              <Label htmlFor="account_number">Số tài khoản</Label>
              <Input
                id="account_number"
                name="account_number"
                value={formData.account_number}
                onChange={handleInputChange}
                placeholder="Nhập số tài khoản"
                required
              />
            </div>
            <div>
              <Label htmlFor="account_name">Tên chủ tài khoản</Label>
              <Input
                id="account_name"
                name="account_name"
                value={formData.account_name}
                onChange={handleInputChange}
                placeholder="NGUYEN VAN A"
                required
              />
            </div>
            <div>
              <Label htmlFor="qr_template">Mẫu QR</Label>
              <Select
                name="qr_template"
                value={formData.qr_template}
                onValueChange={(value) => handleSelectChange("qr_template", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn mẫu QR" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact2">Compact 2</SelectItem>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="qr_only">Chỉ QR</SelectItem>
                  <SelectItem value="print">Print</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleSwitchChange("is_active", checked)}
              />
              <Label htmlFor="is_active">Kích hoạt tài khoản này để nhận tiền?</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Hủy
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAccount ? "Lưu thay đổi" : "Thêm Tài khoản"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngân hàng</TableHead>
              <TableHead>Số tài khoản</TableHead>
              <TableHead>Chủ tài khoản</TableHead>
              <TableHead className="text-center">Hoạt động</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && bankAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : !isLoading && bankAccounts.length === 0 && !error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  Chưa có tài khoản ngân hàng nào được cấu hình.
                </TableCell>
              </TableRow>
            ) : (
              bankAccounts.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell>
                    <div className="font-medium">{acc.bank_name}</div>
                    <div className="text-xs text-gray-500">ID: {acc.bank_id}</div>
                  </TableCell>
                  <TableCell>{acc.account_number}</TableCell>
                  <TableCell>{acc.account_name}</TableCell>
                  <TableCell className="text-center">
                    {acc.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-500 inline" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 inline" />
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(acc)}
                      disabled={isSubmitting || acc.is_active}
                    >
                      {acc.is_active ? "Đang hoạt động" : "Kích hoạt"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(acc)} disabled={isSubmitting}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(acc.id)}
                      disabled={isSubmitting || acc.is_active}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {bankAccounts.length > 0 && (
        <p className="text-sm text-gray-600">
          <AlertTriangle className="inline h-4 w-4 mr-1 text-orange-500" />
          Lưu ý: Chỉ một tài khoản ngân hàng có thể được đặt là "Hoạt động" tại một thời điểm để nhận tiền nạp. Không
          thể xóa tài khoản đang hoạt động.
        </p>
      )}
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(page - 1)} disabled={page <= 1}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Trước
          </Button>
          <span className="text-sm">
            Trang {page} / {totalPages} (Tổng: {totalAccounts})
          </span>
          <Button variant="outline" size="sm" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
            Sau <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
