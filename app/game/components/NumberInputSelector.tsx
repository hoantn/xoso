"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Shuffle, Info } from "lucide-react"
import { validateNumberFormat, getRequiredNumbersForBetType } from "../utils/validation"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface NumberInputSelectorProps {
  selectedNumbers: string[]
  onNumbersChange: (numbers: string[]) => void
  maxNumbers: number
  numberLength: 1 | 2 | 3
  allowDuplicates?: boolean
  betType: string
}

export function NumberInputSelector({
  selectedNumbers,
  onNumbersChange,
  maxNumbers,
  numberLength,
  allowDuplicates = false,
  betType,
}: NumberInputSelectorProps) {
  const [inputValue, setInputValue] = useState(selectedNumbers.join(", "))
  const [randomCount, setRandomCount] = useState<string>("1")
  const { toast } = useToast()
  const isTypingRef = useRef(false)

  const requiredNumbers = getRequiredNumbersForBetType(betType)
  const isXienType = betType.includes("xien")
  const isDauDuoiType = betType.includes("dau_duoi")

  // Sync inputValue when selectedNumbers changes externally
  useEffect(() => {
    if (!isTypingRef.current) {
      setInputValue(selectedNumbers.join(", "))
    }
  }, [selectedNumbers])

  // Update random count default based on bet type
  useEffect(() => {
    if (requiredNumbers !== null) {
      setRandomCount(String(requiredNumbers))
    } else if (isDauDuoiType) {
      setRandomCount("5") // Default 5 numbers for dau_duoi
    }
  }, [requiredNumbers, isDauDuoiType])

  // Parse input string into array of number strings
  const parseInput = (input: string): string[] => {
    const rawNumbers = input
      .split(/[,.\s]+/) // Split by comma, dot, or space
      .map((s) => s.trim())
      .filter((s) => s !== "")
    return rawNumbers
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true
    const value = e.target.value
    setInputValue(value)

    // Parse numbers from input
    const parsedNumbers = parseInput(value)

    // Format numbers to correct length (pad with zeros)
    const formattedNumbers = parsedNumbers.map((num) => {
      if (numberLength === 1) return num.slice(-1) // Take last digit
      if (numberLength === 2) return num.padStart(2, "0").slice(-2) // Pad to 2 digits
      if (numberLength === 3) return num.padStart(3, "0").slice(-3) // Pad to 3 digits
      return num
    })

    // Apply filtering based on bet type requirements
    const filteredNumbers: string[] = []
    const seenNumbers = new Set<string>()

    for (const num of formattedNumbers) {
      // Skip if duplicates not allowed and already seen
      if (!allowDuplicates && seenNumbers.has(num)) {
        continue
      }

      // For exact number requirements, stop at the limit
      if (requiredNumbers !== null && filteredNumbers.length >= requiredNumbers) {
        break
      }

      // For flexible types, stop at max numbers
      if (requiredNumbers === null && filteredNumbers.length >= maxNumbers) {
        break
      }

      filteredNumbers.push(num)
      seenNumbers.add(num)
    }

    onNumbersChange(filteredNumbers)
  }

  const handleInputBlur = () => {
    isTypingRef.current = false

    // Validate format when user stops typing
    const validation = validateNumberFormat(betType, selectedNumbers)
    if (!validation.isValid && selectedNumbers.length > 0) {
      toast({
        title: "Lỗi định dạng số",
        description: validation.message,
        variant: "destructive",
      })
    }

    // Re-sync inputValue with selectedNumbers to clean up
    setInputValue(selectedNumbers.join(", "))
  }

  const generateRandomNumbers = () => {
    const count = Number.parseInt(randomCount)
    if (isNaN(count) || count <= 0) {
      toast({
        title: "Lỗi số lượng",
        description: "Vui lòng nhập số lượng số ngẫu nhiên hợp lệ (lớn hơn 0).",
        variant: "destructive",
      })
      return
    }

    // Validate count based on bet type
    if (requiredNumbers !== null && count !== requiredNumbers) {
      toast({
        title: "Lỗi số lượng",
        description: `${isXienType ? "Xiên" : "Đề đầu đuôi"} cần chọn đúng ${requiredNumbers} số.`,
        variant: "destructive",
      })
      return
    }

    if (count > maxNumbers) {
      toast({
        title: "Giới hạn số lượng",
        description: `Chỉ có thể chọn tối đa ${maxNumbers} số ngẫu nhiên.`,
        variant: "destructive",
      })
      return
    }

    // Generate all possible numbers based on length
    const allPossibleNumbers: string[] = []
    if (numberLength === 1) {
      for (let i = 0; i <= 9; i++) {
        allPossibleNumbers.push(String(i))
      }
    } else if (numberLength === 2) {
      for (let i = 0; i <= 99; i++) {
        allPossibleNumbers.push(i.toString().padStart(2, "0"))
      }
    } else if (numberLength === 3) {
      for (let i = 0; i <= 999; i++) {
        allPossibleNumbers.push(i.toString().padStart(3, "0"))
      }
    }

    const shuffled = allPossibleNumbers.sort(() => 0.5 - Math.random())
    const newRandomNumbers = shuffled.slice(0, count)

    onNumbersChange(newRandomNumbers)
    toast({
      title: "Chọn số ngẫu nhiên",
      description: `Đã chọn ${count} số ngẫu nhiên.`,
      variant: "default",
    })
  }

  // Get placeholder text based on bet type
  const getPlaceholder = () => {
    if (isDauDuoiType) return "Ví dụ: 1,2,3,4,5 (từ 1-10 số từ 0-9)"
    if (numberLength === 1) return "Ví dụ: 1,2,3"
    if (numberLength === 2) return "Ví dụ: 01,23,45"
    if (numberLength === 3) return "Ví dụ: 001,234,567"
    return "Nhập số cược"
  }

  // Get instruction text based on bet type
  const getInstructionText = () => {
    if (isDauDuoiType) {
      return `Chọn từ 1-10 số khác nhau từ 0-9`
    }
    if (isXienType && requiredNumbers) {
      return `Chọn đúng ${requiredNumbers} số khác nhau`
    }
    if (requiredNumbers) {
      return `Cần chọn đúng ${requiredNumbers} số`
    }
    return `Tối đa ${maxNumbers} số`
  }

  return (
    <div className="space-y-4">
      {/* Instruction Alert */}
      {(isXienType || isDauDuoiType) && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>{getInstructionText()}</strong>
            {isDauDuoiType && (
              <div className="mt-1 text-sm">
                • Đầu: Số thứ 4 của giải đặc biệt (VD: 12345 → đầu = 4)
                <br />• Đuôi: Số thứ 5 của giải đặc biệt (VD: 12345 → đuôi = 5)
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div>
        <Label htmlFor="numbersInput">Nhập số cược ({numberLength} chữ số, phân cách bằng dấu , hoặc .)</Label>
        <Input
          id="numbersInput"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={getPlaceholder()}
          className="mt-1"
        />
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-grow">
          <Label htmlFor="randomCount">Số lượng số ngẫu nhiên</Label>
          <Input
            id="randomCount"
            type="number"
            value={randomCount}
            onChange={(e) => setRandomCount(e.target.value)}
            min="1"
            max={maxNumbers}
            placeholder="Số lượng"
            disabled={requiredNumbers !== null} // Only disable for exact number requirements (xiên)
          />
        </div>
        <Button onClick={generateRandomNumbers} className="flex-shrink-0">
          <Shuffle className="w-4 h-4 mr-2" />
          Chọn ngẫu nhiên
        </Button>
      </div>

      {selectedNumbers.length > 0 && (
        <div className="p-3 bg-green-50 rounded-md">
          <p className="text-sm text-green-800">
            Đã chọn ({selectedNumbers.length}/{requiredNumbers || maxNumbers}):{" "}
            <strong className="flex flex-wrap gap-1 mt-1">
              {selectedNumbers.map((num) => (
                <Badge key={num} variant="secondary">
                  {num}
                </Badge>
              ))}
            </strong>
          </p>

          {/* Show validation status */}
          {requiredNumbers !== null && selectedNumbers.length !== requiredNumbers && (
            <p className="text-sm text-orange-600 mt-1">⚠️ Cần chọn đúng {requiredNumbers} số để có thể đặt cược</p>
          )}
        </div>
      )}
    </div>
  )
}
