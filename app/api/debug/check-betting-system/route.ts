import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("[DEBUG_BETTING] Starting betting system check...")

    // 1. Kiểm tra phiên đang mở
    const { data: openSessions, error: openSessionsError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("status", "open")
      .order("session_number", { ascending: false })
      .limit(5)

    if (openSessionsError) {
      console.error("[DEBUG_BETTING] Error fetching open sessions:", openSessionsError)
      return NextResponse.json({ error: "Error fetching open sessions" }, { status: 500 })
    }

    console.log(`[DEBUG_BETTING] Found ${openSessions?.length || 0} open sessions`)

    // 2. Kiểm tra cược gần đây
    const { data: recentBets, error: recentBetsError } = await supabase
      .from("user_bets")
      .select(`
        *,
        users(username),
        game_sessions(session_number, game_type)
      `)
      .order("created_at", { ascending: false })
      .limit(10)

    if (recentBetsError) {
      console.error("[DEBUG_BETTING] Error fetching recent bets:", recentBetsError)
      return NextResponse.json({ error: "Error fetching recent bets" }, { status: 500 })
    }

    console.log(`[DEBUG_BETTING] Found ${recentBets?.length || 0} recent bets`)

    // 3. Kiểm tra users có balance
    const { data: usersWithBalance, error: usersError } = await supabase
      .from("users")
      .select("id, username, balance")
      .gt("balance", 0)
      .order("balance", { ascending: false })
      .limit(5)

    if (usersError) {
      console.error("[DEBUG_BETTING] Error fetching users with balance:", usersError)
      return NextResponse.json({ error: "Error fetching users" }, { status: 500 })
    }

    console.log(`[DEBUG_BETTING] Found ${usersWithBalance?.length || 0} users with balance`)

    // 4. Tạo test session nếu không có session nào đang mở
    let testSession = null
    if (!openSessions || openSessions.length === 0) {
      console.log("[DEBUG_BETTING] No open sessions found, creating test session...")

      const { data: maxSessionData } = await supabase
        .from("game_sessions")
        .select("session_number")
        .eq("game_type", "lode_nhanh_1p")
        .order("session_number", { ascending: false })
        .limit(1)

      const nextSessionNumber = (maxSessionData?.[0]?.session_number || 0) + 1

      const { data: newSession, error: createSessionError } = await supabase
        .from("game_sessions")
        .insert({
          game_type: "lode_nhanh_1p",
          session_number: nextSessionNumber,
          draw_time: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
          status: "open",
        })
        .select()
        .single()

      if (createSessionError) {
        console.error("[DEBUG_BETTING] Error creating test session:", createSessionError)
      } else {
        testSession = newSession
        console.log(`[DEBUG_BETTING] Created test session #${nextSessionNumber}`)
      }
    }

    return NextResponse.json({
      success: true,
      debug_info: {
        open_sessions: openSessions || [],
        recent_bets: recentBets || [],
        users_with_balance: usersWithBalance || [],
        test_session_created: testSession,
      },
      summary: {
        open_sessions_count: openSessions?.length || 0,
        recent_bets_count: recentBets?.length || 0,
        users_with_balance_count: usersWithBalance?.length || 0,
        test_session_created: !!testSession,
      },
      recommendations: [
        openSessions?.length === 0 ? "❌ Không có phiên nào đang mở - cần tạo phiên mới" : "✅ Có phiên đang mở",
        recentBets?.length === 0 ? "❌ Không có cược gần đây - kiểm tra API đặt cược" : "✅ Có cược gần đây",
        usersWithBalance?.length === 0 ? "❌ Không có user nào có balance - cần nạp tiền" : "✅ Có user có balance",
      ],
    })
  } catch (error) {
    console.error("[DEBUG_BETTING] Critical error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
