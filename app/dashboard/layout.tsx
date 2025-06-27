"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/components/AuthProvider"
import { Loader2 } from "lucide-react"
import AppHeader from "@/components/AppHeader" // Sửa đường dẫn import

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/") // Hoặc trang đăng nhập nếu có riêng
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <p className="ml-4 text-lg">Đang tải dữ liệu người dùng...</p>
      </div>
    )
  }

  return (
    <>
      <AppHeader />
      {children}
    </>
  )
}
