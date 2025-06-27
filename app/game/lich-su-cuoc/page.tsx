"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AuthService } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { History, TrendingUp, TrendingDown, RefreshCw, GamepadIcon, Trophy, Target, ArrowUpDown } from "lucide-react"
import DepositHistory from "../components/DepositHistory"
import WithdrawalHistory from "../components/WithdrawalHistory"
import BettingHistory from "../components/BettingHistory"

interface UserSession {
  id: string
  username: string
  role: string
  fullName: string | null
  balance: number
}

export default function LichSuCuocPage() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      try {
        // Get token from localStorage
        const storedToken = localStorage.getItem("auth_token")
        if (!storedToken) {
          router.push("/")
          return
        }

        // Verify token
        const userData = AuthService.verifySessionToken(storedToken)
        if (!userData) {
          localStorage.removeItem("auth_token")
          router.push("/")
          return
        }

        setUser(userData)
        setToken(storedToken)
      } catch (error) {
        console.error("Auth check error:", error)
        localStorage.removeItem("auth_token")
        router.push("/")
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleRefresh = () => {
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <GamepadIcon className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!user || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GamepadIcon className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Cần đăng nhập</h3>
          <p className="text-gray-600 mb-4">Vui lòng đăng nhập để xem lịch sử cược.</p>
          <Button onClick={() => router.push("/")}>Về trang chủ</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-4">
            <History className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Lịch sử cược
          </h1>
          <p className="text-gray-600">Theo dõi tất cả hoạt động cược và giao dịch của bạn</p>
        </div>

        {/* User Info Card */}
        <Card className="mb-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-1">Chào {user.fullName || user.username}!</h2>
                <p className="text-green-100">Chúc bạn may mắn trong các ván cược!</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{user.balance?.toLocaleString() || "0"}đ</div>
                <div className="text-sm text-green-100">Số dư hiện tại</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            onClick={handleRefresh}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 h-12"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
          <Button
            onClick={() => router.push("/game")}
            className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0 h-12"
          >
            <GamepadIcon className="w-4 h-4 mr-2" />
            Chơi game
          </Button>
        </div>

        {/* Main Content */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
              <History className="w-6 h-6" />
              Lịch sử giao dịch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  Tất cả
                </TabsTrigger>
                <TabsTrigger value="betting" className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Cược
                </TabsTrigger>
                <TabsTrigger value="deposit" className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Nạp
                </TabsTrigger>
                <TabsTrigger value="withdrawal" className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Rút
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="space-y-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Tất cả giao dịch</h3>
                    <p className="text-gray-600 mb-4">Chọn một tab cụ thể để xem chi tiết từng loại giao dịch</p>
                    <div className="flex justify-center gap-2">
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-blue-50"
                        onClick={() => setActiveTab("betting")}
                      >
                        <Target className="w-3 h-3 mr-1" />
                        Cược
                      </Badge>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-green-50"
                        onClick={() => setActiveTab("deposit")}
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Nạp tiền
                      </Badge>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-red-50"
                        onClick={() => setActiveTab("withdrawal")}
                      >
                        <TrendingDown className="w-3 h-3 mr-1" />
                        Rút tiền
                      </Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="betting">
                <BettingHistory token={token} />
              </TabsContent>

              <TabsContent value="deposit">
                <DepositHistory token={token} />
              </TabsContent>

              <TabsContent value="withdrawal">
                <WithdrawalHistory token={token} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Gaming Tips */}
        <Card className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 mb-2">💡 Mẹo chơi game hiệu quả</h3>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Đặt ngân sách cố định cho mỗi phiên chơi</li>
                  <li>• Theo dõi lịch sử để phân tích xu hướng</li>
                  <li>• Không cược quá nhiều tiền trong một lần</li>
                  <li>• Biết dừng khi đã thắng hoặc thua đủ</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
