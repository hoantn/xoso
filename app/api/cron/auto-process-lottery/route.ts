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

// Helper function to process bet results and pay winners
async function processBetsForSession(sessionId: string, winningNumbers: string[], gameType: string) {
  try {
    console.log(`[BETS_PROCESS] Processing bets for session ${sessionId} (${gameType})`)

    // Get all pending bets for this session
    const { data: bets, error: betsError } = await supabase
      .from("user_bets")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "pending")

    if (betsError) {
      console.error("[BETS_PROCESS] Error fetching bets:", betsError)
      return {
        success: false,
        processed: 0,
        winners: 0,
        totalWinAmount: 0,
        error: betsError.message,
      }
    }

    if (!bets || bets.length === 0) {
      console.log(`[BETS_PROCESS] No pending bets found for session ${sessionId}`)
      return {
        success: true,
        processed: 0,
        winners: 0,
        totalWinAmount: 0,
        message: "No pending bets to process",
      }
    }

    console.log(`[BETS_PROCESS] Found ${bets.length} pending bets for session ${sessionId}`)

    let processedCount = 0
    let totalWinners = 0
    let totalWinAmount = 0
    const errors: string[] = []

    for (const bet of bets) {
      try {
        console.log(`[BETS_PROCESS] Processing bet ${bet.id} for user ${bet.user_id}`)

        // Call the RPC function to process the bet and payout
        const { data: rpcResult, error: rpcError } = await supabase.rpc("payout_winner_with_points", {
          p_bet_id: bet.id,
          p_session_id: sessionId,
          p_winning_numbers: winningNumbers,
        })

        if (rpcError) {
          console.error(`[BETS_PROCESS] ERROR: Failed to process bet ${bet.id}: Payout RPC failed:`, rpcError)
          errors.push(`Payout failed for bet ${bet.id}: ${rpcError.message}`)
          continue
        }

        // RPC function should return { is_winner, win_amount, new_balance }
        if (rpcResult && rpcResult.is_winner) {
          totalWinners++
          totalWinAmount += rpcResult.win_amount || 0
          console.log(`[BETS_PROCESS] ✅ Bet ${bet.id} won: ${rpcResult.win_amount}`)
        } else {
          console.log(`[BETS_PROCESS] ❌ Bet ${bet.id} lost`)
        }
        processedCount++
      } catch (error) {
        console.error(`[BETS_PROCESS] Error processing bet ${bet.id}:`, error)
        errors.push(`Bet ${bet.id}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    console.log(
      `[BETS_PROCESS] Completed processing for session ${sessionId}: ${processedCount}/${bets.length} bets, ${totalWinners} winners, total winnings: ${totalWinAmount}`,
    )

    if (errors.length > 0) {
      console.error(`[BETS_PROCESS] Errors encountered:`, errors)
    }

    return {
      success: errors.length === 0,
      message:
        errors.length > 0
          ? `Processed with ${errors.length} errors`
          : `Successfully processed ${processedCount} bets. ${totalWinners} winners, total winnings: ${totalWinAmount}`,
      processed: processedCount,
      winners: totalWinners,
      totalWinAmount: totalWinAmount,
      errors: errors.length > 0 ? errors : null,
    }
  } catch (error) {
    console.error("[BETS_PROCESS] General error:", error)
    return {
      success: false,
      processed: 0,
      winners: 0,
      totalWinAmount: 0,
      error: error instanceof Error ? error.message : String(error),
    }
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
    const now = new Date()

    console.log(`[AUTO_PROCESS] Starting auto-process at ${now.toISOString()}`)

    // Get all sessions that are not yet completed, ordered by end time
    const { data: activeSessions, error: sessionsError } = await supabase
      .from("game_sessions")
      .select("*")
      .in("game_type", ["lode_nhanh_1p", "lode_nhanh_5p", "lode_nhanh_30p"])
      .neq("status", "completed")
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
        `[AUTO_PROCESS] Processing session ${session.session_number} (${session.game_type}): ${session.status}, ${secondsRemaining}s remaining`,
      )

      try {
        // State 1: Open -> Close betting (15 seconds before end for 1p, 30 seconds for others)
        const closeBettingThreshold = session.game_type === "lode_nhanh_1p" ? 15 : 30
        if (session.status === "open" && secondsRemaining <= closeBettingThreshold && secondsRemaining > 10) {
          console.log(`[AUTO_PROCESS] Closing betting for session ${session.session_number} (${session.game_type})`)

          const { error: updateError } = await supabase
            .from("game_sessions")
            .update({
              status: "drawing",
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
        }
        // State 2: Drawing -> Generate results and process bets (10 seconds before end)
        else if (session.status === "drawing" && secondsRemaining <= 10 && secondsRemaining > 0) {
          console.log(
            `[AUTO_PROCESS] Generating results and processing bets for session ${session.session_number} (${session.game_type})`,
          )

          // Generate results if not already generated
          let winningNumbers = session.winning_numbers || []

          if (winningNumbers.length === 0) {
            const lotteryResults = generateLotteryResults()
            winningNumbers = [lotteryResults.special_prize.slice(-2)]

            console.log(
              `[AUTO_PROCESS] Generated winning numbers for session ${session.session_number}: ${winningNumbers.join(", ")}`,
            )

            const { error: updateError } = await supabase
              .from("game_sessions")
              .update({
                winning_numbers: winningNumbers,
                results_data: {
                  ...session.results_data,
                  status: "drawing",
                  description: "Đang quay số",
                  drawing_started_at: now.toISOString(),
                  ...lotteryResults,
                },
              })
              .eq("id", session.id)

            if (!updateError) {
              results.push(
                `🎲 Session ${session.session_number} (${gameTypeName}): Generated results - Winning numbers: ${winningNumbers.join(", ")}`,
              )
            } else {
              console.error(
                `[AUTO_PROCESS] Failed to generate results for session ${session.session_number}:`,
                updateError,
              )
              results.push(
                `❌ Session ${session.session_number} (${gameTypeName}): Failed to generate results: ${updateError.message}`,
              )
              continue
            }
          }

          // Process bets immediately after generating results
          console.log(`[AUTO_PROCESS] Processing bets for session ${session.session_number}`)
          const betResults = await processBetsForSession(session.id, winningNumbers, session.game_type)

          const { error: updateError2 } = await supabase
            .from("game_sessions")
            .update({
              status: "processing_rewards",
              results_data: {
                ...session.results_data,
                status: "processing_rewards",
                description: "Đang xử lý thưởng",
                bet_processing_started_at: now.toISOString(),
                bet_processing: betResults,
              },
            })
            .eq("id", session.id)

          if (!updateError2) {
            results.push(
              `💰 Session ${session.session_number} (${gameTypeName}): Processed ${betResults.processed} bets, ${betResults.winners} winners, winnings: ${betResults.totalWinAmount}`,
            )
          } else {
            console.error(
              `[AUTO_PROCESS] Failed to update after bet processing for session ${session.session_number}:`,
              updateError2,
            )
            results.push(
              `❌ Session ${session.session_number} (${gameTypeName}): Failed to update after bet processing: ${updateError2.message}`,
            )
          }
        }
        // State 3: Processing rewards -> Completed (at or after end time)
        else if (session.status === "processing_rewards" && secondsRemaining <= 0) {
          console.log(`[AUTO_PROCESS] Completing session ${session.session_number} (${session.game_type})`)

          const { error: updateError } = await supabase
            .from("game_sessions")
            .update({
              status: "completed",
              results_data: {
                ...session.results_data,
                status: "completed",
                description: "Hoàn thành",
                completed_at: now.toISOString(),
              },
            })
            .eq("id", session.id)

          if (!updateError) {
            results.push(`✅ Session ${session.session_number} (${gameTypeName}): Completed`)
          } else {
            console.error(`[AUTO_PROCESS] Failed to complete session ${session.session_number}:`, updateError)
            results.push(
              `❌ Session ${session.session_number} (${gameTypeName}): Failed to complete: ${updateError.message}`,
            )
          }
        }
        // Handle sessions that are overdue but still in open status
        else if (session.status === "open" && secondsRemaining <= 0) {
          console.log(
            `[AUTO_PROCESS] Emergency processing for overdue session ${session.session_number} (${session.game_type})`,
          )

          // Force close and process immediately
          const lotteryResults = generateLotteryResults()
          const winningNumbers = [lotteryResults.special_prize.slice(-2)]

          const { error: updateError } = await supabase
            .from("game_sessions")
            .update({
              status: "processing_rewards",
              winning_numbers: winningNumbers,
              results_data: {
                ...session.results_data,
                status: "processing_rewards",
                description: "Xử lý khẩn cấp - Phiên quá hạn",
                emergency_processed_at: now.toISOString(),
                ...lotteryResults,
              },
            })
            .eq("id", session.id)

          if (!updateError) {
            // Process bets immediately
            const betResults = await processBetsForSession(session.id, winningNumbers, session.game_type)
            results.push(
              `⚡ Session ${session.session_number} (${gameTypeName}): Emergency processed - ${betResults.processed} bets, ${betResults.winners} winners`,
            )
          } else {
            console.error(
              `[AUTO_PROCESS] Failed emergency processing for session ${session.session_number}:`,
              updateError,
            )
            results.push(
              `❌ Session ${session.session_number} (${gameTypeName}): Failed emergency processing: ${updateError.message}`,
            )
          }
        } else {
          // Session is in normal state, no action needed
          const statusEmoji = session.status === "open" ? "🟢" : session.status === "drawing" ? "🎲" : "⏳"
          results.push(
            `${statusEmoji} Session ${session.session_number} (${gameTypeName}): ${session.status} (${secondsRemaining}s remaining)`,
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
