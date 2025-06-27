"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Target } from "lucide-react"
import type { BetType } from "../types"

interface BetTypeSelectorProps {
  betTypes: BetType[]
  selectedBetType: string
  onBetTypeChange: (betType: string) => void
  currentBetType: BetType
}

export function BetTypeSelector({ betTypes, selectedBetType, onBetTypeChange, currentBetType }: BetTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Chọn loại cược
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {betTypes.map((betType) => (
            <Button
              key={betType.id}
              variant={selectedBetType === betType.id ? "default" : "outline"}
              onClick={() => onBetTypeChange(betType.id)}
              className="h-auto p-3 flex flex-col items-center"
            >
              <span className="font-bold">{betType.name}</span>
              <span className="text-xs text-center">{betType.description}</span>
              <span className="text-xs text-green-600">x{betType.multiplier}</span>
            </Button>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>{currentBetType.name}:</strong> {currentBetType.description} - Tỷ lệ thắng{" "}
            <strong>1:{currentBetType.multiplier}</strong> - Cược tối thiểu{" "}
            <strong>{currentBetType.min_bet.toLocaleString("vi-VN")} VNĐ</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
