"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ProxyFormProps {
  initialData?: any
  onSubmit: (data: any) => void
  onCancel: () => void
}

export default function ProxyForm({ initialData, onSubmit, onCancel }: ProxyFormProps) {
  const [formData, setFormData] = useState({
    url: "",
    server: "",
    port: "",
    username: "",
    password: "",
    name: "",
    country: "",
    city: "",
    speed: 5,
    reliability: 5,
    anonymity: "medium",
    notes: "",
    type: "mtproto",
    visibility: "public",
    max_users: 1,
    description: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setFormData({
        url: initialData.url || "",
        server: initialData.server || "",
        port: initialData.port?.toString() || "",
        username: initialData.username || "",
        password: initialData.password || "",
        name: initialData.name || "",
        country: initialData.country || "",
        city: initialData.city || "",
        speed: initialData.speed || 5,
        reliability: initialData.reliability || 5,
        anonymity: initialData.anonymity || "medium",
        notes: initialData.notes || initialData.description || "",
        type: initialData.type || "mtproto",
        visibility: initialData.visibility || "public",
        max_users: initialData.max_users || 1,
        description: initialData.description || initialData.notes || "",
      })
    }
  }, [initialData])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Kiểm tra nếu không có URL thì phải có server
    if (!formData.url.trim() && !formData.server.trim()) {
      newErrors.server = "Server là bắt buộc nếu không có URL"
    }

    // Kiểm tra port nếu có server
    if (formData.server.trim() && formData.port.trim()) {
      const port = Number.parseInt(formData.port)
      if (isNaN(port) || port < 1 || port > 65535) {
        newErrors.port = "Port phải từ 1 đến 65535"
      }
    }

    // Kiểm tra server format
    if (formData.server.trim()) {
      const server = formData.server.trim()
      const isValidIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(server)
      const isValidDomain =
        /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(server)

      if (!isValidIP && !isValidDomain) {
        newErrors.server = "Server phải là IP hoặc domain hợp lệ"
      }
    }

    // Kiểm tra max_users
    if (formData.max_users < 1) {
      newErrors.max_users = "Số người dùng tối đa phải lớn hơn 0"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "max_users" ? Number.parseInt(value) || 1 : value,
    }))

    // Xóa lỗi khi user bắt đầu sửa
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    // Chuẩn bị dữ liệu để gửi
    const submitData = {
      ...formData,
      port: formData.port ? Number.parseInt(formData.port) : null,
      max_users: Number(formData.max_users),
      is_active: true,
    }

    onSubmit(submitData)

    // Reset form nếu không phải edit mode
    if (!initialData) {
      setFormData({
        url: "",
        server: "",
        port: "",
        username: "",
        password: "",
        name: "",
        country: "",
        city: "",
        speed: 5,
        reliability: 5,
        anonymity: "medium",
        notes: "",
        type: "mtproto",
        visibility: "public",
        max_users: 1,
        description: "",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="type">Loại Proxy</Label>
            <Select value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại proxy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mtproto">MTProto (Telegram)</SelectItem>
                <SelectItem value="socks5">SOCKS5</SelectItem>
                <SelectItem value="http">HTTP</SelectItem>
                <SelectItem value="other">Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="server">Server/IP *</Label>
            <Input
              id="server"
              name="server"
              value={formData.server}
              onChange={handleChange}
              placeholder="Ví dụ: 1.2.3.4 hoặc proxy.example.com"
              className={errors.server ? "border-red-500" : ""}
            />
            {errors.server && <p className="text-sm text-red-500 mt-1">{errors.server}</p>}
          </div>

          <div>
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              name="port"
              type="number"
              value={formData.port}
              onChange={handleChange}
              placeholder="Ví dụ: 443"
              className={errors.port ? "border-red-500" : ""}
            />
            {errors.port && <p className="text-sm text-red-500 mt-1">{errors.port}</p>}
          </div>

          <div>
            <Label htmlFor="username">Username/Secret</Label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder={formData.type === "mtproto" ? "Secret key" : "Username (tùy chọn)"}
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password (tùy chọn)"
            />
          </div>

          <div>
            <Label htmlFor="url">URL Đầy đủ (tùy chọn)</Label>
            <Input
              id="url"
              name="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="URL đầy đủ của proxy"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL sẽ được tạo tự động từ thông tin server, port, username, password nếu để trống
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Tên Proxy</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Tên để nhận biết proxy này"
            />
          </div>

          <div>
            <Label htmlFor="country">Quốc gia</Label>
            <Input
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Ví dụ: Việt Nam"
            />
          </div>

          <div>
            <Label htmlFor="city">Thành phố</Label>
            <Input id="city" name="city" value={formData.city} onChange={handleChange} placeholder="Ví dụ: Hà Nội" />
          </div>

          <div>
            <Label htmlFor="description">Mô tả</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Mô tả về proxy này"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="visibility">Hiển thị</Label>
            <Select value={formData.visibility} onValueChange={(value) => handleSelectChange("visibility", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn chế độ hiển thị" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Công khai</SelectItem>
                <SelectItem value="private">Riêng tư</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="max_users">Số người dùng tối đa</Label>
            <Input
              id="max_users"
              name="max_users"
              type="number"
              min="1"
              value={formData.max_users}
              onChange={handleChange}
              placeholder="Số người dùng tối đa"
              className={errors.max_users ? "border-red-500" : ""}
            />
            {errors.max_users && <p className="text-sm text-red-500 mt-1">{errors.max_users}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" className="bg-[#229ED9] hover:bg-[#1a7db8] text-white">
          {initialData ? "Cập nhật" : "Thêm Proxy"}
        </Button>
      </div>
    </form>
  )
}
