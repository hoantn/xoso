"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/app/components/AuthProvider"
import { Gamepad2, Play, Trophy, Zap, Clock, TrendingUp, Star, Gift, Users, Target } from "lucide-react"
import Link from "next/link"

export default function GameCenterPage() {
  const { user, balance } = useAuth()

  const gameCategories = [
    {
      id: "lode-nhanh",
      title: "Lô Đề Nhanh",
      subtitle: "Siêu tốc 1-30 phút",
      description: "Kết quả nhanh, thắng liền tay!",
      href: "/game/lode-nhanh",
      icon: Zap,
      gradient: "from-orange-400 to-red-500",
      bgGradient: "from-orange-50 to-red-50",
      features: ["1 phút", "5 phút", "30 phút"],
      isHot: true,
    },
    {
      id: "lode-mien-bac",
      title: "Lô Đề Miền Bắc",
      subtitle: "Truyền thống 18:15",
      description: "Theo kết quả XSMB chính thức",
      href: "/game/lode-mien-bac",
      icon: Trophy,
      gradient: "from-blue-400 to-purple-500",
      bgGradient: "from-blue-50 to-purple-50",
      features: ["Chính thức", "Uy tín", "Tỷ lệ cao"],
      isNew: false,
    },
  ]

  const quickStats = [
    { label: "Người chơi online", value: "1,234", icon: Users, color: "text-green-600" },
    { label: "Phiên hôm nay", value: "156", icon: Target, color: "text-blue-600" },
    { label: "Tổng thưởng", value: "2.1M", icon: Gift, color: "text-purple-600" },
  ]

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 border-0 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Chào mừng đến Game Center!</h2>
              <p className="text-blue-100 mb-4">Trải nghiệm game đổi thưởng hàng đầu</p>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 rounded-lg px-3 py-2">
                  <div className="text-sm text-blue-100">Số dư hiện tại</div>
                  <div className="text-xl font-bold">
                    {balance !== null ? `${balance.toLocaleString("vi-VN")}đ` : "---"}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-6xl opacity-20">
              <Gamepad2 />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        {quickStats.map((stat, index) => (
          <Card key={index} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-4 text-center">
              <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
              <div className="text-lg font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Game Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Danh mục Game</h3>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            2 game có sẵn
          </Badge>
        </div>

        <div className="space-y-4">
          {gameCategories.map((game) => (
            <Card
              key={game.id}
              className={`bg-gradient-to-br ${game.bgGradient} border-0 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300`}
            >
              {game.isHot && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge className="bg-red-500 text-white animate-pulse">🔥 HOT</Badge>
                </div>
              )}

              <CardContent className="p-0">
                <Link href={game.href}>
                  <div className="p-6 relative">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div
                            className={`w-12 h-12 bg-gradient-to-br ${game.gradient} rounded-xl flex items-center justify-center text-white shadow-lg`}
                          >
                            <game.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">{game.title}</h4>
                            <p className="text-sm text-gray-600">{game.subtitle}</p>
                          </div>
                        </div>

                        <p className="text-gray-700 mb-4">{game.description}</p>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {game.features.map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="bg-white/80 text-gray-700">
                              {feature}
                            </Badge>
                          ))}
                        </div>

                        <Button
                          className={`bg-gradient-to-r ${game.gradient} text-white border-0 shadow-lg hover:shadow-xl transition-all group-hover:scale-105`}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Chơi ngay
                        </Button>
                      </div>

                      <div className="text-6xl opacity-10 group-hover:opacity-20 transition-opacity">
                        <game.icon />
                      </div>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Star className="w-5 h-5 text-yellow-500" />
            Thao tác nhanh
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard?tab=deposit">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col gap-1 border-2 border-green-200 hover:bg-green-50 bg-transparent"
              >
                <TrendingUp className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">Nạp tiền</span>
              </Button>
            </Link>

            <Link href="/dashboard?tab=transactions">
              <Button
                variant="outline"
                className="w-full h-16 flex flex-col gap-1 border-2 border-blue-200 hover:bg-blue-50 bg-transparent"
              >
                <Clock className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">Lịch sử</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Game Info */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardContent className="p-6">
          <h4 className="font-bold text-gray-900 mb-3">🎯 Cam kết của chúng tôi</h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Hệ thống nạp/rút tiền tự động, nhanh chóng</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Bảo mật thông tin người dùng tuyệt đối</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Tỷ lệ thắng minh bạch, công khai</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span>Hỗ trợ khách hàng 24/7</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
