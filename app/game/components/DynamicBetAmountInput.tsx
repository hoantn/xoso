"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { getCalculationBreakdown } from "../utils"
import type { BetType } from "../types"

interface DynamicBetAmountInputProps {
  currentBetType: BetType
  selectedNumbers: string[]
  betAmount: string
  onBetAmountChange: (amount: string) => void
  balance: number | null
}

export function DynamicBetAmountInput({
  currentBetType,
  selectedNumbers,
  betAmount,
  onBetAmountChange,
  balance,
}: DynamicBetAmountInputProps) {
  const inputAmount = Number.parseFloat(betAmount) || 0
  const numbersCount = selectedNumbers.length

  // Get calculation breakdown if we have valid input
  const calculation =
    inputAmount > 0 && numbersCount > 0 ? getCalculationBreakdown(currentBetType, inputAmount, numbersCount) : null

  const totalCost = calculation ? Number.parseInt(calculation.totalCostDisplay.replace(/[^\d]/g, "")) : 0
  const isInsufficientBalance = balance !== null && totalCost > balance

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="betAmount">
          {currentBetType.calculation_method === "point"
            ? `Số điểm cược (tối thiểu ${currentBetType.min_bet} điểm)`
            : `Số tiền cược (tối thiểu ${currentBetType.min_bet.toLocaleString("vi-VN")}đ)`}
        </Label>
        <Input
          id="betAmount"
          type="number"
          value={betAmount}
          onChange={(e) => onBetAmountChange(e.target.value)}
          placeholder={
            currentBetType.calculation_method === "point" ? `Nhập số điểm (VD: 10)` : `Nhập số tiền (VD: 50000)`
          }
          min={currentBetType.min_bet}
          className={isInsufficientBalance ? "border-red-500" : ""}
        />
      </div>

      {calculation && (
        <Card className="bg-gray-50">
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium text-gray-700">Xem trước tính toán:</div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Số tiền cược:</span>
                <span className="font-medium">{calculation.inputDisplay}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Số đã chọn:</span>
                <span className="font-medium">{numbersCount} số</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Chi phí/số:</span>
                <span className="font-medium">{calculation.costPerNumberDisplay}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Thưởng/số:</span>
                <span className="font-medium text-green-600">{calculation.winPerNumberDisplay}</span>
              </div>
            </div>

            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tổng chi phí:</span>
                <span className={`font-bold ${isInsufficientBalance ? "text-red-600" : "text-red-500"}`}>
                  -{calculation.totalCostDisplay}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tiền thắng tối đa:</span>
                <span className="font-bold text-green-600">+{calculation.totalWinDisplay}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Lời thực tế:</span>
                <span className="font-bold text-blue-600">+{calculation.netProfitDisplay}</span>
              </div>
            </div>

            {isInsufficientBalance && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                ⚠️ Số dư không đủ! Cần {totalCost.toLocaleString("vi-VN")}đ, có {balance?.toLocaleString("vi-VN")}đ
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
