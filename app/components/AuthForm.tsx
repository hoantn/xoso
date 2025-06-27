"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User, Lock, UserPlus, LogIn, Eye, EyeOff } from "lucide-react"
import { useAuth } from "./AuthProvider"
import { useRouter } from "next/navigation" // Thêm dòng này

interface AuthFormProps {
  onSuccess?: () => void
  defaultTab?: "login" | "register"
}

export default function AuthForm({ onSuccess, defaultTab = "login" }: AuthFormProps) {
  const { signIn, signUp } = useAuth()
  const router = useRouter() // Thêm dòng này
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  })

  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const { error } = await signIn(loginData.username, loginData.password)

    if (error) {
      setError(error.message)
    } else {
      setSuccess("Đăng nhập thành công!")
      onSuccess?.()
      router.push("/dashboard") // Thêm dòng này
    }

    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    // Validate
    if (registerData.password !== registerData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      setLoading(false)
      return
    }

    if (registerData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự")
      setLoading(false)
      return
    }

    if (registerData.username.length < 3) {
      setError("Username phải có ít nhất 3 ký tự")
      setLoading(false)
      return
    }

    const { error } = await signUp(registerData.username, registerData.password, registerData.fullName)

    if (error) {
      setError(error.message)
    } else {
      setSuccess("Đăng ký thành công! Bạn đã được đăng nhập tự động.")
      onSuccess?.()
      router.push("/dashboard") // Thêm dòng này
    }

    setLoading(false)
  }

  const resetForm = () => {
    setLoginData({ username: "", password: "" })
    setRegisterData({ username: "", password: "", confirmPassword: "", fullName: "" })
    setError(null)
    setSuccess(null)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Chào mừng đến với Telegram Proxy</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab} className="w-full" onValueChange={resetForm}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" className="flex items-center gap-2">
              <LogIn className="w-4 h-4" />
              Đăng nhập
            </TabsTrigger>
            <TabsTrigger value="register" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Đăng ký
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="Nhập username"
                    value={loginData.username}
                    onChange={(e) => setLoginData((prev) => ({ ...prev, username: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={loginData.password}
                    onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#229ED9] hover:bg-[#1a7db8]" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Đăng nhập
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 mt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="Chọn username (ít nhất 3 ký tự)"
                    value={registerData.username}
                    onChange={(e) => setRegisterData((prev) => ({ ...prev, username: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-fullname">Họ tên (tùy chọn)</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="register-fullname"
                    type="text"
                    placeholder="Nhập họ tên của bạn"
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mật khẩu (ít nhất 6 ký tự)"
                    value={registerData.password}
                    onChange={(e) => setRegisterData((prev) => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">Xác nhận mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="register-confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Đăng ký
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Messages */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mt-4 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
