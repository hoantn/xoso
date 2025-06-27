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
        },
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating session:", createError)
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 })
    }

    console.log(`Successfully created session ${nextSessionNumber} for ${gameType}`)

    return NextResponse.json({
      success: true,
      session: newSession,
      message: `Created new session ${nextSessionNumber} for ${gameType}`,
    })
  } catch (error) {
    console.error("Error creating next session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
