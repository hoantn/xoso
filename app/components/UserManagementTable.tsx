"use client"

import { Card } from "@/components/ui/card"

import { useState, useEffect, useCallback } from "react" // Import useCallback
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Edit, Save, XCircle, Search, ChevronLeft, ChevronRight } from "lucide-react"
import type { AuthUser } from "./AuthProvider" // Giả sử AuthUser có id, username, role, fullName, is_active

interface UserForAdmin extends AuthUser {
  is_active: boolean
  created_at: string
  updated_at: string
}

interface UserManagementTableProps {
  token: string | null
}

export default function UserManagementTable({ token }: UserManagementTableProps) {
  const [users, setUsers] = useState<UserForAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<UserForAdmin | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 })

  const fetchUsers = useCallback(
    async (page = pagination.page, limit = pagination.limit, search = searchTerm) => {
      if (!token) {
        setError("Token không hợp lệ")
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/admin/users?page=${page}&limit=${limit}&search=${search}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          const errData = await response.json()
          throw new Error(errData.error || "Không thể tải danh sách người dùng")
        }
        const data = await response.json()
        setUsers(data.data || []) // Sử dụng data.data
        setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi không xác định")
      } finally {
        setLoading(false)
      }
    },
    [token, pagination.page, pagination.limit, searchTerm],
  ) // Thêm dependencies

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers]) // Chỉ gọi khi fetchUsers thay đổi

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchUsers(1, pagination.limit, searchTerm) // Reset về trang 1 khi tìm kiếm
    }, 500)
    return () => clearTimeout(debounce)
  }, [searchTerm, pagination.limit, fetchUsers]) // Thêm fetchUsers vào dependencies

  const handleEdit = (user: UserForAdmin) => {
    setEditingUser({ ...user })
  }

  const handleCancelEdit = () => {
    setEditingUser(null)
  }

  const handleSaveEdit = async () => {
    if (!editingUser || !token) return
    setLoading(true)
    try {
      const { id, role, is_active, full_name } = editingUser // Đổi fullName thành full_name
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, is_active, full_name }), // Đổi fullName thành full_name
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Cập nhật thất bại")
      }
      // Cập nhật lại danh sách sau khi lưu thành công
      fetchUsers(pagination.page, pagination.limit, searchTerm)
      setEditingUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof UserForAdmin, value: any) => {
    if (editingUser) {
      setEditingUser({ ...editingUser, [field]: value })
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage })) // Cập nhật state page
      fetchUsers(newPage, pagination.limit, searchTerm)
    }
  }

  const handleLimitChange = (newLimit: string) => {
    const limit = Number.parseInt(newLimit)
    setPagination((prev) => ({ ...prev, limit: limit, page: 1 })) // Reset về trang 1 khi đổi limit
    fetchUsers(1, limit, searchTerm)
  }

  if (loading && users.length === 0)
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" /> Đang tải...
      </div>
    )
  if (error) return <div className="text-red-500 p-4">Lỗi: {error}</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Tìm username hoặc họ tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={pagination.limit.toString()} onValueChange={handleLimitChange}>
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
      </div>
      <Card>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) =>
                editingUser && editingUser.id === user.id ? (
                  <TableRow key={user.id} className="bg-blue-50">
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <Input
                        value={editingUser.full_name || ""}
                        onChange={(e) => handleInputChange("full_name", e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={editingUser.role} onValueChange={(value) => handleInputChange("role", value)}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={editingUser.is_active ? "true" : "false"}
                        onValueChange={(value) => handleInputChange("is_active", value === "true")}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Kích hoạt</SelectItem>
                          <SelectItem value="false">Vô hiệu</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={loading}
                        className="bg-green-500 hover:bg-green-600 h-8"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8">
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.full_name || "N/A"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === "admin" || user.role === "super_admin" ? "destructive" : "secondary"}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge className="bg-green-100 text-green-700">Kích hoạt</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-700">
                          Vô hiệu
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(user)} className="h-8">
                        <Edit className="w-4 h-4 mr-1" /> Sửa
                      </Button>
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Trước
          </Button>
          <span className="text-sm">
            Trang {pagination.page} / {pagination.totalPages} (Tổng: {pagination.total})
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            Sau <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
