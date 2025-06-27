// Format countdown time
export const formatCountdown = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
}

// Get next draw time for traditional lottery (18:15 daily)
export const getNextDrawTime = (): Date => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 15, 0)

  if (now > today) {
    // If past today's draw time, get tomorrow's draw
    today.setDate(today.getDate() + 1)
  }

  return today
}

// Generate number arrays
export const generateTwoDigitNumbers = (): string[] => {
  return Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, "0"))
}

export const generateSingleDigitNumbers = (): string[] => {
  return Array.from({ length: 10 }, (_, i) => i.toString())
}

export const generateDoubleNumbers = (): string[] => {
  return Array.from({ length: 10 }, (_, i) => i.toString() + i.toString())
}

// Validate bet selection with proper validation for each bet type
export const validateBetSelection = (
  betType: string,
  selectedNumbers: string[],
  requiredCount?: number,
): { isValid: boolean; message?: string } => {
  if (selectedNumbers.length === 0) {
    return { isValid: false, message: "Vui lòng chọn ít nhất một số." }
  }

  // Validation for XIÊN types
  if (betType.includes("xien")) {
    const expectedCount =
      betType.includes("xien_4") || betType.includes("xien4")
        ? 4
        : betType.includes("xien_3") || betType.includes("xien3")
          ? 3
          : 2

    if (selectedNumbers.length !== expectedCount) {
      return {
        isValid: false,
        message: `Xiên ${expectedCount} cần chọn đúng ${expectedCount} số khác nhau.`,
      }
    }

    // Check for duplicates in XIÊN
    const uniqueNumbers = new Set(selectedNumbers)
    if (uniqueNumbers.size !== selectedNumbers.length) {
      return {
        isValid: false,
        message: `Xiên không được chọn số trùng lặp.`,
      }
    }
  }

  // For other bet types, allow multiple numbers (max 10)
  if (selectedNumbers.length > 10) {
    return {
      isValid: false,
      message: "Tối đa 10 số cho mỗi lần cược.",
    }
  }

  return { isValid: true }
}

// CORRECTED: Calculate actual bet amount per number
export const calculateActualBetAmount = (
  betType: { calculation_method?: string; point_value?: number },
  inputAmount: number,
): number => {
  if (betType.calculation_method === "point" && betType.point_value) {
    // LÔ: Tiền cược thực tế cho 1 số = số điểm × 29.000đ
    return inputAmount * betType.point_value
  }
  // ĐỀ & XIÊN: Tiền cược thực tế cho 1 số = số tiền nhập
  return inputAmount
}

// CORRECTED: Calculate potential win per number
export const calculatePotentialWinPerNumber = (
  betType: { calculation_method?: string; multiplier: number },
  inputAmount: number,
): number => {
  if (betType.calculation_method === "point") {
    // LÔ: Tiền thưởng cho 1 số = số điểm × multiplier × 1000 (để chuyển từ nghìn đồng)
    // VÍ DỤ: 10 điểm × 99 × 1000 = 990.000đ
    return inputAmount * betType.multiplier * 1000
  } else {
    // ĐỀ & XIÊN: Tiền thưởng cho 1 số = số tiền × multiplier
    return inputAmount * betType.multiplier
  }
}

// Calculate total cost for all selected numbers
export const calculateTotalCost = (
  betType: { calculation_method?: string; point_value?: number },
  inputAmount: number,
  numbersCount: number,
): number => {
  const costPerNumber = calculateActualBetAmount(betType, inputAmount)
  return costPerNumber * numbersCount
}

// Calculate total potential win (if all numbers win)
export const calculateTotalPotentialWin = (
  betType: { calculation_method?: string; multiplier: number },
  inputAmount: number,
  numbersCount: number,
): number => {
  const winPerNumber = calculatePotentialWinPerNumber(betType, inputAmount)
  return winPerNumber * numbersCount
}

// Calculate net profit (winnings - bet cost)
export const calculateNetProfit = (
  betType: { calculation_method?: string; point_value?: number; multiplier: number },
  inputAmount: number,
  numbersCount: number,
): number => {
  const totalCost = calculateTotalCost(betType, inputAmount, numbersCount)
  const totalWin = calculateTotalPotentialWin(betType, inputAmount, numbersCount)
  return totalWin - totalCost
}

// Format bet amount display
export const formatBetAmountDisplay = (
  betType: { calculation_method?: string; point_value?: number },
  inputAmount: number,
): string => {
  if (betType.calculation_method === "point") {
    const actualAmount = calculateActualBetAmount(betType, inputAmount)
    return `${inputAmount} điểm (${actualAmount.toLocaleString("vi-VN")}đ/số)`
  }
  return `${inputAmount.toLocaleString("vi-VN")}đ/số`
}

