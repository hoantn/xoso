"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, Zap, CheckCircle } from "lucide-react"

interface GameStatusIndicatorProps {
  gameType: string
}

export function GameStatusIndicator({ gameType }: GameStatusIndicatorProps) {
  const [status, setStatus] = useState<{
    isAutoDrawEnabled: boolean
    lastDrawTime: string | null
    nextDrawTime: string | null
    readySessionsCount: number
  }>({
    isAutoDrawEnabled: false,
    lastDrawTime: null,
    nextDrawTime: null,
    readySessionsCount: 0,
  })

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/game/draw-lottery?gameType=${gameType}`)
        if (response.ok) {
          const data = await response.json()
          setStatus((prev) => ({
            ...prev,
            readySessionsCount: data.count || 0,
          }))
        }
      } catch (error) {
        console.error("Error checking game status:", error)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 30000) // Check every 30 seconds
    return () => clearInterval(interval)
  }, [gameType])

  const getStatusColor = () => {
    if (status.readySessionsCount > 0) return "bg-orange-100 text-orange-800"
    return "bg-green-100 text-green-800"
  }

  const getStatusIcon = () => {
    if (status.readySessionsCount > 0) return <Clock className="w-3 h-3" />
    return <CheckCircle className="w-3 h-3" />
  }

  const getStatusText = () => {
    if (status.readySessionsCount > 0) {
      return `${status.readySessionsCount} phiên chờ quay`
    }
    return "Hệ thống hoạt động bình thường"
  }

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-sm">Trạng thái hệ thống</span>
          </div>
          <Badge className={getStatusColor()}>
            {getStatusIcon()}
            <span className="ml-1">{getStatusText()}</span>
          </Badge>
        </div>

        {status.lastDrawTime && (
          <p className="text-xs text-gray-600 mt-2">
            Quay số gần nhất: {new Date(status.lastDrawTime).toLocaleString("vi-VN")}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
