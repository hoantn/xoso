// CORRECTED: Proper number length validation for each bet type
export const getNumberLengthForBetType = (betType: string): 1 | 2 | 3 => {
  // Single digit types - ĐỀ ĐẦU ĐUÔI
  if (betType.includes("dau_duoi")) {
    return 1
  }

  // Three digit types
  if (betType.includes("3_cang") || betType.includes("3_so")) {
    return 3
  }

  // Default: two digit types (lo, de, xien)
  return 2
}

// CORRECTED: Max numbers validation with exact requirements for XIEN
export const getMaxNumbersForBetType = (betType: string): number => {
  // XIÊN types require exact number of selections
  if (betType.includes("xien_4") || betType.includes("xien4")) return 4
  if (betType.includes("xien_3") || betType.includes("xien3")) return 3
  if (betType.includes("xien_2") || betType.includes("xien2")) return 2

  // ĐỀ ĐẦU ĐUÔI allows up to 10 numbers (CHANGED from 1 to 10)
  if (betType.includes("dau_duoi")) return 10

  // Other types allow up to 10 numbers
  return 10
}

// NEW: Get required exact number for bet type
export const getRequiredNumbersForBetType = (betType: string): number | null => {
  // XIÊN types require exact number of selections
  if (betType.includes("xien_4") || betType.includes("xien4")) return 4
  if (betType.includes("xien_3") || betType.includes("xien3")) return 3
  if (betType.includes("xien_2") || betType.includes("xien2")) return 2

  // ĐỀ ĐẦU ĐUÔI no longer requires exactly 1 number (REMOVED)
  // if (betType.includes("dau_duoi")) return 1

  // Other types don't have exact requirements
  return null
}

// CORRECTED: Validation for number format based on bet type
export const validateNumberFormat = (betType: string, numbers: string[]): { isValid: boolean; message?: string } => {
  const expectedLength = getNumberLengthForBetType(betType)

  for (const num of numbers) {
    // Check length
    if (num.length !== expectedLength) {
      return {
        isValid: false,
        message: `${betType.includes("3") ? "3 số" : betType.includes("dau_duoi") ? "1 số" : "2 số"} cần đúng ${expectedLength} chữ số.`,
      }
    }

    // Check if all characters are digits
    if (!/^\d+$/.test(num)) {
      return {
        isValid: false,
        message: "Chỉ được nhập số.",
      }
    }

    // Special validation for single digit (0-9) - ĐỀ ĐẦU ĐUÔI
    if (expectedLength === 1) {
      const digit = Number.parseInt(num)
      if (digit < 0 || digit > 9) {
        return {
          isValid: false,
          message: "Số đầu/đuôi phải từ 0-9.",
        }
      }
    }

    // Special validation for two digits (00-99)
    if (expectedLength === 2) {
      const twoDigit = Number.parseInt(num)
      if (twoDigit < 0 || twoDigit > 99) {
        return {
          isValid: false,
          message: "Số 2 chữ số phải từ 00-99.",
        }
      }
    }

    // Special validation for three digits (000-999)
    if (expectedLength === 3) {
      const threeDigit = Number.parseInt(num)
      if (threeDigit < 0 || threeDigit > 999) {
        return {
          isValid: false,
          message: "Số 3 chữ số phải từ 000-999.",
        }
      }
    }
  }

  return { isValid: true }
}

// CORRECTED: Enhanced bet selection validation with exact number requirements
export const validateBetSelection = (
  betType: string,
  selectedNumbers: string[],
): { isValid: boolean; message?: string } => {
  if (selectedNumbers.length === 0) {
    return { isValid: false, message: "Vui lòng chọn ít nhất một số." }
  }

  // Check for exact number requirements
  const requiredCount = getRequiredNumbersForBetType(betType)
  if (requiredCount !== null) {
    if (selectedNumbers.length !== requiredCount) {
      if (betType.includes("xien")) {
        const xienType =
          betType.includes("xien_4") || betType.includes("xien4")
            ? "Xiên 4"
            : betType.includes("xien_3") || betType.includes("xien3")
              ? "Xiên 3"
              : "Xiên 2"

        return {
          isValid: false,
          message: `${xienType} cần chọn đúng ${requiredCount} số khác nhau. Bạn đã chọn ${selectedNumbers.length} số.`,
        }
      }
    }

    // Check for duplicates in XIÊN types
    if (betType.includes("xien")) {
      const uniqueNumbers = new Set(selectedNumbers)
      if (uniqueNumbers.size !== selectedNumbers.length) {
        return {
          isValid: false,
          message: `Xiên không được chọn số trùng lặp.`,
        }
      }
    }
  }

  // Special validation for ĐỀ ĐẦU ĐUÔI - check for duplicates
  if (betType.includes("dau_duoi")) {
    const uniqueNumbers = new Set(selectedNumbers)
    if (uniqueNumbers.size !== selectedNumbers.length) {
      return {
        isValid: false,
        message: `Đề đầu đuôi không được chọn số trùng lặp.`,
      }
    }

    if (selectedNumbers.length > 10) {
      return {
        isValid: false,
        message: `Đề đầu đuôi tối đa 10 số khác nhau.`,
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
