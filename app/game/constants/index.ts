// Bet Categories (chung cho cả 2 loại)
export const BET_CATEGORIES = [
  {
    id: "lo",
    name: "LÔ",
    description: "Đoán 2 số cuối của giải",
  },
  {
    id: "de",
    name: "ĐỀ",
    description: "Đoán số trúng giải đặc biệt",
  },
]

// Traditional Lottery Bet Types (Miền Bắc) - REMOVED LO_KEP
export const LO_BET_TYPES = [
  {
    id: "lo",
    name: "Lô 2 số",
    category: "lo",
    multiplier: 99,
    min_bet: 1, // Minimum 1 point
    calculation_method: "point",
    point_value: 29000,
    description: "Đoán 2 số cuối của bất kỳ giải nào. Nếu số xuất hiện nhiều lần sẽ nhân theo số lần.",
  },
  {
    id: "lo_3_so",
    name: "Lô 3 số",
    category: "lo",
    multiplier: 900,
    min_bet: 1, // Minimum 1 point
    calculation_method: "point",
    point_value: 29000,
    description: "Đoán 3 số cuối của bất kỳ giải nào. Nếu số xuất hiện nhiều lần sẽ nhân theo số lần.",
  },
  // REMOVED: lo_kep
]

export const DE_BET_TYPES = [
  {
    id: "de",
    name: "Đề đặc biệt 2 số",
    category: "de",
    multiplier: 99,
    min_bet: 1000, // Minimum 1,000 VND
    calculation_method: "money",
    description: "Đoán 2 số cuối của giải đặc biệt",
  },
  {
    id: "nhat_to",
    name: "Nhất To",
    category: "de",
    multiplier: 99,
    min_bet: 1000, // Minimum 1,000 VND
    calculation_method: "money",
    description: "Đoán 2 số cuối của giải nhất",
  },
  {
    id: "de_dau_duoi",
    name: "Đề đầu đuôi",
    category: "de",
    multiplier: 9,
    min_bet: 1000, // Minimum 1,000 VND
    calculation_method: "money",
    description: "Đoán số đầu (số thứ 4) hoặc số đuôi (số thứ 5) của giải đặc biệt. Chọn từ 1-10 số khác nhau từ 0-9.",
    number_type: "single_digit", // Special flag for UI
  },
  {
    id: "de_3_cang",
    name: "Đề 3 càng",
    category: "de",
    multiplier: 900,
    min_bet: 1000, // Minimum 1,000 VND
    calculation_method: "money",
    description: "Đoán 3 số cuối của giải đặc biệt",
  },
]

export const XIEN_BET_TYPES = [
  {
    id: "xien2",
    name: "Xiên 2",
    category: "lo",
    multiplier: 15,
    min_bet: 1000, // Minimum 1,000 VND
    calculation_method: "money",
    description: "Chọn đúng 2 số khác nhau, cả 2 phải về cùng lúc",
    required_numbers: 2, // Exact number required
  },
  {
    id: "xien3",
    name: "Xiên 3",
    category: "lo",
    multiplier: 78,
    min_bet: 1000, // Minimum 1,000 VND
    calculation_method: "money",
    description: "Chọn đúng 3 số khác nhau, cả 3 phải về cùng lúc",
    required_numbers: 3, // Exact number required
  },
]

export const TRADITIONAL_LOTTERY_BET_TYPES = [...LO_BET_TYPES, ...DE_BET_TYPES, ...XIEN_BET_TYPES]

