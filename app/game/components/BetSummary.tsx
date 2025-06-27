"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getCalculationBreakdown } from "../utils"
import type { BetType } from "../types"

interface BetSummaryProps {
  betType: BetType
  selectedNumbers: string[]
  inputAmount: number
  onConfirm: () => void
  isLoading?: boolean
}

export function BetSummary({ betType, selectedNumbers, inputAmount, onConfirm, isLoading }: BetSummaryProps) {
  const calculation = getCalculationBreakdown(betType, inputAmount, selectedNumbers.length)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Thông Tin Cược</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Loại cược:</span>
            <Badge variant="secondary">{betType.name}</Badge>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Số đã chọn:</span>
            <span className="text-sm font-medium">{selectedNumbers.join(", ")}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Số tiền cược:</span>
            <span className="text-sm font-medium">{calculation.inputDisplay}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Chi phí mỗi số:</span>
            <span className="text-sm font-medium">{calculation.costPerNumberDisplay}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Tổng chi phí:</span>
            <span className="text-sm font-medium text-red-600">-{calculation.totalCostDisplay}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Tỷ lệ thưởng:</span>
            <span className="text-sm font-medium">1 ăn {betType.multiplier}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Thưởng mỗi số:</span>
            <span className="text-sm font-medium text-green-600">{calculation.winPerNumberDisplay}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Tiền thắng tối đa:</span>
            <span className="text-sm font-bold text-green-600">+{calculation.totalWinDisplay}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Lời thực tế:</span>
            <span className="text-sm font-bold text-blue-600">+{calculation.netProfitDisplay}</span>
          </div>
        </div>

        <Separator />

        {/* Chi tiết tính toán */}
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Chi tiết tính toán:</div>
          {calculation.calculationSteps.map((step, index) => (
            <div key={index} className="text-xs text-muted-foreground">
              {index + 1}. {step}
            </div>
          ))}
        </div>

        <div className="pt-2">
          <button
            onClick={onConfirm}
            disabled={isLoading || selectedNumbers.length === 0}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 rounded-md font-medium disabled:opacity-50"
          >
            {isLoading ? "Đang đặt cược..." : "Xác nhận đặt cược"}
          </button>
        </div>

        <div className="text-xs text-muted-foreground text-center">
          * LÔ: Nếu số xuất hiện nhiều lần sẽ nhân theo số lần
          <br />* XIÊN: Tất cả số phải về cùng lúc mới trúng
          <br />* Tiền thưởng không bao gồm tiền cược gốc
        </div>
      </CardContent>
    </Card>
  )
}
