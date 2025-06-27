"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, User, Lock, ShieldAlert, Info } from "lucide-react"
import { useAuth } from "./AuthProvider"

export default function AdminLoginForm() {
  const { signIn } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState("superadmin")
  const [password, setPassword] = useState("admin123456")

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    console.log("🔄 Form submit:", { username, password })

    const { error } = await signIn(username, password)

    if (error) {
      console.log("❌ Sign in error:", error)
      setError(error.message)
    } else {
      console.log("✅ Sign in successful")
    }

    setLoading(false)
  }

  // Test function để debug
  const handleTestLogin = async () => {
    console.log("🧪 Testing direct API call...")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "superadmin", password: "admin123456" }),
      })

      const data = await response.json()
      console.log("🧪 Test result:", { status: response.status, data })
    } catch (err) {
      console.log("🧪 Test error:", err)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          Đăng nhập Admin
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <AlertDescription className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <span>Chỉ tài khoản admin mới có thể truy cập trang này.</span>
          </AlertDescription>
        </Alert>

        <Alert className="mb-4 bg-green-50 border-green-200">
          <AlertDescription className="flex items-center gap-2">
            <Info className="w-4 h-4 text-green-600" />
            <div className="text-sm">
              <div>Demo Admin Accounts:</div>
              <div className="font-mono text-xs mt-1">
                <div>admin / admin123456</div>
                <div>superadmin / admin123456</div>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="admin-username"
                type="text"
                placeholder="admin hoặc superadmin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Mật khẩu</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="admin-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button type="submit" className="w-full bg-[#229ED9] hover:bg-[#1a7db8]" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Đăng nhập
            </Button>

            <Button type="button" variant="outline" className="w-full text-xs" onClick={handleTestLogin}>
              🧪 Test API (Check Console)
            </Button>
          </div>
        </form>

        <div className="mt-4 text-xs text-gray-500">💡 Mở Developer Tools (F12) → Console để xem debug logs</div>
      </CardContent>
    </Card>
  )
}