// Fast Lottery Bet Types (Lô Đề Nhanh) - REMOVED LO_KEP
export const FAST_LOTTERY_1P_BET_TYPES = [
  {
    id: "lo_2_so_1p",
    name: "Lô 2 số (1p)",
    category: "lo",
    multiplier: 99,
    min_bet: 1,
    calculation_method: "point",
    point_value: 29000,
    description: "Đoán 2 số cuối - Kết quả 1 phút",
  },
  {
    id: "lo_3_so_1p",
    name: "Lô 3 số (1p)",
    category: "lo",
    multiplier: 900,
    min_bet: 1,
    calculation_method: "point",
    point_value: 29000,
    description: "Đoán 3 số cuối - Kết quả 1 phút",
  },
  {
    id: "de_dac_biet_1p",
    name: "Đề đặc biệt (1p)",
    category: "de",
    multiplier: 99,
    min_bet: 1000,
    calculation_method: "money",
    description: "Đoán 2 số cuối - Kết quả 1 phút",
  },
  {
    id: "nhat_to_1p",
    name: "Nhất To (1p)",
    category: "de",
    multiplier: 99,
    min_bet: 1000,
    calculation_method: "money",
    description: "Đoán 2 số cuối của giải nhất - Kết quả 1 phút",
  },
  {
    id: "de_dau_duoi_1p",
    name: "Đề đầu đuôi (1p)",
    category: "de",
    multiplier: 9,
    min_bet: 1000,
    calculation_method: "money",
    description: "Đoán số đầu hoặc số đuôi - Kết quả 1 phút",
    number_type: "single_digit",
  },
  {
    id: "xien_2_1p",
    name: "Xiên 2 (1p)",
    category: "lo",
    multiplier: 15,
    min_bet: 1000,
    calculation_method: "money",
    description: "Chọn đúng 2 số khác nhau - Kết quả 1 phút",
    required_numbers: 2,
  },
  {
    id: "xien_3_1p",
    name: "Xiên 3 (1p)",
    category: "lo",
    multiplier: 78,
    min_bet: 1000,
    calculation_method: "money",
    description: "Chọn đúng 3 số khác nhau - Kết quả 1 phút",
    required_numbers: 3,
  },
  {
    id: "xien_4_1p",
    name: "Xiên 4 (1p)",
    category: "lo",
    multiplier: 300,
    min_bet: 1000,
    calculation_method: "money",
    description: "Chọn đúng 4 số khác nhau - Kết quả 1 phút",
    required_numbers: 4,
  },
]

// Fast Lottery 5P Bet Types
export const FAST_LOTTERY_5P_BET_TYPES = [
  {
    id: "lo_2_so_5p",
    name: "Lô 2 số (5p)",
    category: "lo",
    multiplier: 99,
    min_bet: 1,
    calculation_method: "point",
    point_value: 29000,
    description: "Đoán 2 số cuối - Kết quả 5 phút",
  },
  {
    id: "lo_3_so_5p",
    name: "Lô 3 số (5p)",
    category: "lo",
    multiplier: 900,
    min_bet: 1,
    calculation_method: "point",
    point_value: 29000,
    description: "Đoán 3 số cuối - Kết quả 5 phút",
  },
  {
    id: "de_dac_biet_5p",
    name: "Đề đặc biệt (5p)",
    category: "de",
    multiplier: 99,
    min_bet: 1000,
    calculation_method: "money",
    description: "Đoán 2 số cuối - Kết quả 5 phút",
  },
  {
    id: "nhat_to_5p",
    name: "Nhất To (5p)",
    category: "de",
    multiplier: 99,
    min_bet: 1000,
    calculation_method: "money",
    description: "Đoán 2 số cuối của giải nhất - Kết quả 5 phút",
  },
  {
    id: "de_dau_duoi_5p",
    name: "Đề đầu đuôi (5p)",
    category: "de",
    multiplier: 9,
    min_bet: 1000,
    calculation_method: "money",
    description: "Đoán số đầu hoặc số đuôi - Kết quả 5 phút",
    number_type: "single_digit",
  },
  {
    id: "xien_2_5p",
    name: "Xiên 2 (5p)",
    category: "lo",
    multiplier: 15,
    min_bet: 1000,
    calculation_method: "money",
    description: "Chọn đúng 2 số khác nhau - Kết quả 5 phút",
    required_numbers: 2,
  },
  {
    id: "xien_3_5p",
    name: "Xiên 3 (5p)",
    category: "lo",
    multiplier: 78,
    min_bet: 1000,
    calculation_method: "money",
    description: "Chọn đúng 3 số khác nhau - Kết quả 5 phút",
    required_numbers: 3,
  },
  {
    id: "xien_4_5p",
    name: "Xiên 4 (5p)",
    category: "lo",
    multiplier: 300,
    min_bet: 1000,
    calculation_method: "money",
    description: "Chọn đúng 4 số khác nhau - Kết quả 5 phút",
    required_numbers: 4,
  },
]

