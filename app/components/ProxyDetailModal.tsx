"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Copy, QrCode, Eye, EyeOff, Check, Globe, Key, TextIcon as Telegram, Calendar, Server } from "lucide-react"
import { useState } from "react"
import type { Proxy } from "../types/proxy"
import QRModal from "./QRModal"

interface ProxyDetailModalProps {
  proxy: Proxy | null
  isOpen: boolean
  onClose: () => void
}

export default function ProxyDetailModal({ proxy, isOpen, onClose }: ProxyDetailModalProps) {
  const [showQR, setShowQR] = useState(false)
  const [showUsername, setShowUsername] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!proxy) return null

  const getProxyUrl = () => {
    if (proxy.type === "mtproto") {
      return `tg://proxy?server=${proxy.server}&port=${proxy.port}&secret=${proxy.username}`
    } else if (proxy.type === "socks5") {
      return `tg://socks?server=${proxy.server}&port=${proxy.port}&user=${encodeURIComponent(
        proxy.username,
      )}&pass=${encodeURIComponent(proxy.password)}`
    } else {
      return `${proxy.type}://${proxy.username}:${proxy.password}@${proxy.server}:${proxy.port}`
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getProxyUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const getTypeIcon = () => {
    switch (proxy.type) {
      case "mtproto":
        return <Telegram className="w-5 h-5 text-[#229ED9]" />
      case "http":
        return <Globe className="w-5 h-5 text-green-600" />
      case "socks5":
        return <Key className="w-5 h-5 text-purple-600" />
      default:
        return <Globe className="w-5 h-5 text-gray-600" />
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

  const formatUsername = (username: string) => {
    if (showUsername) return username
    if (proxy.type === "mtproto") {
      return username.substring(0, 8) + "..." + username.substring(username.length - 8)
    }
    return username.length > 20 ? username.substring(0, 20) + "..." : username
  }

  const formatPassword = (password: string) => {
    if (showPassword) return password
    return "•".repeat(Math.min(password.length, 12))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-full max-w-[600px] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getTypeIcon()}
              Chi tiết Proxy
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {proxy.server}:{proxy.port}
                </Badge>
                <Badge className={`text-sm ${getTypeBadgeColor()}`}>{proxy.type.toUpperCase()}</Badge>
                {proxy.is_active ? (
                  <Badge className="bg-green-100 text-green-800">Hoạt động</Badge>
                ) : (
                  <Badge variant="secondary">Không hoạt động</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Mô tả</h3>
              <p className="text-gray-600">{proxy.description || "Không có mô tả"}</p>
            </div>

            {/* Connection Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Server className="w-4 h-4" />
                Thông tin kết nối
              </h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Server:</span>
                  <p className="font-mono font-medium">{proxy.server}</p>
                </div>
                <div>
                  <span className="text-gray-600">Port:</span>
                  <p className="font-mono font-medium">{proxy.port}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{proxy.type === "mtproto" ? "Secret:" : "Username:"}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{formatUsername(proxy.username)}</span>
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
                    <span className="font-mono text-sm">{formatPassword(proxy.password)}</span>
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
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Thông tin thời gian
              </h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ngày tạo:</span>
                  <span>{formatDate(proxy.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cập nhật cuối:</span>
                  <span>{formatDate(proxy.updated_at)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={handleCopyLink} className="flex-1" variant="outline">
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Đã sao chép
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Sao chép URL
                  </>
                )}
              </Button>

              <Button onClick={() => setShowQR(true)} variant="outline" className="flex-1">
                <QrCode className="w-4 h-4 mr-2" />
                Hiển thị QR
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        proxyUrl={getProxyUrl()}
        proxyDescription={proxy.description}
        proxyType={proxy.type}
      />
    </>
  )
}
