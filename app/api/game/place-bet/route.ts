import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getAuth } from "@/lib/auth"
import { getCalculationBreakdown, validateBetSelection } from "@/app/game/utils"
import { validateNumberFormat } from "@/app/game/utils/validation"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuth(request)
    console.log("Auth result:", auth) // Add logging
    if (!auth.user) {
      console.log("No user found in auth") // Add logging
      return NextResponse.json({ error: "Unauthorized - Please login first" }, { status: 401 })
    }

    const { session_id, bet_type, numbers, amount } = await request.json()

    // Validate input
    if (!session_id || !bet_type || !numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 })
    }

    // UPDATED: Bet type configs với phân biệt rõ ràng 1p, 5p, 30p
    const betTypeConfigs = {
      // TRADITIONAL LOTTERY - LÔ (giữ nguyên)
      lo: {
        multiplier: 99,
        min_bet: 1,
        point_value: 29000,
        category: "lo",
        calculation_method: "point",
        name: "Lô 2 số",
      },
      lo_2_so: {
        multiplier: 99,
        min_bet: 1,
        point_value: 29000,
        category: "lo",
        calculation_method: "point",
        name: "Lô 2 số",
      },
      lo_3_so: {
        multiplier: 900,
        min_bet: 1,
        point_value: 29000,
        category: "lo",
        calculation_method: "point",
        name: "Lô 3 số",
      },

      // TRADITIONAL LOTTERY - ĐỀ (giữ nguyên)
      de: {
        multiplier: 99,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề đặc biệt",
      },
      de_dac_biet: {
        multiplier: 99,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề đặc biệt",
      },
      nhat_to: {
        multiplier: 99,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Nhất To",
      },
      de_dau_duoi: {
        multiplier: 9,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề đầu đuôi",
      },
      de_3_cang: {
        multiplier: 900,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề 3 càng",
      },

      // TRADITIONAL LOTTERY - XIÊN (giữ nguyên)
      xien2: {
        multiplier: 15,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 2",
        required_numbers: 2,
      },
      xien3: {
        multiplier: 78,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 3",
        required_numbers: 3,
      },

      // FAST LOTTERY 1P - LÔ
      lo_2_so_1p: {
        multiplier: 99,
        min_bet: 1,
        point_value: 29000,
        category: "lo",
        calculation_method: "point",
        name: "Lô 2 số (1p)",
      },
      lo_3_so_1p: {
        multiplier: 900,
        min_bet: 1,
        point_value: 29000,
        category: "lo",
        calculation_method: "point",
        name: "Lô 3 số (1p)",
      },

      // FAST LOTTERY 1P - ĐỀ
      de_dac_biet_1p: {
        multiplier: 99,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề đặc biệt (1p)",
      },
      nhat_to_1p: {
        multiplier: 99,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Nhất To (1p)",
      },
      de_dau_duoi_1p: {
        multiplier: 9,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề đầu đuôi (1p)",
      },

      // FAST LOTTERY 1P - XIÊN
      xien_2_1p: {
        multiplier: 15,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 2 (1p)",
        required_numbers: 2,
      },
      xien_3_1p: {
        multiplier: 78,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 3 (1p)",
        required_numbers: 3,
      },
      xien_4_1p: {
        multiplier: 300,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 4 (1p)",
        required_numbers: 4,
      },

      // FAST LOTTERY 5P - LÔ
      lo_2_so_5p: {
        multiplier: 99,
        min_bet: 1,
        point_value: 29000,
        category: "lo",
        calculation_method: "point",
        name: "Lô 2 số (5p)",
      },
      lo_3_so_5p: {
        multiplier: 900,
        min_bet: 1,
        point_value: 29000,
        category: "lo",
        calculation_method: "point",
        name: "Lô 3 số (5p)",
      },

      // FAST LOTTERY 5P - ĐỀ
      de_dac_biet_5p: {
        multiplier: 99,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề đặc biệt (5p)",
      },
      nhat_to_5p: {
        multiplier: 99,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Nhất To (5p)",
      },
      de_dau_duoi_5p: {
        multiplier: 9,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề đầu đuôi (5p)",
      },

      // FAST LOTTERY 5P - XIÊN
      xien_2_5p: {
        multiplier: 15,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 2 (5p)",
        required_numbers: 2,
      },
      xien_3_5p: {
        multiplier: 78,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 3 (5p)",
        required_numbers: 3,
      },
      xien_4_5p: {
        multiplier: 300,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 4 (5p)",
        required_numbers: 4,
      },

      // FAST LOTTERY 30P - LÔ
      lo_2_so_30p: {
        multiplier: 99,
        min_bet: 1,
        point_value: 29000,
        category: "lo",
        calculation_method: "point",
        name: "Lô 2 số (30p)",
      },
      lo_3_so_30p: {
        multiplier: 900,
        min_bet: 1,
        point_value: 29000,
        category: "lo",
        calculation_method: "point",
        name: "Lô 3 số (30p)",
      },

      // FAST LOTTERY 30P - ĐỀ
      de_dac_biet_30p: {
        multiplier: 99,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề đặc biệt (30p)",
      },
      nhat_to_30p: {
        multiplier: 99,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Nhất To (30p)",
      },
      de_dau_duoi_30p: {
        multiplier: 9,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề đầu đuôi (30p)",
      },

      // FAST LOTTERY 30P - XIÊN
      xien_2_30p: {
        multiplier: 15,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 2 (30p)",
        required_numbers: 2,
      },
      xien_3_30p: {
        multiplier: 78,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 3 (30p)",
        required_numbers: 3,
      },
      xien_4_30p: {
        multiplier: 300,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 4 (30p)",
        required_numbers: 4,
      },

      // Backward compatibility - old bet types
      lo_2_so_nhanh: {
        multiplier: 99,
        min_bet: 1,
        point_value: 29000,
        category: "lo",
        calculation_method: "point",
        name: "Lô 2 số nhanh",
      },
      lo_3_so_nhanh: {
        multiplier: 900,
        min_bet: 1,
        point_value: 29000,
        category: "lo",
        calculation_method: "point",
        name: "Lô 3 số nhanh",
      },
      de_dac_biet_nhanh: {
        multiplier: 99,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề đặc biệt nhanh",
      },
      nhat_to_nhanh: {
        multiplier: 99,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Nhất To nhanh",
      },
      de_dau_duoi_nhanh: {
        multiplier: 9,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề đầu đuôi nhanh",
      },
      de_3_cang_nhanh: {
        multiplier: 900,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Đề 3 càng nhanh",
      },
      xien_2_nhanh: {
        multiplier: 15,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 2 nhanh",
        required_numbers: 2,
      },
      xien_3_nhanh: {
        multiplier: 78,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 3 nhanh",
        required_numbers: 3,
      },
      xien_4_nhanh: {
        multiplier: 300,
        min_bet: 1000,
        point_value: 1,
        category: "de",
        calculation_method: "money",
        name: "Xiên 4 nhanh",
        required_numbers: 4,
      },
    }

    const betConfig = betTypeConfigs[bet_type as keyof typeof betTypeConfigs]
    if (!betConfig) {
      return NextResponse.json({ error: "Invalid bet type" }, { status: 400 })
    }

    // ENHANCED: Validation for bet selection and number format
    const betValidation = validateBetSelection(bet_type, numbers)
    if (!betValidation.isValid) {
      return NextResponse.json({ error: betValidation.message }, { status: 400 })
    }

    const formatValidation = validateNumberFormat(bet_type, numbers)
    if (!formatValidation.isValid) {
      return NextResponse.json({ error: formatValidation.message }, { status: 400 })
    }

    // Additional validation for exact number requirements
    if (betConfig.required_numbers && numbers.length !== betConfig.required_numbers) {
      return NextResponse.json(
        {
          error: `${betConfig.name} cần chọn đúng ${betConfig.required_numbers} số.`,
        },
        { status: 400 },
      )
    }

    // Validate minimum bet
    if (amount < betConfig.min_bet) {
      const minBetDisplay =
        betConfig.calculation_method === "point"
          ? `${betConfig.min_bet} điểm`
          : `${betConfig.min_bet.toLocaleString("vi-VN")}đ`

      return NextResponse.json(
        {
          error: `Minimum bet is ${minBetDisplay}`,
        },
        { status: 400 },
      )
    }

    // Use the corrected calculation logic
    const calculation = getCalculationBreakdown(betConfig, amount, numbers.length)
    const totalCost = Number.parseInt(calculation.totalCostDisplay.replace(/[^\d]/g, ""))
    const totalWin = Number.parseInt(calculation.totalWinDisplay.replace(/[^\d]/g, ""))

    // Check user balance - CHANGED FROM user_profiles TO users
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("balance")
      .eq("id", auth.user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    if (userProfile.balance < totalCost) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Required: ${totalCost.toLocaleString("vi-VN")} VND`,
        },
        { status: 400 },
      )
    }

    // Check if session is still open
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.status !== "open") {
      return NextResponse.json({ error: "Session is not open for betting" }, { status: 400 })
    }

    // Start transaction
    const { data, error } = await supabase.rpc("place_bet_transaction", {
      p_user_id: auth.user.id,
      p_session_id: session_id,
      p_bet_type: bet_type,
      p_numbers: numbers,
      p_amount: totalCost,
      p_potential_win: totalWin,
      p_total_cost: totalCost,
    })

    if (error) {
      console.error("Place bet error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      bet_id: data.bet_id,
      potential_win: totalWin,
      total_cost: totalCost,
      net_profit: totalWin - totalCost,
      message: "Bet placed successfully",
      calculation_breakdown: calculation,
    })
  } catch (error) {
    console.error("Place bet API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
