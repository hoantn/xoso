"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, Server, User, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface SystemStats {
  proxies: number
  activeProxies: number
  users: number
  adminUsers: number
  usageStats: number
  successfulUsage: number
}

export default function SystemInfo() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)

        // Fetch proxies stats
        const { data: proxiesData, error: proxiesError } = await supabase.from("proxies").select("id, is_active")

        if (proxiesError) throw proxiesError

        // Fetch users stats
        const { data: usersData, error: usersError } = await supabase.from("user_profiles").select("id, role")

        if (usersError) throw usersError

        // Fetch usage stats
        const { data: usageData, error: usageError } = await supabase.from("proxy_usage_stats").select("id, success")

        if (usageError) throw usageError

        setStats({
          proxies: proxiesData?.length || 0,
          activeProxies: proxiesData?.filter((p) => p.is_active).length || 0,
          users: usersData?.length || 0,
          adminUsers: usersData?.filter((u) => u.role === "admin" || u.role === "super_admin").length || 0,
          usageStats: usageData?.length || 0,
          successfulUsage: usageData?.filter((u) => u.success).length || 0,
        })
      } catch (err) {
        console.error("Error fetching system stats:", err)
        setError("Không thể tải thông tin hệ thống")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-red-500">{error}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-5 h-5" />
          Thông tin hệ thống
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-600">Tổng số proxy:</span>
            <Badge variant="outline">{stats?.proxies}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">Proxy hoạt động:</span>
            <Badge className="bg-green-100 text-green-800">{stats?.activeProxies}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-gray-600">Tổng số user:</span>
            <Badge variant="outline">{stats?.users}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-gray-600">Admin users:</span>
            <Badge className="bg-orange-100 text-orange-800">{stats?.adminUsers}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
