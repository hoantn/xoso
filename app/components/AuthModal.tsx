"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, User, ShieldAlert } from "lucide-react"
import { useAuth } from "./AuthProvider"
import { useRouter } from "next/navigation" // Thêm dòng này

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  adminOnly?: boolean
}

export default function AuthModal({ isOpen, onClose, adminOnly = false }: AuthModalProps) {
  const { signIn, signUp, isAdmin } = useAuth()
  const router = useRouter() // Thêm dòng này
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  })

  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  })

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(signInData.email, signInData.password)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Nếu là admin only và user không phải admin
    if (adminOnly && !isAdmin) {
      setError("Bạn không có quyền truy cập trang này. Chỉ tài khoản admin mới có thể truy cập.")
      setLoading(false)
      return
    }

    onClose()
    router.push("/dashboard") // Thêm dòng này
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (adminOnly) {
      setError("Không thể đăng ký tài khoản admin. Vui lòng liên hệ quản trị viên.")
      setLoading(false)
      return
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp")
      setLoading(false)
      return
    }

    if (signUpData.password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự")
      setLoading(false)
      return
    }

    const { error } = await signUp(signUpData.email, signUpData.password)

    if (error) {
      setError(error.message)
    } else {
      setSuccess("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.")
      router.push("/dashboard") // Thêm dòng này
    }

    setLoading(false)
  }

  const resetForm = () => {
    setSignInData({ email: "", password: "" })
    setSignUpData({ email: "", password: "", confirmPassword: "" })
    setError(null)
    setSuccess(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {adminOnly ? (
              <>
                <ShieldAlert className="w-5 h-5" />
                Đăng nhập Admin
              </>
            ) : (
              <>
                <User className="w-5 h-5" />
                Đăng nhập / Đăng ký
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Đăng nhập</TabsTrigger>
            {!adminOnly && <TabsTrigger value="signup">Đăng ký</TabsTrigger>}
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            {adminOnly && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  <span>Chỉ tài khoản admin mới có thể truy cập trang này.</span>
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData((prev) => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData((prev) => ({ ...prev, password: e.target.value }))}
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

              <Button type="submit" className="w-full bg-[#229ED9] hover:bg-[#1a7db8]" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Đăng nhập
              </Button>
            </form>
          </TabsContent>

          {!adminOnly && (
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData((prev) => ({ ...prev, email: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData((prev) => ({ ...prev, password: e.target.value }))}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Xác nhận mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
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

                {success && (
                  <Alert>
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full bg-[#229ED9] hover:bg-[#1a7db8]" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Đăng ký
                </Button>
              </form>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
