"use client"

import { QRCodeSVG } from "qrcode.react"
import { X, Download, Copy, Check, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface QRModalProps {
  isOpen: boolean
  onClose: () => void
  proxyUrl: string
  proxyDescription: string
  proxyType: "http" | "socks5" | "mtproto"
}

export default function QRModal({ isOpen, onClose, proxyUrl, proxyDescription, proxyType }: QRModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(proxyUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleDownloadQR = () => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const svg = document.querySelector("#qr-code-svg") as SVGElement

    if (!ctx || !svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      const link = document.createElement("a")
      link.download = `telegram-proxy-${proxyDescription.replace(/\s+/g, "-")}.png`
      link.href = canvas.toDataURL()
      link.click()
    }

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handleInstall = () => {
    if (proxyType === "mtproto" || proxyType === "socks5") {
      window.location.href = proxyUrl
    } else {
      handleCopyLink()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            QR Code - {proxyDescription}
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg border">
            <QRCodeSVG id="qr-code-svg" value={proxyUrl} size={200} level="M" includeMargin={true} />
          </div>

          {/* Instructions */}
          <div className="text-center text-sm text-gray-600">
            <p>Quét mã QR này bằng camera điện thoại</p>
            <p>hoặc nhấn nút bên dưới để cài đặt</p>
          </div>

          {/* Installation Instructions */}
          <Alert className="bg-blue-50 border-blue-200 text-sm">
            <AlertDescription>
              {proxyType === "mtproto" ? (
                <>Nhấn "Cài đặt ngay" để mở Telegram với MTProto proxy đã cấu hình sẵn.</>
              ) : proxyType === "socks5" ? (
                <>Nhấn "Cài đặt ngay" để mở Telegram với SOCKS5 proxy đã cấu hình sẵn.</>
              ) : (
                <>
                  HTTP proxy không thể cài đặt trực tiếp. Sao chép URL và dán vào cài đặt proxy trong Telegram (Cài đặt
                  → Dữ liệu và bộ nhớ → Cài đặt proxy).
                </>
              )}
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleCopyLink} className="flex-1">
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Đã sao chép
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Sao chép link
                </>
              )}
            </Button>

            <Button variant="outline" onClick={handleDownloadQR} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Tải QR
            </Button>
          </div>

          {/* Install Button */}
          <Button onClick={handleInstall} className="w-full bg-[#229ED9] hover:bg-[#1a7db8]">
            {proxyType === "http" ? (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Sao chép URL HTTP Proxy
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Cài đặt ngay
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
