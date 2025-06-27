"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/app/components/AuthProvider"
import { Gamepad, User, Wallet, LogOut, Menu, X, Home, Trophy, Clock } from "lucide-react"

export function GameHeader() {
  const { user, balance, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const gameNavItems = [
    { href: "/game", label: "Trung tâm Game", icon: Home },
    { href: "/game/lode-nhanh", label: "Lô Đề Nhanh", icon: Clock },
    { href: "/game/lode-mien-bac", label: "Lô Đề Miền Bắc", icon: Trophy },
  ]

  const isActive = (href: string) => {
    if (href === "/game") {
      return pathname === "/game"
    }
    return pathname.startsWith(href)
  }

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/game" className="flex items-center gap-2">
            <Gamepad className="w-8 h-8 text-purple-600" />
            <span className="text-xl font-bold text-gray-800">Game Center</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {gameNavItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* User Info & Actions */}
          <div className="flex items-center gap-4">
            {/* Balance */}
            <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full">
              <Wallet className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {balance !== null ? `${balance.toLocaleString("vi-VN")} VNĐ` : "..."}
              </span>
            </div>

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{user?.username}</span>
              </div>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t bg-white py-4">
            <nav className="space-y-2">
              {gameNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
                      isActive(item.href)
                        ? "bg-purple-100 text-purple-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Mobile User Info */}
            <div className="mt-4 pt-4 border-t space-y-3">
              <div className="flex items-center gap-2 px-3">
                <Wallet className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {balance !== null ? `${balance.toLocaleString("vi-VN")} VNĐ` : "..."}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">{user?.username}</span>
              </div>
              <div className="flex gap-2 px-3">
                <Link href="/dashboard" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
