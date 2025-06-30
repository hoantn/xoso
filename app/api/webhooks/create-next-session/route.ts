import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

function getNextSessionNumber(gameType: string, lastSessionNumber: number): number {
  const today = new Date()
  const baseNumber = Number.parseInt(
    today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0"),
  )

  let prefix = 1000
  if (gameType === "lode_nhanh_5p") prefix = 2000
  if (gameType === "lode_nhanh_30p") prefix = 3000

  const todayBase = baseNumber + prefix
  if (lastSessionNumber > todayBase) {
    return lastSessionNumber + 1
  } else {
    return todayBase + 1
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { gameType, eventId, previousSessionId } = await request.json()

    if (!gameType) {
      return NextResponse.json({ error: "gameType is required" }, { status: 400 })
    }

    console.log(`[CREATE_SESSION_WEBHOOK] Creating next session for ${gameType}, event ${eventId}`)

    // Check if there's already an active session for this game type
    const { data: activeSession, error: activeSessionError } = await supabase
      .from("game_sessions")
      .select("id, session_number, status, end_time")
      .eq("game_type", gameType)
      .eq("status", "open")
      .single()

    if (activeSessionError && activeSessionError.code !== "PGRST116") {
      console.error("[CREATE_SESSION_WEBHOOK] Error checking active session:", activeSessionError)
      return NextResponse.json({ error: "Failed to check active sessions" }, { status: 500 })
    }

    if (activeSession) {
      console.log(`[CREATE_SESSION_WEBHOOK] Active session already exists: ${activeSession.session_number}`)
      return NextResponse.json({
        success: true,
        message: "Active session already exists",
        activeSession: {
          id: activeSession.id,
          session_number: activeSession.session_number,
        },
      })
    }

    // Get duration based on game type
    let durationMinutes = 1
    if (gameType === "lode_nhanh_5p") durationMinutes = 5
    if (gameType === "lode_nhanh_30p") durationMinutes = 30

    // Get last session number
    const { data: lastSession } = await supabase
      .from("game_sessions")
      .select("session_number")
      .eq("game_type", gameType)
      .order("session_number", { ascending: false })
      .limit(1)
      .single()

    const nextSessionNumber = getNextSessionNumber(gameType, lastSession?.session_number || 0)

    const now = new Date()
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000)

    // Create new session
    const { data: newSession, error: createError } = await supabase
      .from("game_sessions")
      .insert({
        game_type: gameType,
        session_number: nextSessionNumber,
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        draw_time: endTime.toISOString(),
        status: "open",
        results_data: {
          issue: nextSessionNumber.toString(),
          status: "accepting_bets",
          description: `${gameType} - Đang nhận cược`,
          session_type: gameType,
          duration_minutes: durationMinutes,
          created_at: now.toISOString(),
        },
      })
      .select()
      .single()

    if (createError) {
      console.error("[CREATE_SESSION_WEBHOOK] Error creating session:", createError)
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
    }

    console.log(`[CREATE_SESSION_WEBHOOK] ✅ Created session ${nextSessionNumber} for ${gameType}`)

    // The trigger will automatically schedule the next expiration event
    // No need to manually schedule it here

    return NextResponse.json({
      success: true,
      message: `Created next session successfully`,
      session: newSession,
      previousSessionId,
    })
  } catch (error) {
    console.error("[CREATE_SESSION_WEBHOOK] Critical error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
