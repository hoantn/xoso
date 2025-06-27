"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/components/AuthProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  History,
  Trophy,
  ArrowDownCircle,
  ArrowUpCircle,
  Gamepad2,
  TrendingUp,
  Target,
  Coins,
} from "lucide-react"
import DepositHistory from "../components/DepositHistory"
import WithdrawalHistory from "../components/WithdrawalHistory"
import TransactionHistory from "@/app/components/TransactionHistory"

export default function LichSuCuocPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("all")
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/game")
      return
    }

    // Get token from localStorage or cookie
    const authToken =
      localStorage.getItem("auth_token") ||
      document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("auth_token="))
        ?.split("=")[1]

    if (authToken) {
      setToken(authToken)
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Đang tải lịch sử...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-4">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full mb-4">
          <History className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Lịch Sử Cược
        </h1>
        <p className="text-gray-600">Theo dõi tất cả hoạt động tài chính và cược của bạn</p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2" />
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm opacity-90">Thắng hôm nay</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto mb-2" />
            <div className="text-2xl font-bold">0</div>
            <div className="text-sm opacity-90">Cược hôm nay</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-violet-500 text-white border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2" />
            <div className="text-2xl font-bold">0%</div>
            <div className="text-sm opacity-90">Tỷ lệ thắng</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 shadow-lg">
          <CardContent className="p-4 text-center">
            <Coins className="w-8 h-8 mx-auto mb-2" />
            <div className="text-2xl font-bold">{user.balance?.toLocaleString() || 0}</div>
            <div className="text-sm opacity-90">Số dư hiện tại</div>
          </CardContent>
        </Card>
      </div>

      {/* Gaming Tips */}
      <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">💡 Mẹo chơi thông minh</h3>
              <p className="text-gray-600 text-sm">
                Theo dõi lịch sử cược để phân tích xu hướng và cải thiện chiến lược. Quản lý tài chính hợp lý và chỉ
                cược với số tiền bạn có thể chấp nhận mất.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Card className="shadow-xl border-0">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg">
          <CardTitle className="text-xl flex items-center gap-2">
            <History className="w-6 h-6" />
            Chi Tiết Lịch Sử
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Tất cả
              </TabsTrigger>
              <TabsTrigger value="betting" className="flex items-center gap-2">
                <Gamepad2 className="w-4 h-4" />
                Cược
              </TabsTrigger>
              <TabsTrigger value="deposit" className="flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4" />
                Nạp
              </TabsTrigger>
              <TabsTrigger value="withdrawal" className="flex items-center gap-2">
                <ArrowUpCircle className="w-4 h-4" />
                Rút
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="all" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Tất cả giao dịch</h3>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      Hiển thị tất cả hoạt động
                    </Badge>
                  </div>
                  {token ? (
                    <TransactionHistory />
                  ) : (
                    <div className="text-center py-8 text-gray-500">Đang tải dữ liệu...</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="betting" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Lịch sử cược</h3>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      Cược & Thắng
                    </Badge>
                  </div>
                  {token ? (
                    <TransactionHistory filterType="bet" />
                  ) : (
                    <div className="text-center py-8 text-gray-500">Đang tải dữ liệu...</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="deposit" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Lịch sử nạp tiền</h3>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Từ bảng deposit_requests
                    </Badge>
                  </div>
                  {token ? (
                    <DepositHistory token={token} />
                  ) : (
                    <div className="text-center py-8 text-gray-500">Đang tải dữ liệu...</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="withdrawal" className="mt-0">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Lịch sử rút tiền</h3>
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      Từ bảng withdrawal_requests
                    </Badge>
                  </div>
                  {token ? (
                    <WithdrawalHistory token={token} />
                  ) : (
                    <div className="text-center py-8 text-gray-500">Đang tải dữ liệu...</div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        <Button
          onClick={() => router.push("/dashboard?tab=deposit")}
          className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
        >
          <ArrowDownCircle className="w-4 h-4 mr-2" />
          Nạp tiền ngay
        </Button>
        <Button
          onClick={() => router.push("/dashboard?tab=withdraw")}
          variant="outline"
          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
        >
          <ArrowUpCircle className="w-4 h-4 mr-2" />
          Rút tiền
        </Button>
        <Button
          onClick={() => router.push("/game")}
          variant="outline"
          className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50"
        >
          <Gamepad2 className="w-4 h-4 mr-2" />
          Chơi game
        </Button>
      </div>
    </div>
  )
}
