import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()
    const results = {
      timestamp: now.toISOString(),
      system_status: "active",
      sessions: {},
      summary: {
        total_active_sessions: 0,
        total_pending_bets: 0,
        next_actions: [],
        game_types_status: {},
      },
    }

    const gameTypes = [
      { type: "lode_nhanh_1p", name: "Lô Đề Nhanh 1 Phút", duration: 1 },
      { type: "lode_nhanh_5p", name: "Lô Đề Nhanh 5 Phút", duration: 5 },
      { type: "lode_nhanh_30p", name: "Lô Đề Nhanh 30 Phút", duration: 30 },
    ]

    // Get all active sessions
    const { data: activeSessions, error: sessionsError } = await supabase
      .from("game_sessions")
      .select("*")
      .in("game_type", ["lode_nhanh_1p", "lode_nhanh_5p", "lode_nhanh_30p"])
      .neq("status", "completed")
      .order("end_time", { ascending: true })

    if (sessionsError) {
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    results.summary.total_active_sessions = activeSessions?.length || 0

    // Initialize game types status
    for (const gameType of gameTypes) {
      results.summary.game_types_status[gameType.type] = {
        name: gameType.name,
        duration: gameType.duration,
        has_active_session: false,
        needs_new_session: true,
      }
    }

    if (activeSessions && activeSessions.length > 0) {
      for (const session of activeSessions) {
        const endTime = new Date(session.end_time)
        const secondsRemaining = Math.floor((endTime.getTime() - now.getTime()) / 1000)
        const gameTypeName =
          session.game_type === "lode_nhanh_1p" ? "1p" : session.game_type === "lode_nhanh_5p" ? "5p" : "30p"

        // Get pending bets count for this session
        const { count: pendingBetsCount } = await supabase
          .from("user_bets")
          .select("*", { count: "exact", head: true })
          .eq("session_id", session.id)
          .eq("status", "pending")

        // Mark this game type as having an active session
        results.summary.game_types_status[session.game_type].has_active_session = true
        results.summary.game_types_status[session.game_type].needs_new_session = false

        results.sessions[`${session.game_type}_${session.session_number}`] = {
          game_type: session.game_type,
          game_name: gameTypeName,
          session_number: session.session_number,
          status: session.status,
          seconds_remaining: secondsRemaining,
          pending_bets: pendingBetsCount || 0,
          winning_numbers: session.winning_numbers || [],
          start_time: session.start_time,
          end_time: session.end_time,
          next_action: getNextAction(session.status, secondsRemaining, session.game_type),
        }

        results.summary.total_pending_bets += pendingBetsCount || 0

        // Add next actions to summary
        const nextAction = getNextAction(session.status, secondsRemaining, session.game_type)
        if (nextAction !== "waiting") {
          results.summary.next_actions.push(`${nextAction} for ${gameTypeName} session ${session.session_number}`)
        }
      }
    }

    // Check which game types need new sessions
    for (const gameType of gameTypes) {
      if (results.summary.game_types_status[gameType.type].needs_new_session) {
        results.summary.next_actions.push(`Create new session for ${gameType.name}`)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

function getNextAction(status: string, secondsRemaining: number, gameType: string): string {
  const closeBettingThreshold = gameType === "lode_nhanh_1p" ? 15 : 30

  if (status === "open" && secondsRemaining <= closeBettingThreshold) {
    return "close_betting"
  } else if (status === "drawing" && secondsRemaining <= 10) {
    return "process_bets"
  } else if (status === "processing_rewards" && secondsRemaining <= 0) {
    return "complete_session"
  } else if (status === "open" && secondsRemaining <= 0) {
    return "emergency_process"
  }
  return "waiting"
}
