"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/app/components/AuthProvider"
import { Loader2, Home, Gamepad2, Wallet, User, Trophy, DollarSign, RefreshCw } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, balance, refreshBalance } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/")
    }
  }, [user, loading, router])

  const handleRefreshBalance = async () => {
    setIsRefreshing(true)
    await refreshBalance()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Đang tải game...</p>
        </div>
      </div>
    )
  }

  const navigationItems = [
    { href: "/game", icon: Home, label: "Trang chủ", active: pathname === "/game" },
    { href: "/game/lode-nhanh", icon: Gamepad2, label: "Lô Đề Nhanh", active: pathname.includes("/lode-nhanh") },
    { href: "/game/lode-mien-bac", icon: Trophy, label: "Miền Bắc", active: pathname.includes("/lode-mien-bac") },
    { href: "/dashboard?tab=deposit", icon: Wallet, label: "Nạp tiền", active: false },
    { href: "/dashboard?tab=account", icon: User, label: "Tài khoản", active: false },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header với thông tin user */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">Game Center</h1>
                <p className="text-sm text-gray-500">Chào {user.fullName || user.username}!</p>
              </div>
            </div>

            <Card className="bg-gradient-to-r from-green-500 to-emerald-500 border-0 shadow-lg">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-white">
                  <DollarSign className="w-5 h-5" />
                  <div className="text-right">
                    <div className="text-sm font-medium">Số dư</div>
                    <div className="text-lg font-bold">
                      {balance !== null ? `${balance.toLocaleString("vi-VN")}đ` : "---"}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefreshBalance}
                    disabled={isRefreshing}
                    className="h-8 w-8 text-white hover:bg-white/20"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="pb-20 min-h-[calc(100vh-140px)]">{children}</main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={`h-16 w-full flex flex-col items-center justify-center gap-1 rounded-lg transition-all ${
                  item.active
                    ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-lg"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
