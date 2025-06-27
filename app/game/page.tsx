"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Gamepad, Play, Trophy } from "lucide-react"
import { GameBanner } from "./components/GameBanner"

export default function GameCenterPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Gamepad className="w-12 h-12 text-purple-600" />
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800">Trung tâm Game</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-xl mx-auto">
          Khám phá các trò chơi đổi thưởng hấp dẫn và đặt cược ngay!
        </p>
      </div>

      {/* Game Banners Section */}
      <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
        <GameBanner
          title="Lô Đề Nhanh"
          description="Đặt cược lô đề siêu tốc 1 phút, 5 phút, 30 phút."
          href="/game/lode-nhanh"
          icon={Play}
          gradient="bg-gradient-to-br from-green-500 to-green-700"
          textColor="text-green-100"
        />

        <GameBanner
          title="Lô Đề Miền Bắc"
          description="Đặt cược theo kết quả xổ số miền Bắc chính thức - Quay số 18:15 hàng ngày."
          href="/game/lode-mien-bac"
          icon={Trophy}
          gradient="bg-gradient-to-br from-blue-600 to-blue-800"
          textColor="text-blue-100"
        />

        <GameBanner
          title="Xóc Đĩa"
          description="Game xóc đĩa truyền thống, đặt cược nhanh chóng."
          href="/game/xoc-dia"
          icon={Gamepad}
          gradient="bg-gradient-to-br from-purple-500 to-purple-700"
          textColor="text-purple-100"
          disabled={true}
        />
      </div>

      {/* Game Info */}
      <Card className="mt-8 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gamepad className="w-5 h-5" /> Thông tin thêm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Chúng tôi cam kết mang đến trải nghiệm game công bằng, minh bạch và an toàn.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-500">
            <li>Hệ thống nạp/rút tiền tự động, nhanh chóng.</li>
            <li>Bảo mật thông tin người dùng tuyệt đối.</li>
            <li>Hỗ trợ khách hàng 24/7.</li>
            <li>Tỷ lệ thắng minh bạch, công khai.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
