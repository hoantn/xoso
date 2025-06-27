"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calculator, Coins, DollarSign, AlertCircle } from "lucide-react"

interface DynamicBetAmountInputProps {
  currentBetType: any
  selectedNumbers: string[]
  betAmount: string
  onBetAmountChange: (amount: string) => void
  balance: number | null
}

const COST_PER_POINT = 29000 // 1 điểm = 29,000đ

export function DynamicBetAmountInput({
  currentBetType,
  selectedNumbers,
  betAmount,
  onBetAmountChange,
  balance,
}: DynamicBetAmountInputProps) {
  const [isPointBased, setIsPointBased] = useState(false)

  // Determine if this is a point-based bet (Lô) or money-based bet (Đề/Xiên)
  useEffect(() => {
    if (currentBetType && currentBetType.id) {
      const pointBased = currentBetType.id.includes("lo") && !currentBetType.id.includes("de")
      setIsPointBased(pointBased)
    }
  }, [currentBetType])

  // Get multiplier for the bet type
  const getMultiplier = (type: string): number => {
    const multipliers: Record<string, number> = {
      // Fast lottery multipliers
      lo_2_so_1p: 99,
      lo_2_so_nhanh: 99,
      lo_2_so_5p: 99,
      lo_2_so_30p: 99,
      lo_3_so_1p: 900,
      lo_3_so_nhanh: 900,
      de_dac_biet_1p: 99,
      de_dac_biet_nhanh: 99,
      de_dac_biet_5p: 99,
      de_dac_biet_30p: 99,
      nhat_to_1p: 9,
      nhat_to_nhanh: 9,
      de_dau_duoi_1p: 9,
      de_dau_duoi_nhanh: 9,
      xien_2_1p: 17,
      xien_2_nhanh: 17,
      xien_3_1p: 65,
      xien_3_nhanh: 65,
      xien_4_1p: 200,
      xien_4_nhanh: 200,
      // Traditional lottery multipliers
      lo: 99,
      lo_2_so: 99,
      lo_3_so: 900,
      de: 99,
      de_dac_biet: 99,
      de_3_cang: 900,
      nhat_to: 9,
      de_dau_duoi: 9,
      xien2: 17,
      xien_2: 17,
      xien3: 65,
      xien_3: 65,
      xien_4: 200,
    }
    return multipliers[type] || 99
  }

  const multiplier = currentBetType ? getMultiplier(currentBetType.id) : 99

  // Calculate costs and potential winnings
  const calculateValues = (value: string) => {
    const numValue = Number.parseFloat(value) || 0
    if (numValue <= 0) return { totalCost: 0, potentialWinnings: 0, pointsPerNumber: 0 }

    if (isPointBased) {
      // Point-based betting (Lô)
      const pointsPerNumber = Math.floor(numValue)
      // Total Cost = points_per_number × number_of_selected_numbers × 29,000 VND per point
      const totalCost = pointsPerNumber * selectedNumbers.length * COST_PER_POINT
      const potentialPerHit = pointsPerNumber * multiplier * 1000 // Formula: points_per_number × multiplier × 1000
      const maxPotentialWinnings = potentialPerHit * selectedNumbers.length // If all numbers hit once

      return { totalCost, potentialWinnings: maxPotentialWinnings, pointsPerNumber }
    } else {
      // Money-based betting (Đề/Xiên)
      const amount = numValue
      const totalCost = amount
      let potentialWinnings = 0

      if (currentBetType && currentBetType.id.includes("xien")) {
        // Xiên: all or nothing
        potentialWinnings = amount * multiplier
      } else {
        // Đề: per number
        potentialWinnings = amount * multiplier * selectedNumbers.length
      }

      return { totalCost, potentialWinnings, pointsPerNumber: 0 }
    }
  }

  const { totalCost, potentialWinnings, pointsPerNumber } = calculateValues(betAmount)

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBetAmountChange(e.target.value)
  }

  // Get bet type display name
  const getBetTypeDisplayName = (betType: any): string => {
    if (!betType) return "Chưa chọn"
    return betType.name || betType.id
  }

  // Handle quick select
  const handleQuickSelect = (value: number) => {
    onBetAmountChange(value.toString())
  }

  return (
    <div className="space-y-4">
      {/* Bet Type Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isPointBased ? (
                <Coins className="h-4 w-4 text-orange-500" />
              ) : (
                <DollarSign className="h-4 w-4 text-green-500" />
              )}
              <span className="font-medium">{getBetTypeDisplayName(currentBetType)}</span>
            </div>
            <Badge variant="outline">Tỉ lệ: 1:{multiplier}</Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            {isPointBased ? (
              <div className="space-y-1">
                <p>• Cách chơi: Nhập số điểm muốn đánh cho MỖI SỐ</p>
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-orange-500" />
                  <p className="text-orange-600 font-medium">Chi phí: 1 điểm = {COST_PER_POINT.toLocaleString()}đ</p>
                </div>
                <p>• Thắng: điểm/số × {multiplier} × số lần trúng × 1,000đ</p>
              </div>
            ) : (
              <div>
                <p>• Cách chơi: Nhập số tiền muốn đánh</p>
                <p>• Thắng: tiền × {multiplier}</p>
                {currentBetType && currentBetType.id.includes("xien") && <p>• Xiên: Phải trúng tất cả số</p>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Input Section */}
      <div className="space-y-2">
        <Label htmlFor="bet-amount">
          {isPointBased ? "Số điểm/số" : "Số tiền"} ({selectedNumbers.length} số)
        </Label>
        <Input
          id="bet-amount"
          type="number"
          placeholder={isPointBased ? "Nhập số điểm mỗi số..." : "Nhập số tiền..."}
          value={betAmount}
          onChange={handleInputChange}
          min="1"
          step={isPointBased ? "1" : "1000"}
          className="text-lg p-3"
        />
      </div>

      {/* Calculation Display */}
      {totalCost > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Tính toán chi tiết</span>
            </div>

            <div className="space-y-3 text-sm">
              {isPointBased ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Điểm/số:</span>
                        <span className="font-medium text-orange-600">{pointsPerNumber} điểm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Số lượng số:</span>
                        <span className="font-medium">{selectedNumbers.length} số</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Chi phí mỗi điểm:</span>
                        <span className="font-medium">{COST_PER_POINT.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tỉ lệ thắng:</span>
                        <span className="font-medium">1:{multiplier}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tổng chi phí:</span>
                      <span className="font-bold text-red-600 text-lg">{totalCost.toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-muted-foreground">Thắng tối đa:</span>
                      <span className="font-bold text-green-600 text-lg">{potentialWinnings.toLocaleString()}đ</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-md">
                    <div className="text-xs text-blue-700 space-y-1">
                      <p className="font-medium">Công thức tính thắng:</p>
                      <p>
                        Điểm/số ({pointsPerNumber}) × Tỉ lệ ({multiplier}) × Số lần trúng × 1,000đ
                      </p>
                      <p className="text-blue-600">
                        * Ví dụ: Nếu 1 số trúng 2 lần = {pointsPerNumber} × {multiplier} × 2 × 1,000 ={" "}
                        {(pointsPerNumber * multiplier * 2 * 1000).toLocaleString()}đ
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Số tiền đánh:</span>
                    <span className="font-medium text-blue-600">{totalCost.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thắng được:</span>
                    <span className="font-medium text-green-600">{potentialWinnings.toLocaleString()}đ</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Amount Buttons for Points */}
      {isPointBased && (
        <div className="space-y-2">
          <Label>Chọn nhanh (điểm/số)</Label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 5, 10, 20].map((points) => (
              <Button
                key={points}
                type="button"
                variant="outline"
                onClick={() => handleQuickSelect(points)}
                className="flex flex-col h-auto py-2"
              >
                <span>{points} điểm</span>
                <span className="text-xs text-muted-foreground">
                  {(points * selectedNumbers.length * COST_PER_POINT || 0).toLocaleString()}đ
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Amount Buttons for Money */}
      {!isPointBased && (
        <div className="space-y-2">
          <Label>Chọn nhanh (VND)</Label>
          <div className="grid grid-cols-4 gap-2">
            {[1000, 5000, 10000, 50000].map((amount) => (
              <Button key={amount} type="button" variant="outline" onClick={() => handleQuickSelect(amount)}>
                {amount.toLocaleString()}đ
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Balance Check */}
      {balance !== null && totalCost > 0 && (
        <div className="text-sm">
          <div className="flex justify-between">
            <span>Số dư hiện tại:</span>
            <span className="font-medium">{balance.toLocaleString()}đ</span>
          </div>
          {totalCost > balance && <p className="text-red-500 text-xs mt-1">⚠️ Số dư không đủ để đặt cược</p>}
        </div>
      )}
    </div>
  )
}
