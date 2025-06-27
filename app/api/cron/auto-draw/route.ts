import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Helper function to get next session number
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

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = []
    const gameTypes = [
      { type: "lode_nhanh_1p", duration: 1, name: "Lô Đề Nhanh 1 Phút" },
      { type: "lode_nhanh_5p", duration: 5, name: "Lô Đề Nhanh 5 Phút" },
      { type: "lode_nhanh_30p", duration: 30, name: "Lô Đề Nhanh 30 Phút" },
    ]
    const now = new Date()

    console.log(`[AUTO_DRAW] Starting auto-draw check at ${now.toISOString()}`)

    for (const gameConfig of gameTypes) {
      const { type: gameType, duration, name } = gameConfig

      try {
        console.log(`[AUTO_DRAW] Checking ${gameType}...`)

        // Check if there's an active session (open, drawing, processing_rewards)
        const { data: activeSession, error: activeSessionError } = await supabase
          .from("game_sessions")
          .select("*")
          .eq("game_type", gameType)
          .in("status", ["open", "drawing", "processing_rewards"])
          .order("end_time", { ascending: false })
          .limit(1)
          .single()

        if (activeSessionError && activeSessionError.code !== "PGRST116") {
          console.error(`[AUTO_DRAW] Error fetching active session for ${gameType}:`, activeSessionError)
          results.push(`❌ Failed to check session for ${name}: ${activeSessionError.message}`)
          continue
        }

        let shouldCreateNewSession = false

        if (!activeSession) {
          // No active session exists, create a new one
          shouldCreateNewSession = true
          console.log(`[AUTO_DRAW] No active session found for ${gameType}`)
          results.push(`🔍 No active session found for ${name}, creating new session`)
        } else {
          // Check if the active session is close to ending or has ended
          const endTime = new Date(activeSession.end_time)
          const secondsUntilEnd = Math.floor((endTime.getTime() - now.getTime()) / 1000)

          console.log(
            `[AUTO_DRAW] ${gameType} session ${activeSession.session_number}: ${activeSession.status}, ${secondsUntilEnd}s remaining`,
          )

          // Create new session if current one is completed or very close to completion
          if (activeSession.status === "processing_rewards" && secondsUntilEnd <= 10) {
            shouldCreateNewSession = true
            results.push(
              `⏰ Session ${activeSession.session_number} for ${name} is completing (${secondsUntilEnd}s), creating new session`,
            )
          } else if (secondsUntilEnd <= -30) {
            // Session is overdue, force create new session
            shouldCreateNewSession = true
            results.push(
              `🚨 Session ${activeSession.session_number} for ${name} is overdue (${Math.abs(secondsUntilEnd)}s), creating new session`,
            )
          } else {
            results.push(
              `✅ Session ${activeSession.session_number} for ${name} is active (${activeSession.status}, ${secondsUntilEnd}s remaining)`,
            )
          }
        }

        if (shouldCreateNewSession) {
          console.log(`[AUTO_DRAW] Creating new session for ${gameType}`)

          // Get the last session number to generate the next one
          const { data: lastSession } = await supabase
            .from("game_sessions")
            .select("session_number")
            .eq("game_type", gameType)
            .order("session_number", { ascending: false })
            .limit(1)
            .single()

          const nextSessionNumber = getNextSessionNumber(gameType, lastSession?.session_number || 0)
          const newSessionStartTime = new Date()
          const newSessionEndTime = new Date(newSessionStartTime.getTime() + duration * 60 * 1000)

          console.log(
            `[AUTO_DRAW] Creating session ${nextSessionNumber} for ${gameType}, duration: ${duration} minutes`,
          )

          const { error: createError } = await supabase.from("game_sessions").insert({
            game_type: gameType,
            session_number: nextSessionNumber,
            start_time: newSessionStartTime.toISOString(),
            end_time: newSessionEndTime.toISOString(),
            draw_time: newSessionEndTime.toISOString(),
            status: "open",
            winning_numbers: [],
            results_data: {
              issue: nextSessionNumber.toString(),
              status: "accepting_bets",
              description: `${name} - Đang nhận cược`,
              session_type: gameType,
              duration_minutes: duration,
              created_at: newSessionStartTime.toISOString(),
            },
          })

          if (!createError) {
            console.log(`[AUTO_DRAW] ✅ Created session ${nextSessionNumber} for ${gameType}`)
            results.push(`🎯 Created new session ${nextSessionNumber} for ${name} (${duration} min duration)`)
          } else {
            console.error(`[AUTO_DRAW] ❌ Failed to create session for ${gameType}:`, createError)
            results.push(`❌ Failed to create session for ${name}: ${createError.message}`)
          }
        }
      } catch (error) {
        console.error(`[AUTO_DRAW] Error processing ${gameType}:`, error)
        results.push(`❌ Error processing ${name}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    console.log(`[AUTO_DRAW] Completed auto-draw check`)

    return NextResponse.json({
      success: true,
      message: "Auto-draw session creation completed",
      results: results,
      timestamp: now.toISOString(),
      processed_game_types: gameTypes.map((g) => g.type),
    })
  } catch (error) {
    console.error("[AUTO_DRAW] General error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
