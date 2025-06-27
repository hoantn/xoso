"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { BetType, BetCategory } from "../types"

interface BetTypeSelectorWithCategoriesProps {
  betTypes: BetType[]
  categories: BetCategory[]
  selectedBetType: string
  onBetTypeChange: (betType: string) => void
  currentBetType: BetType
}

export function BetTypeSelectorWithCategories({
  betTypes,
  categories,
  selectedBetType,
  onBetTypeChange,
  currentBetType,
}: BetTypeSelectorWithCategoriesProps) {
  // Get current category based on selected bet type
  const getCurrentCategory = () => {
    const betType = betTypes.find((bt) => bt.id === selectedBetType)
    return betType?.category || categories[0]?.id
  }

  const currentCategory = getCurrentCategory()

  // Handle category tab change
  const handleCategoryChange = (categoryId: string) => {
    // Find first bet type in this category
    const categoryBetTypes = betTypes.filter((bt) => bt.category === categoryId)
    if (categoryBetTypes.length > 0) {
      onBetTypeChange(categoryBetTypes[0].id)
    }
  }

  // Get bet types for current category
  const currentCategoryBetTypes = betTypes.filter((bt) => bt.category === currentCategory)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chọn loại cược</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Tabs */}
        <div className="flex gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={currentCategory === category.id ? "default" : "outline"}
              onClick={() => handleCategoryChange(category.id)}
              className="flex-1"
            >
              {category.name}
            </Button>
          ))}
        </div>

        {/* Bet Types in Current Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentCategoryBetTypes.map((betType) => (
            <Button
              key={betType.id}
              variant={selectedBetType === betType.id ? "default" : "outline"}
              onClick={() => onBetTypeChange(betType.id)}
              className="h-auto p-4 text-left justify-start"
            >
              <div className="space-y-1">
                <div className="font-medium">{betType.name}</div>
                <div className="text-xs text-gray-500">{betType.description}</div>
                <div className="flex gap-2 items-center">
                  <Badge variant="secondary" className="text-xs">
                    1 ăn {betType.multiplier}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {betType.calculation_method === "point"
                      ? `${betType.min_bet} điểm`
                      : `${betType.min_bet.toLocaleString("vi-VN")}đ`}
                  </Badge>
                </div>
              </div>
            </Button>
          ))}
        </div>

        {/* Current Selection Info */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-sm font-medium text-blue-800">Đã chọn: {currentBetType.name}</div>
          <div className="text-xs text-blue-600 mt-1">{currentBetType.description}</div>
          <div className="flex gap-2 mt-2">
            <Badge className="bg-blue-100 text-blue-800">Tỷ lệ: 1 ăn {currentBetType.multiplier}</Badge>
            <Badge className="bg-green-100 text-green-800">
              Tối thiểu:{" "}
              {currentBetType.calculation_method === "point"
                ? `${currentBetType.min_bet} điểm`
                : `${currentBetType.min_bet.toLocaleString("vi-VN")}đ`}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
