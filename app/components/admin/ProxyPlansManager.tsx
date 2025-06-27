"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2 } from "lucide-react"

interface ProxyPlan {
  id: string
  name: string
  description: string
  price: number
  duration_days: number
  max_connections: number
  proxy_type: string
  is_active: boolean
}

interface ProxyPlansManagerProps {
  token: string
}

export default function ProxyPlansManager({ token }: ProxyPlansManagerProps) {
  const [plans, setPlans] = useState<ProxyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ProxyPlan | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    duration_days: "30",
    max_connections: "1",
    proxy_type: "mtproto",
  })

  const proxyTypes = [
    { value: "mtproto", label: "MTProto" },
    { value: "socks5", label: "SOCKS5" },
    { value: "http", label: "HTTP" },
  ]

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/proxy-plans", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setPlans(data)
    } catch (error) {
      console.error("Error fetching plans:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingPlan ? `/api/admin/proxy-plans/${editingPlan.id}` : "/api/admin/proxy-plans"
      const method = editingPlan ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setShowForm(false)
        setEditingPlan(null)
        setFormData({
          name: "",
          description: "",
          price: "",
          duration_days: "30",
          max_connections: "1",
          proxy_type: "mtproto",
        })
        fetchPlans()
        alert(editingPlan ? "Cập nhật gói proxy thành công!" : "Tạo gói proxy thành công!")
      }
    } catch (error) {
      console.error("Error saving plan:", error)
      alert("Lỗi khi lưu gói proxy")
    }
  }

  const handleEdit = (plan: ProxyPlan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      max_connections: plan.max_connections.toString(),
      proxy_type: plan.proxy_type,
    })
    setShowForm(true)
  }

  const handleDelete = async (planId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa gói proxy này?")) return

    try {
      const response = await fetch(`/api/admin/proxy-plans/${planId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        fetchPlans()
        alert("Xóa gói proxy thành công!")
      }
    } catch (error) {
      console.error("Error deleting plan:", error)
      alert("Lỗi khi xóa gói proxy")
    }
  }

  const getProxyTypeColor = (type: string) => {
    switch (type) {
      case "mtproto":
        return "bg-blue-100 text-blue-800"
      case "socks5":
        return "bg-purple-100 text-purple-800"
      case "http":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  if (loading) return <div>Đang tải...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Quản lý Gói Proxy</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm Gói
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingPlan ? "Chỉnh sửa Gói Proxy" : "Tạo Gói Proxy Mới"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Tên gói</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="proxy_type">Loại Proxy</Label>
                <Select
                  value={formData.proxy_type}
                  onValueChange={(value) => setFormData({ ...formData, proxy_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại proxy" />
                  </SelectTrigger>
                  <SelectContent>
                    {proxyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Giá (VNĐ)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Thời hạn (ngày)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_days}
                    onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="connections">Số người dùng tối đa</Label>
                  <Input
                    id="connections"
                    type="number"
                    value={formData.max_connections}
                    onChange={(e) => setFormData({ ...formData, max_connections: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">{editingPlan ? "Cập nhật" : "Tạo Gói"}</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingPlan(null)
                    setFormData({
                      name: "",
                      description: "",
                      price: "",
                      duration_days: "30",
                      max_connections: "1",
                      proxy_type: "mtproto",
                    })
                  }}
                >
                  Hủy
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {plan.name}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getProxyTypeColor(plan.proxy_type)}`}>
                    {plan.proxy_type.toUpperCase()}
                  </span>
                </div>
                <span className="text-lg font-bold text-green-600">{plan.price.toLocaleString("vi-VN")} VNĐ</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{plan.description}</p>
              <div className="space-y-2 text-sm">
                <div>⏰ Thời hạn: {plan.duration_days} ngày</div>
                <div>👥 Số người dùng tối đa: {plan.max_connections}</div>
                <div>📊 Trạng thái: {plan.is_active ? "Hoạt động" : "Tạm dừng"}</div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" onClick={() => handleEdit(plan)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Sửa
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleDelete(plan.id)} className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Xóa
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
