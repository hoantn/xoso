import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { AuthService } from "@/lib/auth"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = AuthService.verifySessionToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 })
    }

    const { sessionId, betType, numbers, amount, points = 0, potentialWin } = await request.json()

    // Validation
    if (!sessionId || !betType || !numbers || potentialWin === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: "Numbers must be a non-empty array" }, { status: 400 })
    }

    // Determine if this is a point-based bet (Lô) or money-based bet (Đề/Xiên)
    const isPointBased = betType.includes("lo") && !betType.includes("de")

    let finalAmount = amount
    let finalPoints = points
    let actualCost = 0

    if (isPointBased) {
      // For point-based betting (Lô), calculate total cost
      if (!points || points <= 0) {
        return NextResponse.json({ error: "Points required for Lô betting" }, { status: 400 })
      }
      // Cost = points × number_of_selected_numbers × 29,000 VND per point
      actualCost = points * numbers.length * 29000
      finalAmount = actualCost // Store the actual cost in amount field
      finalPoints = points
    } else {
      // For money-based betting (Đề/Xiên)
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: "Amount required for Đề/Xiên betting" }, { status: 400 })
      }
      actualCost = amount
      finalAmount = amount
      finalPoints = 0
    }

    console.log(`[PLACE_BET] User ${user.id} placing bet:`, {
      sessionId,
      betType,
      numbers,
      finalAmount,
      finalPoints,
      actualCost,
      isPointBased,
    })

    // Check if session is open for betting
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      console.error("[PLACE_BET] Session not found:", sessionError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.status !== "open") {
      return NextResponse.json({ error: "Session is not open for betting" }, { status: 400 })
    }

    // Check if betting is still allowed (before end time)
    const now = new Date()
    const endTime = new Date(session.end_time)
    if (now >= endTime) {
      return NextResponse.json({ error: "Betting time has ended for this session" }, { status: 400 })
    }

    // Use the database function to place the bet
    const { data: result, error: betError } = await supabaseAdmin.rpc("place_bet_transaction_with_points", {
      p_user_id: user.id,
      p_session_id: sessionId,
      p_bet_type: betType,
      p_numbers: numbers,
      p_amount: finalAmount,
      p_points: finalPoints,
      p_potential_win: potentialWin, // 🆕 gửi xuống DB
    })

    if (betError) {
      console.error("[PLACE_BET] Database error:", betError)
      return NextResponse.json(
        {
          error: "Failed to place bet",
          details: betError.message,
        },
        { status: 500 },
      )
    }

    console.log(`[PLACE_BET] Bet placed successfully:`, result)

    return NextResponse.json({
      success: true,
      message: isPointBased
        ? `Đặt cược thành công: ${finalPoints} điểm (${actualCost.toLocaleString()}đ)`
        : `Đặt cược thành công: ${finalAmount.toLocaleString()}đ`,
      bet: result,
      cost_breakdown: {
        is_point_based: isPointBased,
        points: finalPoints,
        cost_per_point: isPointBased ? 29000 : 0,
        total_cost: actualCost,
        numbers_count: numbers.length,
      },
      session: {
        id: session.id,
        session_number: session.session_number,
        end_time: session.end_time,
      },
    })
  } catch (error: any) {
    console.error("[PLACE_BET] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = AuthService.verifySessionToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 })
    }

    // Get user's recent bets
    const { data: bets, error } = await supabase
      .from("user_bets")
      .select(`
        *,
        game_sessions (
          session_number,
          game_mode,
          status,
          start_time,
          end_time
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("[GET_BETS] Database error:", error)
      return NextResponse.json({ error: "Failed to fetch bets" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      bets: bets || [],
    })
  } catch (error: any) {
    console.error("[GET_BETS] Unexpected error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