// Fast Lottery 30P Bet Types
export const FAST_LOTTERY_30P_BET_TYPES = [
  {
    id: "lo_2_so_30p",
    name: "Lô 2 số (30p)",
    category: "lo",
    multiplier: 99,
    min_bet: 1,
    calculation_method: "point",
    point_value: 29000,
    description: "Đoán 2 số cuối - Kết quả 30 phút",
  },
  {
    id: "lo_3_so_30p",
    name: "Lô 3 số (30p)",
    category: "lo",
    multiplier: 900,
    min_bet: 1,
    calculation_method: "point",
    point_value: 29000,
    description: "Đoán 3 số cuối - Kết quả 30 phút",
  },
  {
    id: "de_dac_biet_30p",
    name: "Đề đặc biệt (30p)",
    category: "de",
    multiplier: 99,
    min_bet: 1000,
    calculation_method: "money",
    description: "Đoán 2 số cuối - Kết quả 30 phút",
  },
  {
    id: "nhat_to_30p",
    name: "Nhất To (30p)",
    category: "de",
    multiplier: 99,
    min_bet: 1000,
    calculation_method: "money",
    description: "Đoán 2 số cuối của giải nhất - Kết quả 30 phút",
  },
  {
    id: "de_dau_duoi_30p",
    name: "Đề đầu đuôi (30p)",
    category: "de",
    multiplier: 9,
    min_bet: 1000,
    calculation_method: "money",
    description: "Đoán số đầu hoặc số đuôi - Kết quả 30 phút",
    number_type: "single_digit",
  },
  {
    id: "xien_2_30p",
    name: "Xiên 2 (30p)",
    category: "lo",
    multiplier: 15,
    min_bet: 1000,
    calculation_method: "money",
    description: "Chọn đúng 2 số khác nhau - Kết quả 30 phút",
    required_numbers: 2,
  },
  {
    id: "xien_3_30p",
    name: "Xiên 3 (30p)",
    category: "lo",
    multiplier: 78,
    min_bet: 1000,
    calculation_method: "money",
    description: "Chọn đúng 3 số khác nhau - Kết quả 30 phút",
    required_numbers: 3,
  },
  {
    id: "xien_4_30p",
    name: "Xiên 4 (30p)",
    category: "lo",
    multiplier: 300,
    min_bet: 1000,
    calculation_method: "money",
    description: "Chọn đúng 4 số khác nhau - Kết quả 30 phút",
    required_numbers: 4,
  },
]

// Helper function to get bet types by mode
export function getBetTypesByMode(mode: "1p" | "5p" | "30p") {
  switch (mode) {
    case "1p":
      return FAST_LOTTERY_1P_BET_TYPES
    case "5p":
      return FAST_LOTTERY_5P_BET_TYPES
    case "30p":
      return FAST_LOTTERY_30P_BET_TYPES
    default:
      return FAST_LOTTERY_1P_BET_TYPES
  }
}

// Keep the old FAST_LOTTERY_BET_TYPES for backward compatibility (use 1p as default)
export const FAST_LOTTERY_BET_TYPES = FAST_LOTTERY_1P_BET_TYPES

// Fast Lottery Modes
export const FAST_LOTTERY_MODES = [
  {
    id: "1p",
    name: "1 phút",
    description: "Quay số mỗi 1 phút",
    interval_minutes: 1,
  },
  {
    id: "5p",
    name: "5 phút",
    description: "Quay số mỗi 5 phút",
    interval_minutes: 5,
  },
  {
    id: "30p",
    name: "30 phút",
    description: "Quay số mỗi 30 phút",
    interval_minutes: 30,
  },
]

// Quick bet amounts
export const QUICK_BET_AMOUNTS_POINT = [1, 2, 5, 10, 20, 50]
export const QUICK_BET_AMOUNTS_MONEY = [10000, 20000, 50000, 100000, 200000, 500000]
