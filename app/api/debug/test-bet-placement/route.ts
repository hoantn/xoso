import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { userId, sessionId, betType, numbers, amount } = await request.json()

    console.log("[TEST_BET] Testing bet placement with:", {
      userId,
      sessionId,
      betType,
      numbers,
      amount,
    })

    // 1. Kiểm tra user tồn tại và có balance
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, username, balance")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found", details: userError }, { status: 404 })
    }

    console.log("[TEST_BET] User found:", user)

    // 2. Kiểm tra session tồn tại và đang mở
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found", details: sessionError }, { status: 404 })
    }

    console.log("[TEST_BET] Session found:", session)

    if (session.status !== "open") {
      return NextResponse.json(
        { error: "Session is not open for betting", session_status: session.status },
        { status: 400 },
      )
    }

    // 3. Kiểm tra balance đủ không
    if (user.balance < amount) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          user_balance: user.balance,
          required_amount: amount,
        },
        { status: 400 },
      )
    }

    // 4. Thử tạo bet
    const { data: newBet, error: betError } = await supabase
      .from("user_bets")
      .insert({
        user_id: userId,
        session_id: sessionId,
        bet_type: betType,
        numbers: numbers,
        amount: amount,
        potential_win: amount * 99, // Giả sử lô 2 số
        status: "pending",
      })
      .select()
      .single()

    if (betError) {
      console.error("[TEST_BET] Error creating bet:", betError)
      return NextResponse.json({ error: "Failed to create bet", details: betError }, { status: 500 })
    }

    console.log("[TEST_BET] Bet created successfully:", newBet)

    return NextResponse.json({
      success: true,
      message: "Test bet placed successfully",
      bet: newBet,
      user: user,
      session: session,
    })
  } catch (error) {
    console.error("[TEST_BET] Critical error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Lấy thông tin để test
    const { data: openSessions } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(3)

    const { data: usersWithBalance } = await supabase
      .from("users")
      .select("id, username, balance")
      .gt("balance", 50000)
      .order("balance", { ascending: false })
      .limit(3)

    return NextResponse.json({
      success: true,
      test_data: {
        open_sessions: openSessions || [],
        users_with_balance: usersWithBalance || [],
      },
      instructions: {
        message: "Use POST to test bet placement",
        example_payload: {
          userId: usersWithBalance?.[0]?.id || "user-id-here",
          sessionId: openSessions?.[0]?.id || "session-id-here",
          betType: "lo_2_so_1p",
          numbers: ["12", "34"],
          amount: 50000,
        },
      },
    })
  } catch (error) {
    console.error("[TEST_BET_GET] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
