"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Copy,
  QrCode,
  Edit,
  Trash2,
  TextIcon as Telegram,
  Eye,
  EyeOff,
  Check,
  Key,
  Globe,
  Download,
} from "lucide-react"
import type { Proxy } from "../types/proxy"
import QRModal from "./QRModal"

interface ProxyCardProps {
  proxy: Proxy
  onEdit: (proxy: Proxy) => void
  onDelete: (id: string) => void
}

export default function ProxyCard({ proxy, onEdit, onDelete }: ProxyCardProps) {
  const [showQR, setShowQR] = useState(false)
  const [showUsername, setShowUsername] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  // Generate appropriate URL based on proxy type
  const getProxyUrl = () => {
    if (proxy.type === "mtproto") {
      return `tg://proxy?server=${proxy.server}&port=${proxy.port}&secret=${proxy.username}`
    } else if (proxy.type === "socks5") {
      return `tg://socks?server=${proxy.server}&port=${proxy.port}&user=${encodeURIComponent(
        proxy.username,
      )}&pass=${encodeURIComponent(proxy.password)}`
    } else {
      // For HTTP proxies, create a connection string
      return `${proxy.type}://${proxy.username}:${proxy.password}@${proxy.server}:${proxy.port}`
    }
  }

  const proxyUrl = getProxyUrl()

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(proxyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleOpenTelegram = () => {
    if (proxy.type === "mtproto" || proxy.type === "socks5") {
      window.location.href = proxyUrl
    } else {
      // For HTTP, copy to clipboard instead
      handleCopyLink()
    }
  }

  const handleDelete = () => {
    if (confirm("Bạn có chắc chắn muốn xóa proxy này?")) {
      onDelete(proxy.id)
    }
  }

  const formatUsername = (username: string | null | undefined) => {
    if (!username) return "" // Trả về chuỗi rỗng nếu username là null hoặc undefined
    if (showUsername) return username
    if (proxy.type === "mtproto") {
      return username.substring(0, 8) + "..." + username.substring(username.length - 8)
    }
    return username.length > 20 ? username.substring(0, 20) + "..." : username
  }

  const formatPassword = (password: string | null | undefined) => {
    if (!password) return "" // Trả về chuỗi rỗng nếu password là null hoặc undefined
    if (showPassword) return password
    return "•".repeat(Math.min(password.length, 12))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

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

  const getInstallButtonText = () => {
    switch (proxy.type) {
      case "mtproto":
      case "socks5":
        return "Cài đặt vào Telegram"
      case "http":
        return "Sao chép URL"
      default:
        return "Sử dụng Proxy"
    }
  }

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {getTypeIcon()}
              <Badge variant="secondary" className="text-xs">
                {proxy.server}:{proxy.port}
              </Badge>
              <Badge className={`text-xs ${getTypeBadgeColor()}`}>{proxy.type.toUpperCase()}</Badge>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => onEdit(proxy)} className="h-8 w-8 p-0">
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          <div>
            <h3 className="font-medium text-gray-900 mb-1">{proxy.description}</h3>
            <p className="text-sm text-gray-500">Tạo: {formatDate(proxy.created_at)}</p>
          </div>

          {/* Proxy Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Server:</span>
              <span className="font-mono">{proxy.server}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Port:</span>
              <span className="font-mono">{proxy.port}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">{proxy.type === "mtproto" ? "Secret:" : "Username:"}</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{formatUsername(proxy.username)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowUsername(!showUsername)}
                  className="h-6 w-6 p-0"
                >
                  {showUsername ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Password:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs">{formatPassword(proxy.password)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPassword(!showPassword)}
                  className="h-6 w-6 p-0"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyLink} className="text-xs">
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Sao chép
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleOpenTelegram}
              className="bg-[#229ED9] hover:bg-[#1a7db8] text-white text-xs"
            >
              {proxy.type === "mtproto" || proxy.type === "socks5" ? (
                <>
                  <Download className="w-3 h-3 mr-1" />
                  Cài đặt
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy URL
                </>
              )}
            </Button>
          </div>

          <Button size="sm" variant="outline" onClick={() => setShowQR(true)} className="w-full text-xs">
            <QrCode className="w-3 h-3 mr-1" />
            Hiển thị QR Code
          </Button>
        </CardContent>
      </Card>

      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        proxyUrl={proxyUrl}
        proxyDescription={proxy.description}
        proxyType={proxy.type}
      />
    </>
  )
}
