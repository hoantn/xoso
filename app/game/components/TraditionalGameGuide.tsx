"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Calculator, Trophy, Target, Clock, DollarSign } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function TraditionalGameGuide() {
  return (
    <div className="space-y-6">
      {/* Tổng quan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Tổng quan Lô Đề Miền Bắc Truyền Thống
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Lô Đề Miền Bắc Truyền Thống dựa trên kết quả xổ số miền Bắc chính thức, quay số vào{" "}
            <strong>18:15 hàng ngày</strong>. Người chơi đặt cược dự đoán số sẽ xuất hiện trong kết quả xổ số.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="font-semibold text-blue-800">Quay số 18:15</div>
              <div className="text-sm text-blue-600">Theo kết quả XSMB chính thức</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="font-semibold text-green-800">8 Giải thưởng</div>
              <div className="text-sm text-green-600">Từ giải đặc biệt đến giải 7</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Các loại cược LÔ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Các loại cược LÔ (Phương pháp điểm)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Lô</strong> sử dụng phương pháp tính theo "điểm". Mỗi điểm = 29.000đ. Hệ thống tự động quy đổi
              tiền thành điểm khi đặt cược.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {/* Lô 2 số */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Lô 2 số <Badge variant="secondary">Tỷ lệ: 99</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Cách chơi:</strong> Đoán 2 số cuối của bất kỳ giải nào trong kết quả XSMB.
                </p>
                <p>
                  <strong>Ví dụ:</strong> Bạn nhập <strong>290.000đ</strong> → Hệ thống quy đổi thành{" "}
                  <strong>10 điểm</strong> cho số <strong>46</strong>
                </p>
                <div className="bg-yellow-50 p-3 rounded">
                  <p>
                    <strong>Nếu số 46 xuất hiện trong kết quả XSMB:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li>Giải 7: có số 12346 → 1 lần trúng</li>
                    <li>Giải 6: có số 98746 → 1 lần trúng</li>
                    <li>Giải 4: có số 5546 → 1 lần trúng</li>
                    <li>
                      <strong>Tổng: 3 lần trúng</strong>
                    </li>
                  </ul>
                  <p className="mt-2 font-semibold text-green-600">Tiền thưởng = 10 điểm × 99 × 3 lần = 2.970.000đ</p>
                  <p className="text-sm text-gray-600">Tiền cược = 290.000đ</p>
                  <p className="font-semibold text-blue-600">Lợi nhuận = 2.970.000đ - 290.000đ = 2.680.000đ</p>
                </div>
              </div>
            </div>

            {/* Lô 3 số */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Lô 3 số <Badge variant="secondary">Tỷ lệ: 900</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Cách chơi:</strong> Đoán 3 số cuối của bất kỳ giải nào trong kết quả XSMB.
                </p>
                <p>
                  <strong>Ví dụ:</strong> Bạn nhập <strong>145.000đ</strong> → Hệ thống quy đổi thành{" "}
                  <strong>5 điểm</strong> cho số <strong>563</strong>
                </p>
                <div className="bg-yellow-50 p-3 rounded">
                  <p>
                    <strong>Nếu số 563 xuất hiện ở giải đặc biệt: 90563</strong>
                  </p>
                  <p className="mt-2 font-semibold text-green-600">Tiền thưởng = 5 điểm × 900 × 1 lần = 4.500.000đ</p>
                  <p className="text-sm text-gray-600">Tiền cược = 145.000đ</p>
                  <p className="font-semibold text-blue-600">Lợi nhuận = 4.500.000đ - 145.000đ = 4.355.000đ</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Các loại cược ĐỀ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Các loại cược ĐỀ (Phương pháp tiền mặt)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Đề</strong> sử dụng phương pháp tính theo tiền mặt trực tiếp. Giá trị thưởng = Số tiền cược × Tỷ
              lệ.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {/* Đề đặc biệt */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Đề đặc biệt <Badge variant="secondary">Tỷ lệ: 99</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Cách chơi:</strong> Đoán 2 số cuối của giải đặc biệt XSMB.
                </p>
                <p>
                  <strong>Ví dụ:</strong> Bạn đặt cược <strong>100.000đ</strong> cho số <strong>63</strong>
                </p>
                <div className="bg-blue-50 p-3 rounded">
                  <p>
                    <strong>Nếu giải đặc biệt XSMB là 90563 (kết thúc bằng 63):</strong>
                  </p>
                  <p className="mt-2 font-semibold text-green-600">Tiền thưởng = 100.000đ × 99 = 9.900.000đ</p>
                  <p className="font-semibold text-blue-600">Lợi nhuận = 9.900.000đ - 100.000đ = 9.800.000đ</p>
                </div>
              </div>
            </div>

            {/* Nhất tố */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Nhất Tố <Badge variant="secondary">Tỷ lệ: 99</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Cách chơi:</strong> Đoán 2 số cuối của giải nhất XSMB.
                </p>
                <p>
                  <strong>Ví dụ:</strong> Bạn đặt cược <strong>50.000đ</strong> cho số <strong>78</strong>
                </p>
                <div className="bg-blue-50 p-3 rounded">
                  <p>
                    <strong>Nếu giải nhất XSMB là 12378 (kết thúc bằng 78):</strong>
                  </p>
                  <p className="mt-2 font-semibold text-green-600">Tiền thưởng = 50.000đ × 99 = 4.950.000đ</p>
                  <p className="font-semibold text-blue-600">Lợi nhuận = 4.950.000đ - 50.000đ = 4.900.000đ</p>
                </div>
              </div>
            </div>

            {/* Đề đầu đuôi */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Đề đầu đuôi <Badge variant="secondary">Tỷ lệ: 9</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Cách chơi:</strong> Đoán số đầu (thứ 4) hoặc số đuôi (thứ 5) của giải đặc biệt XSMB.
                </p>
                <p>
                  <strong>Ví dụ:</strong> Giải đặc biệt là <strong>90563</strong>, bạn đặt số <strong>6</strong>
                </p>
                <div className="bg-blue-50 p-3 rounded">
                  <p>Số 6 là số đầu (vị trí thứ 4 từ phải qua) → Trúng!</p>
                  <p className="mt-2 font-semibold text-green-600">Tiền thưởng = 50.000đ × 9 = 450.000đ</p>
                </div>
              </div>
            </div>

            {/* Đề 3 càng */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Đề 3 càng <Badge variant="secondary">Tỷ lệ: 900</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Cách chơi:</strong> Đoán 3 số cuối của giải đặc biệt XSMB.
                </p>
                <p>
                  <strong>Ví dụ:</strong> Bạn đặt cược <strong>10.000đ</strong> cho số <strong>563</strong>
                </p>
                <div className="bg-blue-50 p-3 rounded">
                  <p>
                    <strong>Nếu giải đặc biệt XSMB là 90563 (kết thúc bằng 563):</strong>
                  </p>
                  <p className="mt-2 font-semibold text-green-600">Tiền thưởng = 10.000đ × 900 = 9.000.000đ</p>
                  <p className="font-semibold text-blue-600">Lợi nhuận = 9.000.000đ - 10.000đ = 8.990.000đ</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Các loại cược XIÊN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Các loại cược XIÊN (Phương pháp tiền mặt)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Xiên</strong> yêu cầu TẤT CẢ các số đã chọn phải xuất hiện trong kết quả XSMB cùng lúc.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {/* Xiên 2 */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Xiên 2 <Badge variant="secondary">Tỷ lệ: 15</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Cách chơi:</strong> Chọn đúng 2 số khác nhau, cả 2 phải xuất hiện trong kết quả XSMB.
                </p>
                <p>
                  <strong>Ví dụ:</strong> Bạn chọn số <strong>46</strong> và <strong>78</strong>, đặt cược{" "}
                  <strong>200.000đ</strong>
                </p>
                <div className="bg-green-50 p-3 rounded">
                  <p>
                    <strong>Nếu cả 46 và 78 đều xuất hiện trong kết quả XSMB:</strong>
                  </p>
                  <p className="mt-2 font-semibold text-green-600">Tiền thưởng = 200.000đ × 15 = 3.000.000đ</p>
                  <p className="font-semibold text-blue-600">Lợi nhuận = 3.000.000đ - 200.000đ = 2.800.000đ</p>
                </div>
              </div>
            </div>

            {/* Xiên 3 */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                Xiên 3 <Badge variant="secondary">Tỷ lệ: 78</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Cách chơi:</strong> Chọn đúng 3 số khác nhau, cả 3 phải xuất hiện trong kết quả XSMB.
                </p>
                <p>
                  <strong>Ví dụ:</strong> Bạn chọn số <strong>46</strong>, <strong>78</strong>, và <strong>23</strong>,
                  đặt cược <strong>100.000đ</strong>
                </p>
                <div className="bg-green-50 p-3 rounded">
                  <p>
                    <strong>Nếu cả 46, 78, và 23 đều xuất hiện trong kết quả XSMB:</strong>
                  </p>
                  <p className="mt-2 font-semibold text-green-600">Tiền thưởng = 100.000đ × 78 = 7.800.000đ</p>
                  <p className="font-semibold text-blue-600">Lợi nhuận = 7.800.000đ - 100.000đ = 7.700.000đ</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Công thức tính thưởng chi tiết */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Công thức tính thưởng chi tiết
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>QUAN TRỌNG:</strong> Đặc biệt cho Lô, nếu bạn đặt nhiều số và có nhiều số trúng, tiền thưởng sẽ
              được cộng dồn theo số lần xuất hiện!
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Ví dụ Lô đặt nhiều số trong XSMB:</h4>
              <p className="text-sm mb-2">
                Bạn nhập <strong>145.000đ cho mỗi số</strong> trong <strong>10 số Lô 2 số</strong> đã chọn. Hệ thống quy
                đổi thành <strong>5 điểm cho mỗi số</strong>.
              </p>
              <p className="text-sm mb-2">
                Kết quả XSMB: có <strong>4 số trúng</strong>:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                <li>Số A xuất hiện ở giải 7 → 1 lần trúng</li>
                <li>Số B xuất hiện ở giải 6 và giải 4 → 2 lần trúng</li>
                <li>Số C xuất hiện ở giải 5 → 1 lần trúng</li>
                <li>Số D xuất hiện ở giải 3 và giải 2 → 2 lần trúng</li>
              </ul>
              <div className="mt-3 p-3 bg-white rounded border">
                <p className="font-semibold text-green-600">Tổng lần trúng = 1 + 2 + 1 + 2 = 6 lần</p>
                <p className="font-semibold text-green-600">Tiền thưởng = 5 điểm × 99 × 6 lần = 2.970.000đ</p>
                <p className="text-sm text-gray-600">Tiền cược = 145.000đ × 10 số = 1.450.000đ</p>
                <p className="font-semibold text-blue-600">Lợi nhuận = 2.970.000đ - 1.450.000đ = 1.520.000đ</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lưu ý quan trọng */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Lưu ý quan trọng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <p>
              • <strong>Lô:</strong> Hệ thống tự quy đổi tiền thành điểm (29.000đ = 1 điểm). Số xuất hiện nhiều lần sẽ
              được tính nhân tương ứng.
            </p>
            <p>
              • <strong>Đề:</strong> Tính theo tiền mặt trực tiếp. Chỉ tính 1 lần dù số xuất hiện nhiều lần.
            </p>
            <p>
              • <strong>Xiên:</strong> TẤT CẢ số đã chọn phải xuất hiện cùng lúc mới thắng.
            </p>
            <p>
              • <strong>Thời gian đặt cược:</strong> Chỉ được đặt cược trước 18:15 hàng ngày.
            </p>
            <p>
              • <strong>Kết quả:</strong> Dựa trên XSMB chính thức, được công bố sau 18:15 và tự động trả thưởng.
            </p>
            <p>
              • <strong>Số dư:</strong> Đảm bảo có đủ số dư trước khi đặt cược.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
