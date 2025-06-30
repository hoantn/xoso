import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Helper function to generate random lottery results
function generateLotteryResults() {
  return {
    special_prize: Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0"),
    first_prize: [
      Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0"),
    ],
    second_prize: [
      Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0"),
      Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0"),
    ],
    third_prize: Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0"),
    ),
    fourth_prize: Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0"),
    ),
    fifth_prize: Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0"),
    ),
    sixth_prize: Array.from({ length: 3 }, () =>
      Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, "0"),
    ),
    seventh_prize: Array.from({ length: 4 }, () => Math.floor(Math.random() * 10).toString()),
  }
}

// Get all 2-digit endings from all prizes
function getAllTwoDigitEndings(results: any): string[] {
  const endings: string[] = []
  for (const key in results) {
    if (Object.prototype.hasOwnProperty.call(results, key)) {
      const prize = results[key]
      if (typeof prize === "string") {
        endings.push(prize.slice(-2))
      } else if (Array.isArray(prize)) {
        prize.forEach((num) => endings.push(num.slice(-2)))
      }
    }
  }
  return endings
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = []
    const now = new Date()

    console.log(`[AUTO_PROCESS] Starting auto-process at ${now.toISOString()}`)

    // Get all active fast lottery sessions
    const { data: activeSessions, error: sessionsError } = await supabase
      .from("game_sessions")
      .select("*")
      .in("game_type", ["lode_nhanh_1p", "lode_nhanh_5p", "lode_nhanh_30p"])
      .eq("status", "open")
      .order("end_time", { ascending: true })

    if (sessionsError) {
      console.error("[AUTO_PROCESS] Error fetching active sessions:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    if (!activeSessions || activeSessions.length === 0) {
      console.log("[AUTO_PROCESS] No active sessions to process")
      return NextResponse.json({
        success: true,
        message: "No active sessions to process",
        results: [],
        timestamp: now.toISOString(),
      })
    }

    console.log(`[AUTO_PROCESS] Found ${activeSessions.length} active sessions to process`)

    for (const session of activeSessions) {
      const endTime = new Date(session.end_time)
      const secondsRemaining = Math.floor((endTime.getTime() - now.getTime()) / 1000)
      const gameTypeName =
        session.game_type === "lode_nhanh_1p" ? "1p" : session.game_type === "lode_nhanh_5p" ? "5p" : "30p"

      console.log(
        `[AUTO_PROCESS] Processing session ${session.session_number} (${session.game_type}): ${secondsRemaining}s remaining`,
      )

      try {
        // Process based on countdown timing
        if (secondsRemaining <= 5 && secondsRemaining > 3) {
          // Close betting phase (5s to 3s remaining)
          console.log(`[AUTO_PROCESS] Closing betting for session ${session.session_number}`)

          const { error: updateError } = await supabase
            .from("game_sessions")
            .update({
              results_data: {
                ...session.results_data,
                status: "betting_closed",
                description: "Đã đóng cược - Chuẩn bị quay số",
                betting_closed_at: now.toISOString(),
              },
            })
            .eq("id", session.id)

          if (!updateError) {
            results.push(`🔒 Session ${session.session_number} (${gameTypeName}): Closed betting`)
          } else {
            console.error(`[AUTO_PROCESS] Failed to close betting for session ${session.session_number}:`, updateError)
            results.push(
              `❌ Session ${session.session_number} (${gameTypeName}): Failed to close betting: ${updateError.message}`,
            )
          }
        } else if (secondsRemaining <= 3 && secondsRemaining > 0) {
          // Drawing phase (3s to 0s remaining)
          console.log(`[AUTO_PROCESS] Drawing phase for session ${session.session_number}`)

          const { error: updateError } = await supabase
            .from("game_sessions")
            .update({
              results_data: {
                ...session.results_data,
                status: "drawing",
                description: "Đang quay số",
                drawing_started_at: now.toISOString(),
              },
            })
            .eq("id", session.id)

          if (!updateError) {
            results.push(`🎲 Session ${session.session_number} (${gameTypeName}): Drawing phase`)
          } else {
            console.error(
              `[AUTO_PROCESS] Failed to update drawing phase for session ${session.session_number}:`,
              updateError,
            )
            results.push(
              `❌ Session ${session.session_number} (${gameTypeName}): Failed to update drawing phase: ${updateError.message}`,
            )
          }
        } else if (secondsRemaining <= 0) {
          // Process draw, payout, and create next session (time expired)
          console.log(`[AUTO_PROCESS] Processing draw and payout for session ${session.session_number}`)

          // Generate results
          const lotteryResults = generateLotteryResults()
          const winningNumbers = getAllTwoDigitEndings(lotteryResults)

          // Process lottery draw (includes payout)
          const { data: processResult, error: processError } = await supabase.rpc("process_lottery_draw", {
            p_session_id: session.id,
            p_winning_numbers: winningNumbers,
            p_results_data: lotteryResults,
          })

          if (!processError) {
            results.push(
              `✅ Session ${session.session_number} (${gameTypeName}): Completed - ${processResult?.winners || 0} winners, ${processResult?.total_payout || 0} payout`,
            )

            // Auto-create next session
            try {
              const { data: nextSession, error: createError } = await supabase.rpc("create_next_game_session", {
                p_game_type: session.game_type,
              })

              if (!createError && nextSession) {
                results.push(`🆕 Created next session #${nextSession.session_number} for ${gameTypeName}`)
              } else {
                console.error(`[AUTO_PROCESS] Failed to create next session for ${session.game_type}:`, createError)
                results.push(`⚠️ Session ${session.session_number} completed but failed to create next session`)
              }
            } catch (createErr) {
              console.error(`[AUTO_PROCESS] Error creating next session:`, createErr)
              results.push(`⚠️ Session ${session.session_number} completed but failed to create next session`)
            }
          } else {
            console.error(`[AUTO_PROCESS] Failed to process draw for session ${session.session_number}:`, processError)
            results.push(
              `❌ Session ${session.session_number} (${gameTypeName}): Failed to process draw: ${processError.message}`,
            )
          }
        } else {
          // Session is still in normal betting phase
          results.push(
            `🟢 Session ${session.session_number} (${gameTypeName}): Accepting bets (${secondsRemaining}s remaining)`,
          )
        }
      } catch (error) {
        console.error(
          `[AUTO_PROCESS] Error processing session ${session.session_number} (${session.game_type}):`,
          error,
        )
        results.push(
          `❌ Session ${session.session_number} (${gameTypeName}): Processing error - ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    console.log(`[AUTO_PROCESS] Completed auto-process`)

    return NextResponse.json({
      success: true,
      message: "Auto-process lottery completed",
      results: results,
      timestamp: now.toISOString(),
      processed_sessions: activeSessions.length,
    })
  } catch (error) {
    console.error("[AUTO_PROCESS] General error:", error)
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
