"use client"

import { useState, useEffect, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Smartphone,
  Download,
  RefreshCw,
  Check,
  AlertTriangle,
  Copy,
  LogIn,
  UserPlus,
  User,
  LogOut,
  ShieldAlert,
} from "lucide-react"
import { useAuth } from "./components/AuthProvider"
import { Alert, AlertDescription } from "@/components/ui/alert"
import ProxyInstallGuide from "./components/ProxyInstallGuide"
import AuthModal from "./components/AuthModal"
import { supabase } from "@/lib/supabase"
import AuthForm from "./components/AuthForm"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TelevnLogo } from "@/components/TelevnLogo"

type ProxyType = {
  id: string
  server: string
  port: number
  username: string
  password?: string
  type: string
  description: string
  is_active: boolean
  user_id?: string | null
}

export default function TelegramProxyPage() {
  const { user, signOut } = useAuth()
  const [showQR, setShowQR] = useState(false)
  const [selectedProxy, setSelectedProxy] = useState<ProxyType | null>(null)
  const [copied, setCopied] = useState(false)
  const [installSuccess, setInstallSuccess] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isChangingProxy, setIsChangingProxy] = useState(false)
  const [showProxyStatus, setShowProxyStatus] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [publicProxiesCount, setPublicProxiesCount] = useState(0)
  const [loadingPublicProxies, setLoadingPublicProxies] = useState(true)
  const [selectedProxyType, setSelectedProxyType] = useState<"random" | "mtproto" | "socks5">("random")

  // Fallback proxy với secret hợp lệ cho MTProto
  const fallbackProxy: ProxyType = {
    id: "fallback",
    server: "149.154.175.50",
    port: 443,
    username: "ee1b1a9c16aac9ba84fd2430b57ef6a4", // 32-character hex secret
    password: "password123",
    type: "mtproto",
    description: "Default MTProto Proxy",
    is_active: true,
    user_id: null,
  }

  const currentProxy = selectedProxy || fallbackProxy

  // Validate và format secret cho MTProto
  const validateAndFormatSecret = (secret: string): string => {
    // Remove any non-hex characters
    const cleanSecret = secret.replace(/[^a-fA-F0-9]/g, "")

    // Ensure it's at least 32 characters (pad with zeros if needed)
    if (cleanSecret.length < 32) {
      return cleanSecret.padEnd(32, "0")
    }

    // Take first 32 characters if longer
    return cleanSecret.substring(0, 32).toLowerCase()
  }

  // Tạo URL theo đúng specification của Telegram
  const getProxyUrl = useCallback(() => {
    if (!currentProxy) return "" // Handle case where currentProxy might be null temporarily

    if (currentProxy.type === "mtproto") {
      const validSecret = validateAndFormatSecret(currentProxy.username)
      const server = currentProxy.server
      return `tg://proxy?server=${server}&port=${currentProxy.port}&secret=${validSecret}`
    } else if (currentProxy.type === "socks5") {
      return `tg://socks?server=${currentProxy.server}&port=${currentProxy.port}&user=${encodeURIComponent(
        currentProxy.username,
      )}&pass=${encodeURIComponent(currentProxy.password || "")}`
    } else {
      return `${currentProxy.type}://${currentProxy.username}:${currentProxy.password}@${currentProxy.server}:${currentProxy.port}`
    }
  }, [currentProxy]) // Re-memoize if currentProxy changes

  const proxyUrl = getProxyUrl()

  // Load số lượng proxy công khai khi tải trang lần đầu
  useEffect(() => {
    const fetchPublicProxiesCount = async () => {
      setLoadingPublicProxies(true)
      try {
        // Fetch public proxies (user_id is null)
        const { data: publicProxies, error } = await supabase
          .from("proxies")
          .select("*")
          .eq("is_active", true)
          .is("user_id", null)

        if (error) throw error
        setPublicProxiesCount(publicProxies?.length || 0)
      } catch (err) {
        console.error(err)
        setError("Không thể tải số lượng proxy công khai.")
      } finally {
        setLoadingPublicProxies(false)
      }
    }
    fetchPublicProxiesCount()
  }, [])

  // Hàm lấy và cài đặt proxy ngẫu nhiên theo loại (kèm side effects copy/install)
  const selectAndInstallRandomProxyByType = async (type: "random" | "mtproto" | "socks5") => {
    setIsChangingProxy(true)
    setError(null)
    setCopied(false)
    setInstallSuccess(false)

    try {
      // Gọi API để lấy proxy ngẫu nhiên theo loại được chọn
      const apiEndpoint = `/api/random-proxy?type=${type}`
      const response = await fetch(apiEndpoint)
      const data = await response.json()

      if (!data.success) {
        setError(data.error || "Không thể lấy proxy ngẫu nhiên")
        if (data.suggestion) {
          setError(`${data.error}. ${data.suggestion}`)
        }
        setIsChangingProxy(false)
        return
      }

      const newProxy = data.proxy
      setSelectedProxy(newProxy)

      // Tạo URL proxy
      let newProxyUrl = ""
      if (newProxy.type === "mtproto") {
        const validSecret = validateAndFormatSecret(newProxy.username)
        newProxyUrl = `tg://proxy?server=${newProxy.server}&port=${newProxy.port}&secret=${validSecret}`
      } else if (newProxy.type === "socks5") {
        newProxyUrl = `tg://socks?server=${newProxy.server}&port=${newProxy.port}&user=${encodeURIComponent(
          newProxy.username,
        )}&pass=${encodeURIComponent(newProxy.password || "")}`
      }

      // Sao chép URL
      try {
        await navigator.clipboard.writeText(newProxyUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      } catch (err) {
        console.error("Failed to copy:", err)
        setError("Không thể sao chép URL. Vui lòng sao chép thủ công từ QR code.")
      }

      // Cố gắng mở Telegram
      try {
        window.location.href = newProxyUrl
        setInstallSuccess(true)
        setTimeout(() => setInstallSuccess(false), 7000)
        setError(
          "Nếu Telegram không tự động mở, vui lòng sao chép URL bên dưới hoặc sử dụng QR code để cài đặt thủ công.",
        )
      } catch (e) {
        console.error("Error trying to open tg:// URL:", e)
        setError(
          "Không thể tự động mở Telegram. Vui lòng sao chép URL bên dưới hoặc sử dụng QR code để cài đặt thủ công.",
        )
      }
    } catch (err) {
      console.error("Error getting random proxy:", err)
      setError("Lỗi khi lấy proxy ngẫu nhiên. Vui lòng thử lại.")
    } finally {
      setIsChangingProxy(false)
    }
  }

  // Xử lý nút "Đổi Proxy 1 Click"
  const handleConnect = async () => {
    await selectAndInstallRandomProxyByType(selectedProxyType)
    setShowProxyStatus(true) // Hiển thị trạng thái proxy sau khi kết nối
  }

  const toggleQR = () => {
    setShowQR(!showQR)
  }

  const toggleGuide = () => {
    setShowGuide(!showGuide)
  }

  const getProxyTypeColor = (type: string) => {
    switch (type) {
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

  // Kiểm tra proxy có hợp lệ không
  const isProxyValid = useCallback(() => {
    if (currentProxy.type === "mtproto") {
      const secret = validateAndFormatSecret(currentProxy.username)
      return secret.length === 32 && /^[a-f0-9]{32}$/.test(secret)
    }
    return true
  }, [currentProxy])

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TelevnLogo />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800">Kết nối Proxy Telegram tại Televn.Com</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto mt-4">
            Bấm nút bên dưới để kết nối Telegram qua Proxy, không bị chặn mạng.
          </p>
        </div>

        {/* Navigation Bar */}
        <div className="flex justify-center mb-8">
          <Card className="w-full max-w-md">
            <CardContent className="p-4">
              {user ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">{user.fullName || user.username}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </div>
                    <Button onClick={signOut} variant="outline" size="sm">
                      <LogOut className="w-4 h-4 mr-2" />
                      Đăng xuất
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <Link href="/dashboard">
                      <Button className="w-full" variant="secondary">
                        <User className="w-4 h-4 mr-2" />
                        Quản lý tài khoản
                      </Button>
                    </Link>
                    {user.role === "admin" || user.role === "super_admin" ? (
                      <Link href="/admin95">
                        <Button className="w-full bg-[#229ED9] hover:bg-[#1a7db8]">
                          <ShieldAlert className="w-4 h-4 mr-2" />
                          Quản trị Admin
                        </Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setAuthMode("login")
                      setShowAuthModal(true)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Đăng nhập
                  </Button>
                  <Button
                    onClick={() => {
                      setAuthMode("register")
                      setShowAuthModal(true)
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Đăng ký
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Invalid Proxy Warning */}
        {!isProxyValid() && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Proxy hiện tại không hợp lệ. Secret MTProto phải là 32 ký tự hex. Vui lòng nhấn "Đổi Proxy 1 Click" để thử
              proxy khác.
            </AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {installSuccess && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <AlertDescription className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>Đã mở Telegram với cấu hình proxy. Vui lòng xác nhận trong ứng dụng Telegram.</span>
            </AlertDescription>
          </Alert>
        )}

        {/* Copy Success Alert */}
        {copied && (
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertDescription className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-blue-600" />
              <span>
                Đã sao chép URL proxy! Dán vào Telegram: Cài đặt → Dữ liệu và bộ nhớ → Cài đặt proxy → Thêm proxy
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Proxy Status */}
        {showProxyStatus && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      loadingPublicProxies || isChangingProxy
                        ? "bg-yellow-500 animate-pulse"
                        : isProxyValid()
                          ? "bg-green-500 animate-pulse"
                          : "bg-red-500"
                    }`}
                  ></div>
                  <span className="text-sm font-medium">
                    {loadingPublicProxies || isChangingProxy
                      ? "Đang tải proxy..."
                      : selectedProxy
                        ? `Proxy: ${currentProxy.description || `${currentProxy.server}:${currentProxy.port}`}`
                        : "Sử dụng proxy mặc định"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getProxyTypeColor(currentProxy.type)}>{currentProxy.type?.toUpperCase()}</Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentProxy.server}:{currentProxy.port}
                  </Badge>
                  {currentProxy.user_id === null && (
                    <Badge variant="secondary" className="text-xs">
                      Công khai
                    </Badge>
                  )}
                  {currentProxy.type === "mtproto" && (
                    <Badge variant={isProxyValid() ? "default" : "destructive"} className="text-xs">
                      {isProxyValid() ? "Valid" : "Invalid"}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Action Card */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="p-8 text-center">
            <Button
              onClick={handleConnect}
              disabled={isChangingProxy || loadingPublicProxies}
              className="bg-green-600 hover:bg-green-700 text-white text-xl px-8 py-4 h-auto mb-4 w-full md:w-auto disabled:opacity-50"
              size="lg"
            >
              <RefreshCw className={`w-5 h-5 mr-2 ${isChangingProxy ? "animate-spin" : ""}`} />
              {isChangingProxy ? "Đang đổi proxy..." : "Đổi Proxy 1 Click"}
            </Button>

            <p className="text-sm text-gray-600 mb-6">
              Nhấn nút "Đổi Proxy 1 Click" để thêm proxy và tự sao chép URL proxy mới nếu bạn muốn thêm thủ công.
            </p>

            {/* Proxy Type Selection */}
            <div className="flex justify-center mb-6">
              <div className="flex flex-col items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Chọn loại Proxy:</label>
                <Select
                  value={selectedProxyType}
                  onValueChange={(value: "random" | "mtproto" | "socks5") => setSelectedProxyType(value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Chọn loại Proxy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">🎲 Ngẫu Nhiên</SelectItem>
                    <SelectItem value="mtproto">🔵 MTPROTO</SelectItem>
                    <SelectItem value="socks5">🟣 SOCKS5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Proxy URL Display for debugging */}
            {(currentProxy.type === "http" || error) && ( // Hiển thị URL nếu là HTTP hoặc có lỗi khi thử tự động
              <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">URL Proxy:</p>
                <div className="font-mono text-xs bg-white p-2 rounded border break-all">{proxyUrl}</div>
                {currentProxy.type === "mtproto" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Secret length: {validateAndFormatSecret(currentProxy.username).length} characters
                  </p>
                )}
              </div>
            )}

            {/* Alternative methods */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              <Button onClick={toggleQR} variant="outline" className="text-sm bg-transparent">
                {showQR ? "Ẩn QR Code" : "Hiển thị QR Code"}
              </Button>
              <Button onClick={toggleGuide} variant="outline" className="text-sm bg-transparent">
                {showGuide ? "Ẩn hướng dẫn" : "Xem hướng dẫn"}
              </Button>
            </div>

            {showQR && (
              <div className="flex justify-center mt-4">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <QRCodeSVG value={proxyUrl} size={200} level="M" includeMargin={true} />
                  <p className="text-sm text-gray-500 mt-2">Quét mã QR từ điện thoại</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hướng dẫn cài đặt */}
        {showGuide && <ProxyInstallGuide />}

        {/* Download Instructions */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <Smartphone className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Nếu bạn chưa có Telegram, hãy cài đặt:</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Button
                onClick={() =>
                  window.open("https://play.google.com/store/apps/details?id=org.telegram.messenger", "_blank")
                }
                variant="outline"
                className="h-auto py-4 px-6 flex items-center justify-center gap-3"
              >
                <Download className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Tải Telegram</div>
                  <div className="text-sm text-gray-500">cho Android</div>
                </div>
              </Button>

              <Button
                onClick={() => window.open("https://apps.apple.com/app/telegram/id686449807", "_blank")}
                variant="outline"
                className="h-auto py-4 px-6 flex items-center justify-center gap-3"
              >
                <Download className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Tải Telegram</div>
                  <div className="text-sm text-gray-500">cho iOS</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>
            Proxy Server: {currentProxy.server}:{currentProxy.port}
          </p>
          <p className="mt-1">Kết nối an toàn và nhanh chóng</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            {publicProxiesCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {publicProxiesCount} proxy công khai có sẵn
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              Chỉ sử dụng proxy miễn phí
            </Badge>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="relative">
            <Button
              onClick={() => setShowAuthModal(false)}
              variant="ghost"
              size="sm"
              className="absolute -top-2 -right-2 z-10 bg-white rounded-full shadow-lg"
            >
              ✕
            </Button>
            <AuthForm defaultTab={authMode} onSuccess={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
