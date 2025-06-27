"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/app/components/AuthProvider"
import { formatCurrency } from "@/lib/utils"
import {
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  ShoppingCartIcon,
  WalletIcon,
  HistoryIcon,
  Gamepad2Icon,
  RefreshCcwIcon,
  UserIcon,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function AppHeader() {
  const { user, loading, signOut, refreshUser } = useAuth()
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push("/")
  }

  const handleRefreshBalance = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    await refreshUser()
    setIsRefreshing(false)
  }

  if (loading) {
    return null // Or a loading spinner if preferred
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold" prefetch={false}>
          <HomeIcon className="h-6 w-6" />
          <span className="sr-only">Trang chủ</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4">
          <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Dashboard
          </Link>
          <Link href="/game" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
            Game Center
          </Link>
          {user?.role === "admin" && (
            <Link href="/admin95" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              Admin Panel
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium hidden sm:inline">{user.username}</span>
                <span className="text-sm font-semibold text-green-600 flex items-center">
                  {formatCurrency(user.balance || 0)} VND
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleRefreshBalance}
                    disabled={isRefreshing}
                    className="ml-1"
                  >
                    <RefreshCcwIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span className="sr-only">Làm mới số dư</span>
                  </Button>
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <UserIcon className="h-5 w-5" />
                    <span className="sr-only">Menu người dùng</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard?tab=account" className="flex items-center gap-2">
                      <SettingsIcon className="h-4 w-4" /> Thông tin tài khoản
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard?tab=deposit" className="flex items-center gap-2">
                      <WalletIcon className="h-4 w-4" /> Nạp tiền
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard?tab=withdraw" className="flex items-center gap-2">
                      <WalletIcon className="h-4 w-4" /> Rút tiền
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard?tab=transactions" className="flex items-center gap-2">
                      <HistoryIcon className="h-4 w-4" /> Lịch sử giao dịch
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard?tab=proxies" className="flex items-center gap-2">
                      <ShoppingCartIcon className="h-4 w-4" /> Proxy của tôi
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard?tab=shop" className="flex items-center gap-2">
                      <ShoppingCartIcon className="h-4 w-4" /> Mua Proxy
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/game" className="flex items-center gap-2">
                      <Gamepad2Icon className="h-4 w-4" /> Game Center
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2">
                    <LogOutIcon className="h-4 w-4" /> Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
              Đăng nhập
            </Link>
          )}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <MenuIcon className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="grid gap-6 p-6">
              <Link href="/" className="flex items-center gap-2 font-semibold" prefetch={false}>
                <HomeIcon className="h-6 w-6" />
                <span>Trang chủ</span>
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:underline underline-offset-4"
                prefetch={false}
              >
                Dashboard
              </Link>
              <Link href="/game" className="text-sm font-medium hover:underline underline-offset-4" prefetch={false}>
                Game Center
              </Link>
              {user?.role === "admin" && (
                <Link
                  href="/admin95"
                  className="text-sm font-medium hover:underline underline-offset-4"
                  prefetch={false}
                >
                  Admin Panel
                </Link>
              )}
              {user && (
                <>
                  <Link
                    href="/dashboard?tab=account"
                    className="text-sm font-medium hover:underline underline-offset-4"
                    prefetch={false}
                  >
                    Thông tin tài khoản
                  </Link>
                  <Link
                    href="/dashboard?tab=deposit"
                    className="text-sm font-medium hover:underline underline-offset-4"
                    prefetch={false}
                  >
                    Nạp tiền
                  </Link>
                  <Link
                    href="/dashboard?tab=withdraw"
                    className="text-sm font-medium hover:underline underline-offset-4"
                    prefetch={false}
                  >
                    Rút tiền
                  </Link>
                  <Link
                    href="/dashboard?tab=transactions"
                    className="text-sm font-medium hover:underline underline-offset-4"
                    prefetch={false}
                  >
                    Lịch sử giao dịch
                  </Link>
                  <Link
                    href="/dashboard?tab=proxies"
                    className="text-sm font-medium hover:underline underline-offset-4"
                    prefetch={false}
                  >
                    Proxy của tôi
                  </Link>
                  <Link
                    href="/dashboard?tab=shop"
                    className="text-sm font-medium hover:underline underline-offset-4"
                    prefetch={false}
                  >
                    Mua Proxy
                  </Link>
                  <Button onClick={handleSignOut} variant="outline" className="w-full">
                    Đăng xuất
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
