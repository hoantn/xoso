import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth"

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const user = AuthService.verifySessionToken(token)
    return user
  }
  return null
}

function createDetailedBettingDescription(
  betType: string,
  numbers: string[],
  points: number,
  totalCost: number,
  sessionNumber: string,
): string {
  const costPerNumber = points * 29000 // 29,000 VND per point
  const betTypeDisplay = getBetTypeDisplay(betType)
  const numbersText = numbers.join(", ")

  return `🎯 ${betTypeDisplay}: ${numbersText} | ${points} điểm/số (${costPerNumber.toLocaleString()}đ/số) | ${numbers.length} số | Tổng: ${totalCost.toLocaleString()}đ | Phiên: ${sessionNumber}`
}

function getBetTypeDisplay(betType: string): string {
  const typeMap: { [key: string]: string } = {
    lo_2_so_1p: "Lô 2 Số 1p",
    lo_2_so_5p: "Lô 2 Số 5p",
    lo_2_so_30p: "Lô 2 Số 30p",
    lo_3_so_1p: "Lô 3 Số 1p",
    de_dac_biet_1p: "Đề Đặc Biệt 1p",
    de_dac_biet_5p: "Đề Đặc Biệt 5p",
    de_dac_biet_30p: "Đề Đặc Biệt 30p",
    xien_2_1p: "Xiên 2 - 1p",
    xien_3_1p: "Xiên 3 - 1p",
    xien_4_1p: "Xiên 4 - 1p",
    nhat_to_1p: "Nhất Tố 1p",
    de_dau_duoi_1p: "Đề Đầu Đuôi 1p",
  }
  return typeMap[betType] || betType
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`[PLACE_BET_POST] START - User: ${user.username} (ID: ${user.id})`)

    const body = await request.json()
    const { sessionId, betType, numbers, amount, points, potentialWin } = body

    console.log(`[PLACE_BET_POST] Request body:`, { sessionId, betType, numbers, amount, points, potentialWin })

    // Validate input
    if (!sessionId || !betType || !numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate numbers format
    for (const num of numbers) {
      if (!/^\d+$/.test(num)) {
        return NextResponse.json({ error: `Invalid number format: ${num}` }, { status: 400 })
      }
    }

    // For point-based bets, validate points
    const isPointBased = betType.includes("lo") && !betType.includes("de")
    if (isPointBased && (!points || points <= 0)) {
      return NextResponse.json({ error: "Points required for point-based bets" }, { status: 400 })
    }

    // For amount-based bets, validate amount
    if (!isPointBased && (!amount || amount <= 0)) {
      return NextResponse.json({ error: "Amount required for amount-based bets" }, { status: 400 })
    }

    // Get session info
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      console.error("[PLACE_BET_POST] Session error:", sessionError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check if session is still open for betting
    if (session.status !== "open") {
      return NextResponse.json({ error: "Session is not open for betting" }, { status: 400 })
    }

    // Check betting deadline (25 minutes after session start)
    const now = new Date()
    const sessionStart = new Date(session.start_time)
    const bettingDeadline = new Date(sessionStart.getTime() + 25 * 60 * 1000)

    if (now > bettingDeadline) {
      return NextResponse.json({ error: "Betting time has expired for this session" }, { status: 400 })
    }

    // Calculate total cost
    let totalCost: number
    if (isPointBased) {
      totalCost = points * 29000 * numbers.length // 29,000 VND per point per number
    } else {
      totalCost = amount
    }

    if (totalCost <= 0) {
      return NextResponse.json({ error: "Invalid bet amount" }, { status: 400 })
    }

    // Check user balance
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("balance")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      console.error("[PLACE_BET_POST] User error:", userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (userData.balance < totalCost) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          required: totalCost,
          available: userData.balance,
        },
        { status: 400 },
      )
    }

    // Create detailed description
    const detailedDescription = isPointBased
      ? createDetailedBettingDescription(betType, numbers, points, totalCost, session.session_number)
      : `🎯 ${getBetTypeDisplay(betType)}: ${numbers.join(", ")} | ${totalCost.toLocaleString()}đ | Phiên: ${session.session_number}`

    console.log(`[PLACE_BET_POST] Calling place_bet_with_transaction with:`, {
      p_user_id: user.id,
      p_session_id: sessionId,
      p_bet_type: betType,
      p_numbers: numbers,
      p_points: isPointBased ? points : null,
      p_amount: totalCost,
      p_potential_win: potentialWin || 0,
      p_description: detailedDescription,
    })

    // Call the database function
    const { data: result, error: betError } = await supabase.rpc("place_bet_with_transaction", {
      p_user_id: user.id,
      p_session_id: sessionId,
      p_bet_type: betType,
      p_numbers: numbers,
      p_points: isPointBased ? points : null,
      p_amount: totalCost,
      p_potential_win: potentialWin || 0,
      p_description: detailedDescription,
    })

    if (betError) {
      console.error("[PLACE_BET_POST] Database error:", betError)
      return NextResponse.json(
        {
          error: "Failed to place bet",
          details: betError.message,
        },
        { status: 500 },
      )
    }

    console.log(`[PLACE_BET_POST] SUCCESS - Bet placed: ${result}`)

    return NextResponse.json({
      success: true,
      message: "Bet placed successfully",
      betId: result,
      totalCost,
      description: detailedDescription,
    })
  } catch (error) {
    console.error(`[PLACE_BET_POST] CATCH ERROR:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
