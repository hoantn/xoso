"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  BarChart3,
  RefreshCw,
  Zap,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface EventStats {
  total: number
  pending: number
  processing: number
  completed: number
  failed: number
  byEventType: Record<string, any>
  byGameType: Record<string, any>
}

interface LotteryEvent {
  id: string
  event_type: string
  session_id: string
  game_type: string
  status: string
  scheduled_at: string
  processed_at?: string
  error_message?: string
  retry_count: number
  created_at: string
}

export default function EventDrivenMonitor() {
  const { toast } = useToast()
  const [stats, setStats] = useState<EventStats | null>(null)
  const [recentEvents, setRecentEvents] = useState<LotteryEvent[]>([])
  const [pendingEvents, setPendingEvents] = useState<LotteryEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchEventStatus = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/events/status", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch event status")
      }

      const data = await response.json()
      setStats(data.statistics)
      setRecentEvents(data.recentEvents)
      setPendingEvents(data.pendingEvents)
    } catch (error) {
      toast({
        title: "Lỗi tải dữ liệu",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const triggerEventProcessor = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch("/api/admin/events/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        throw new Error("Failed to trigger event processor")
      }

      const result = await response.json()
      toast({
        title: "Xử lý sự kiện thành công",
        description: `Đã xử lý ${result.processed} sự kiện`,
      })

      // Refresh data after processing
      fetchEventStatus()
    } catch (error) {
      toast({
        title: "Lỗi xử lý sự kiện",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const manualTrigger = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/events/trigger", {
        method: "POST",
        headers: {
          // Admin token can be attached automatically by middleware or fetcher
          // If you store it in a cookie, you DON'T send it manually here.
        },
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Trigger failed")

      toast({ title: "Success", description: "Event processor triggered" })
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEventStatus()
    const interval = setInterval(fetchEventStatus, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500"
      case "processing":
        return "bg-blue-500"
      case "completed":
        return "bg-green-500"
      case "failed":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin" />
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "failed":
        return <XCircle className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const getEventTypeDisplay = (eventType: string) => {
    switch (eventType) {
      case "session_expired":
        return "Phiên hết hạn"
      case "draw_completed":
        return "Quay số hoàn thành"
      case "payout_completed":
        return "Trả thưởng hoàn thành"
      default:
        return eventType
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-orange-500" />
            Event-Driven Monitor
          </h2>
          <p className="text-gray-600">Theo dõi hệ thống xử lý sự kiện tự động</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchEventStatus} disabled={isLoading} variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button onClick={triggerEventProcessor} disabled={isProcessing} className="bg-orange-500 hover:bg-orange-600">
            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Xử lý sự kiện
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Tổng sự kiện</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Chờ xử lý</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Đang xử lý</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
                </div>
                <Loader2 className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Hoàn thành</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Thất bại</p>
                  <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Sự kiện chờ xử lý ({pendingEvents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Không có sự kiện nào chờ xử lý</p>
          ) : (
            <div className="space-y-3">
              {pendingEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(event.status)}
                    <div>
                      <p className="font-medium">{getEventTypeDisplay(event.event_type)}</p>
                      <p className="text-sm text-gray-600">
                        {event.game_type} - Phiên: {event.session_id.slice(-8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Lên lịch: {new Date(event.scheduled_at).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(event.status)} text-white`}>{event.status}</Badge>
                    {event.retry_count > 0 && (
                      <Badge variant="outline" className="text-orange-600">
                        Thử lại: {event.retry_count}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Sự kiện gần đây
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chưa có sự kiện nào</p>
          ) : (
            <div className="space-y-3">
              {recentEvents.slice(0, 10).map((event) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(event.status)}
                    <div>
                      <p className="font-medium">{getEventTypeDisplay(event.event_type)}</p>
                      <p className="text-sm text-gray-600">
                        {event.game_type} - Phiên: {event.session_id.slice(-8)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Tạo: {new Date(event.created_at).toLocaleString("vi-VN")}
                        {event.processed_at && <> | Xử lý: {new Date(event.processed_at).toLocaleString("vi-VN")}</>}
                      </p>
                      {event.error_message && <p className="text-xs text-red-600 mt-1">Lỗi: {event.error_message}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(event.status)} text-white`}>{event.status}</Badge>
                    {event.retry_count > 0 && (
                      <Badge variant="outline" className="text-orange-600">
                        Thử lại: {event.retry_count}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status Alert */}
      {stats && stats.failed > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Có {stats.failed} sự kiện thất bại. Vui lòng kiểm tra và xử lý các lỗi.</AlertDescription>
        </Alert>
      )}

      {/* Manual Trigger Card */}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{"Event-Driven Workflow Monitor"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>{"Manually trigger the event processor if it appears stuck."}</p>
          <Button onClick={manualTrigger} disabled={isLoading}>
            {isLoading ? "Triggering…" : "Run event processor now"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