// Validate bet amount based on bet type
export const validateBetAmount = (
  betType: { calculation_method?: string; point_value?: number; min_bet: number },
  inputAmount: number,
): { isValid: boolean; message?: string } => {
  if (inputAmount <= 0) {
    return { isValid: false, message: "Số tiền cược phải lớn hơn 0." }
  }

  if (betType.calculation_method === "point") {
    // For point-based betting, check minimum points
    if (inputAmount < betType.min_bet) {
      return {
        isValid: false,
        message: `Cược tối thiểu ${betType.min_bet} điểm.`,
      }
    }
  } else {
    // For direct money betting
    if (inputAmount < betType.min_bet) {
      return {
        isValid: false,
        message: `Cược tối thiểu ${betType.min_bet.toLocaleString("vi-VN")}đ.`,
      }
    }
  }

  return { isValid: true }
}

// CORRECTED: Detailed calculation breakdown
export const getCalculationBreakdown = (
  betType: {
    calculation_method?: string
    multiplier: number
    point_value?: number
    name: string
  },
  inputAmount: number,
  numbersCount: number,
) => {
  if (betType.calculation_method === "point" && betType.point_value) {
    // LOGIC LÔ - CORRECTED
    const costPerNumber = inputAmount * betType.point_value // VD: 10 điểm × 29.000đ = 290.000đ
    const totalCost = costPerNumber * numbersCount // VD: 290.000đ × 1 số = 290.000đ
    const winPerNumber = inputAmount * betType.multiplier * 1000 // VD: 10 điểm × 99 × 1000 = 990.000đ
    const totalWin = winPerNumber * numbersCount // VD: 990.000đ × 1 số = 990.000đ
    const netProfit = totalWin - totalCost // VD: 990.000đ - 290.000đ = 700.000đ

    return {
      inputDisplay: `${inputAmount} điểm`,
      costPerNumberDisplay: `${costPerNumber.toLocaleString("vi-VN")}đ/số`,
      totalCostDisplay: `${totalCost.toLocaleString("vi-VN")}đ`,
      winPerNumberDisplay: `${winPerNumber.toLocaleString("vi-VN")}đ/số`,
      totalWinDisplay: `${totalWin.toLocaleString("vi-VN")}đ`,
      netProfitDisplay: `${netProfit.toLocaleString("vi-VN")}đ`,
      calculationSteps: [
        `Tiền cược: ${inputAmount} điểm × ${betType.point_value.toLocaleString("vi-VN")}đ = ${costPerNumber.toLocaleString("vi-VN")}đ/số`,
        `Tổng cược: ${costPerNumber.toLocaleString("vi-VN")}đ × ${numbersCount} số = ${totalCost.toLocaleString("vi-VN")}đ`,
        `Thưởng/số: ${inputAmount} điểm × ${betType.multiplier} × 1.000đ = ${winPerNumber.toLocaleString("vi-VN")}đ`,
        `Tổng thưởng: ${winPerNumber.toLocaleString("vi-VN")}đ × ${numbersCount} số = ${totalWin.toLocaleString("vi-VN")}đ`,
        `Lời thực tế: ${totalWin.toLocaleString("vi-VN")}đ - ${totalCost.toLocaleString("vi-VN")}đ = ${netProfit.toLocaleString("vi-VN")}đ`,
      ],
    }
  } else {
    // LOGIC ĐỀ & XIÊN - CORRECTED
    const costPerNumber = inputAmount
    const totalCost = costPerNumber * numbersCount
    const winPerNumber = inputAmount * betType.multiplier
    const totalWin = winPerNumber * numbersCount
    const netProfit = totalWin - totalCost

    return {
      inputDisplay: `${inputAmount.toLocaleString("vi-VN")}đ`,
      costPerNumberDisplay: `${costPerNumber.toLocaleString("vi-VN")}đ/số`,
      totalCostDisplay: `${totalCost.toLocaleString("vi-VN")}đ`,
      winPerNumberDisplay: `${winPerNumber.toLocaleString("vi-VN")}đ/số`,
      totalWinDisplay: `${totalWin.toLocaleString("vi-VN")}đ`,
      netProfitDisplay: `${netProfit.toLocaleString("vi-VN")}đ`,
      calculationSteps: [
        `Tiền cược: ${inputAmount.toLocaleString("vi-VN")}đ/số`,
        `Tổng cược: ${costPerNumber.toLocaleString("vi-VN")}đ × ${numbersCount} số = ${totalCost.toLocaleString("vi-VN")}đ`,
        `Thưởng/số: ${inputAmount.toLocaleString("vi-VN")}đ × ${betType.multiplier} = ${winPerNumber.toLocaleString("vi-VN")}đ`,
        `Tổng thưởng: ${winPerNumber.toLocaleString("vi-VN")}đ × ${numbersCount} số = ${totalWin.toLocaleString("vi-VN")}đ`,
        `Lời thực tế: ${totalWin.toLocaleString("vi-VN")}đ - ${totalCost.toLocaleString("vi-VN")}đ = ${netProfit.toLocaleString("vi-VN")}đ`,
      ],
    }
  }
}
