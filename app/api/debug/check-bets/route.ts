import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    // Check all bets for this session (regardless of status)
    const { data: allBets, error: allBetsError } = await supabase
      .from("user_bets")
      .select("*")
      .eq("session_id", sessionId)

    if (allBetsError) {
      return NextResponse.json({ error: allBetsError.message }, { status: 500 })
    }

    // Check pending bets specifically
    const { data: pendingBets, error: pendingError } = await supabase
      .from("user_bets")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "pending")

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    // Check session info
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      session,
      allBets: allBets || [],
      pendingBets: pendingBets || [],
      summary: {
        totalBets: allBets?.length || 0,
        pendingBets: pendingBets?.length || 0,
        betStatuses: allBets?.reduce((acc: any, bet: any) => {
          acc[bet.status] = (acc[bet.status] || 0) + 1
          return acc
        }, {}),
      },
    })
  } catch (error) {
    console.error("Debug check bets error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
