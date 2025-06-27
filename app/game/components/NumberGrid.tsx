"use client"

import { Button } from "@/components/ui/button"

interface NumberGridProps {
  numbers: string[]
  selectedNumbers: string[]
  onNumberSelect: (number: string) => void
  gridCols?: string
  buttonSize?: "sm" | "md" | "lg"
}

export function NumberGrid({
  numbers,
  selectedNumbers,
  onNumberSelect,
  gridCols = "grid-cols-5 sm:grid-cols-10",
  buttonSize = "md",
}: NumberGridProps) {
  const getButtonClasses = () => {
    const baseClasses = "w-full font-bold"

    switch (buttonSize) {
      case "sm":
        return `${baseClasses} h-10 text-sm`
      case "lg":
        return `${baseClasses} h-12 text-lg`
      default:
        return `${baseClasses} h-10 text-sm`
    }
  }

  return (
    <div className={`grid ${gridCols} gap-2 mt-2`}>
      {numbers.map((num) => (
        <Button
          key={num}
          variant={selectedNumbers.includes(num) ? "default" : "outline"}
          onClick={() => onNumberSelect(num)}
          className={getButtonClasses()}
        >
          {num}
        </Button>
      ))}
    </div>
  )
}
