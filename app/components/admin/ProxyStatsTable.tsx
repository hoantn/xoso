"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Users, Settings } from "lucide-react"

interface ProxyStats {
  id: string
  server: string
  port: number
  type: string
  description: string
  max_users: number
  current_users: number
  is_active: boolean
  created_at: string
}

interface ProxyStatsTableProps {
  token: string
}

export default function ProxyStatsTable({ token }: ProxyStatsTableProps) {
  const [proxies, setProxies] = useState<ProxyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProxy, setEditingProxy] = useState<string | null>(null)
  const [maxUsers, setMaxUsers] = useState<number>(1)

  const fetchProxyStats = async () => {
    try {
      const response = await fetch("/api/admin/proxy-stats", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      setProxies(data)
    } catch (error) {
      console.error("Error fetching proxy stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateMaxUsers = async (proxyId: string, newMaxUsers: number) => {
    try {
      const response = await fetch(`/api/admin/proxies/${proxyId}/max-users`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ max_users: newMaxUsers }),
      })

      if (response.ok) {
        setEditingProxy(null)
        fetchProxyStats()
        alert("Cập nhật thành công!")
      }
    } catch (error) {
      console.error("Error updating max users:", error)
      alert("Lỗi khi cập nhật")
    }
  }

  const cleanupExpiredProxies = async () => {
    try {
      const response = await fetch("/api/admin/cleanup-expired", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Đã cleanup ${result.updated_count} proxy hết hạn`)
        fetchProxyStats()
      }
    } catch (error) {
      console.error("Error cleaning up:", error)
    }
  }

  const getTypeColor = (type: string) => {
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

  const getUsageColor = (current: number, max: number) => {
    const percentage = (current / max) * 100
    if (percentage >= 100) return "bg-red-100 text-red-800"
    if (percentage >= 80) return "bg-yellow-100 text-yellow-800"
    return "bg-green-100 text-green-800"
  }

  useEffect(() => {
    fetchProxyStats()
    // Auto refresh mỗi 30 giây
    const interval = setInterval(fetchProxyStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div>Đang tải...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Thống kê Proxy Real-time</h2>
        <div className="flex gap-2">
          <Button onClick={cleanupExpiredProxies} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Cleanup Hết hạn
          </Button>
          <Button onClick={fetchProxyStats} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {proxies.map((proxy) => (
          <Card key={proxy.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span>
                    {proxy.server}:{proxy.port}
                  </span>
                  <Badge className={getTypeColor(proxy.type)}>{proxy.type.toUpperCase()}</Badge>
                </div>
                <Badge className={getUsageColor(proxy.current_users, proxy.max_users)}>
                  {proxy.current_users}/{proxy.max_users}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">{proxy.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Người dùng hiện tại:</span>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="font-bold">{proxy.current_users}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Giới hạn tối đa:</span>
                  {editingProxy === proxy.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={maxUsers}
                        onChange={(e) => setMaxUsers(Number.parseInt(e.target.value))}
                        className="w-16 h-8"
                        min="1"
                      />
                      <Button size="sm" onClick={() => updateMaxUsers(proxy.id, maxUsers)}>
                        ✓
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingProxy(null)}>
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{proxy.max_users}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingProxy(proxy.id)
                          setMaxUsers(proxy.max_users)
                        }}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      proxy.current_users >= proxy.max_users
                        ? "bg-red-500"
                        : proxy.current_users >= proxy.max_users * 0.8
                          ? "bg-yellow-500"
                          : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min((proxy.current_users / proxy.max_users) * 100, 100)}%`,
                    }}
                  />
                </div>

                <div className="text-xs text-gray-500">
                  Tạo: {new Date(proxy.created_at).toLocaleDateString("vi-VN")}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
