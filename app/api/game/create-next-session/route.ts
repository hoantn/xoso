import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

function getNextSessionNumber(gameType: string, lastSessionNumber: number): number {
  const today = new Date()
  const baseNumber = Number.parseInt(
    today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0"),
  )

  // Different prefixes for different game types
  let prefix = 1000
  if (gameType === "lode_nhanh_5p") prefix = 2000
  if (gameType === "lode_nhanh_30p") prefix = 3000

  // If last session is from today, increment sequence
  const todayBase = baseNumber + prefix
  if (lastSessionNumber > todayBase) {
    return lastSessionNumber + 1
  } else {
    return todayBase + 1
  }
}

export async function POST(request: Request) {
  try {
    const { gameType } = await request.json()

    if (!gameType) {
      return NextResponse.json({ error: "Missing gameType" }, { status: 400 })
    }

    // CRITICAL: Check if there's already an active session for this game type
    const { data: activeSession, error: activeSessionError } = await supabase
      .from("game_sessions")
      .select("id, session_number, status, end_time")
      .eq("game_type", gameType)
      .eq("status", "open")
      .single()

    if (activeSessionError && activeSessionError.code !== "PGRST116") {
      // PGRST116 is "no rows returned", which is what we want
      console.error("Error checking active session:", activeSessionError)
      return NextResponse.json({ error: "Failed to check active sessions" }, { status: 500 })
    }

    if (activeSession) {
      // There's already an active session
      const endTime = new Date(activeSession.end_time)
      const now = new Date()
      const secondsRemaining = Math.floor((endTime.getTime() - now.getTime()) / 1000)

      return NextResponse.json(
        {
          error: "Đã có phiên đang hoạt động",
          details: `Phiên #${activeSession.session_number} đang mở cược (còn ${secondsRemaining}s). Vui lòng chờ phiên này kết thúc.`,
          activeSession: {
            id: activeSession.id,
            session_number: activeSession.session_number,
            seconds_remaining: secondsRemaining,
          },
        },
        { status: 409 }, // Conflict
      )
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

    // Create new session with additional validation
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
      console.error("Error creating session:", createError)

      // Check if it's a duplicate session number error
      if (createError.code === "23505") {
        return NextResponse.json(
          {
            error: "Phiên đã tồn tại",
            details: "Số phiên này đã được tạo. Vui lòng thử lại.",
          },
          { status: 409 },
        )
      }

      return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
    }

    console.log(`Successfully created session ${nextSessionNumber} for ${gameType}`)

    return NextResponse.json({
      success: true,
      session: newSession,
      message: `Tạo phiên mới thành công #${nextSessionNumber}`,
    })
  } catch (error) {
    console.error("Error creating next session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
