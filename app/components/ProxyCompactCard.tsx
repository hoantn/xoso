"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye, Globe, Key, TextIcon as Telegram } from "lucide-react"
import type { Proxy } from "../types/proxy"

interface ProxyCompactCardProps {
  proxy: Proxy
  onClick: (proxy: Proxy) => void
}

export default function ProxyCompactCard({ proxy, onClick }: ProxyCompactCardProps) {
  const getTypeIcon = () => {
    switch (proxy.type) {
      case "mtproto":
        return <Telegram className="w-4 h-4 text-[#229ED9]" />
      case "http":
        return <Globe className="w-4 h-4 text-green-600" />
      case "socks5":
        return <Key className="w-4 h-4 text-purple-600" />
      default:
        return <Globe className="w-4 h-4 text-gray-600" />
    }
  }

  const getTypeBadgeColor = () => {
    switch (proxy.type) {
      case "mtproto":
        return "bg-blue-100 text-blue-800"
      case "http":
        return "bg-green-100 text-green-800"
      case "socks5":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onClick(proxy)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getTypeIcon()}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">
                  {proxy.server}:{proxy.port}
                </span>
                <Badge className={`text-xs ${getTypeBadgeColor()}`}>{proxy.type.toUpperCase()}</Badge>
              </div>
              <p className="text-xs text-gray-500 truncate">{proxy.description || "Không có mô tả"}</p>
              <p className="text-xs text-gray-400">Tạo: {formatDate(proxy.created_at)}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onClick(proxy)
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
