import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Simple admin check function
async function isAdmin(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false
    }

    const token = authHeader.substring(7)

    // Simple token validation - you can enhance this
    if (!token || token.length < 10) {
      return false
    }

    return true // For now, assume valid token means admin
  } catch (error) {
    console.error("Admin check error:", error)
    return false
  }
}

function getNextSessionNumber(gameType: string): number {
  const now = new Date()
  const timeStamp = now.getTime()

  let prefix = 1000
  if (gameType === "lode_nhanh_5p") prefix = 2000
  if (gameType === "lode_nhanh_30p") prefix = 3000

  // Simple session number: prefix + current minute of day
  const minuteOfDay = now.getHours() * 60 + now.getMinutes()
  return prefix + minuteOfDay
}

export async function POST(request: NextRequest) {
  try {
    console.log("Create session API called")

    // Check admin authentication
    const adminCheck = await isAdmin(request)
    if (!adminCheck) {
      console.log("Admin authentication failed")
      return NextResponse.json({ error: "Admin authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { gameType } = body

    console.log("Creating session for gameType:", gameType)

    if (!gameType || !["lode_nhanh_1p", "lode_nhanh_5p", "lode_nhanh_30p"].includes(gameType)) {
      return NextResponse.json({ error: "Invalid gameType" }, { status: 400 })
    }

    // Check if there's already an open session for this game type
    const { data: existingSession, error: checkError } = await supabase
      .from("game_sessions")
      .select("id, session_number")
      .eq("game_type", gameType)
      .eq("status", "open")
      .maybeSingle()

    if (checkError) {
      console.error("Error checking existing session:", checkError)
      return NextResponse.json({ error: "Database error checking existing sessions" }, { status: 500 })
    }

    if (existingSession) {
      return NextResponse.json(
        {
          error: `Already has open session #${existingSession.session_number} for ${gameType}`,
        },
        { status: 400 },
      )
    }

    // Get duration based on game type
    let durationMinutes = 1
    if (gameType === "lode_nhanh_5p") durationMinutes = 5
    if (gameType === "lode_nhanh_30p") durationMinutes = 30

    const nextSessionNumber = getNextSessionNumber(gameType)
    const now = new Date()
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000)

    console.log("Creating session with number:", nextSessionNumber)

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
      return NextResponse.json(
        {
          error: `Failed to create session: ${createError.message}`,
        },
        { status: 500 },
      )
    }

    console.log("Session created successfully:", newSession)

    return NextResponse.json({
      success: true,
      session: newSession,
      message: `Created session ${nextSessionNumber} for ${gameType}`,
    })
  } catch (error) {
    console.error("Create session error:", error)
    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
