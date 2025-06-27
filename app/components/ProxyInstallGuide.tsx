"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TextIcon as Telegram, Globe, Key, Settings } from "lucide-react"

export default function ProxyInstallGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Hướng dẫn cài đặt Proxy Telegram
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mtproto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mtproto" className="flex items-center gap-2">
              <Telegram className="w-4 h-4" />
              MTProto
            </TabsTrigger>
            <TabsTrigger value="socks5" className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              SOCKS5
            </TabsTrigger>
            <TabsTrigger value="http" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              HTTP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mtproto" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="font-medium">MTProto Proxy (Khuyến nghị)</h3>
              <p className="text-sm text-gray-600">
                MTProto là loại proxy được tối ưu hóa cho Telegram, nhanh và bảo mật nhất.
              </p>

              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-sm">Cài đặt tự động:</h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                  <li>Nhấn nút "Cài đặt MTProto Proxy" trên trang chính</li>
                  <li>Telegram sẽ mở ra và hiển thị hộp thoại xác nhận</li>
                  <li>Nhấn "Kết nối" để áp dụng cài đặt proxy</li>
                </ol>
              </div>

              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-sm">Cài đặt thủ công:</h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                  <li>Mở Telegram</li>
                  <li>Vào Cài đặt (Settings) → Dữ liệu và bộ nhớ (Data and Storage)</li>
                  <li>Chọn Cài đặt proxy (Proxy Settings)</li>
                  <li>Chọn "Sử dụng Proxy" (Use Proxy)</li>
                  <li>Chọn "MTProto Proxy"</li>
                  <li>Nhập thông tin Server, Port và Secret</li>
                  <li>Nhấn "Kết nối" (Connect)</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="socks5" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="font-medium">SOCKS5 Proxy</h3>
              <p className="text-sm text-gray-600">
                SOCKS5 là loại proxy phổ biến, hỗ trợ xác thực username/password và tương thích với nhiều ứng dụng khác
                ngoài Telegram.
              </p>

              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-sm">Cài đặt tự động:</h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                  <li>Nhấn nút "Cài đặt SOCKS5 Proxy" trên trang chính</li>
                  <li>Telegram sẽ mở ra và hiển thị hộp thoại xác nhận</li>
                  <li>Nhấn "Kết nối" để áp dụng cài đặt proxy</li>
                </ol>
              </div>

              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-sm">Cài đặt thủ công:</h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                  <li>Mở Telegram</li>
                  <li>Vào Cài đặt (Settings) → Dữ liệu và bộ nhớ (Data and Storage)</li>
                  <li>Chọn Cài đặt proxy (Proxy Settings)</li>
                  <li>Chọn "Sử dụng Proxy" (Use Proxy)</li>
                  <li>Chọn "SOCKS5 Proxy"</li>
                  <li>Nhập thông tin Server, Port, Username và Password</li>
                  <li>Nhấn "Kết nối" (Connect)</li>
                </ol>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="http" className="space-y-4 mt-4">
            <div className="space-y-2">
              <h3 className="font-medium">HTTP Proxy</h3>
              <p className="text-sm text-gray-600">
                HTTP Proxy là loại proxy cơ bản nhất, được hỗ trợ rộng rãi nhưng không được mã hóa như MTProto.
              </p>

              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-sm">Cài đặt thủ công (không hỗ trợ cài đặt tự động):</h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                  <li>Sao chép URL proxy từ nút "Sao chép HTTP Proxy"</li>
                  <li>Mở Telegram</li>
                  <li>Vào Cài đặt (Settings) → Dữ liệu và bộ nhớ (Data and Storage)</li>
                  <li>Chọn Cài đặt proxy (Proxy Settings)</li>
                  <li>Chọn "Sử dụng Proxy" (Use Proxy)</li>
                  <li>Chọn "HTTP Proxy"</li>
                  <li>Nhập thông tin Server, Port, Username và Password từ URL đã sao chép</li>
                  <li>Nhấn "Kết nối" (Connect)</li>
                </ol>
              </div>

              <div className="bg-yellow-50 p-3 rounded-md mt-2">
                <p className="text-sm text-yellow-800">
                  <strong>Lưu ý:</strong> HTTP Proxy không được mã hóa và không an toàn như MTProto. Chỉ sử dụng khi
                  không có lựa chọn nào khác.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
