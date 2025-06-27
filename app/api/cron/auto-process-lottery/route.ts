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
async function processBetResults(sessionId: string, winningNumbers: string[]) {
  try {
    console.log(`[PROCESS_BETS] Processing bets for session ${sessionId}`)

    // Get all pending bets for this session
    const { data: bets, error: betsError } = await supabase
      .from("user_bets")
      .select("*")
      .eq("session_id", sessionId)
      .eq("status", "pending")

    if (betsError) {
      console.error("[PROCESS_BETS] Error fetching bets:", betsError)
      return { processed: 0, error: betsError.message }
    }

    if (!bets || bets.length === 0) {
      console.log("[PROCESS_BETS] No pending bets found")
      return { processed: 0, error: null }
    }

    console.log(`[PROCESS_BETS] Found ${bets.length} pending bets`)

    let processedCount = 0
    const errors: string[] = []

    for (const bet of bets) {
      try {
        // Check if bet won
        const betNumbers = bet.numbers || []
        const isWinner = betNumbers.some((num: string) => winningNumbers.includes(num))
        const winAmount = isWinner ? bet.potential_win : 0

        // Update bet status with processed flag
        const { error: updateBetError } = await supabase
          .from("user_bets")
          .update({
            status: isWinner ? "won" : "lost",
            win_amount: winAmount,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", bet.id)

        if (updateBetError) {
          console.error(`[PROCESS_BETS] Error updating bet ${bet.id}:`, updateBetError)
          errors.push(`Bet ${bet.id}: ${updateBetError.message}`)
          continue
        }

        // If won, update user balance and create transaction
        if (isWinner && winAmount > 0) {
          // Get current user balance
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("balance")
            .eq("id", bet.user_id)
            .single()

          if (userError || !userData) {
            console.error(`[PROCESS_BETS] Error fetching user ${bet.user_id}:`, userError)
            errors.push(`User ${bet.user_id}: ${userError?.message || "User not found"}`)
            continue
          }

          const currentBalance = Number(userData.balance) || 0
          const newBalance = currentBalance + winAmount

          // Update user balance
          const { error: balanceError } = await supabase
            .from("users")
            .update({ balance: newBalance })
            .eq("id", bet.user_id)

          if (balanceError) {
            console.error(`[PROCESS_BETS] Error updating balance for user ${bet.user_id}:`, balanceError)
            errors.push(`Balance update ${bet.user_id}: ${balanceError.message}`)
            continue
          }

          // Create win transaction
          const { error: transactionError } = await supabase.from("transactions").insert({
            user_id: bet.user_id,
            type: "game_win",
            amount: winAmount,
            balance_before: currentBalance,
            balance_after: newBalance,
            description: `Thắng cược ${bet.bet_type} - Phiên ${bet.session_id}`,
            status: "completed",
            reference_id: bet.id,
            metadata: {
              bet_id: bet.id,
              session_id: sessionId,
              bet_type: bet.bet_type,
              winning_numbers: winningNumbers,
              bet_numbers: betNumbers,
              processed_at: new Date().toISOString(),
            },
          })

          if (transactionError) {
            console.error(`[PROCESS_BETS] Error creating transaction for user ${bet.user_id}:`, transactionError)
            errors.push(`Transaction ${bet.user_id}: ${transactionError.message}`)
          }
        }

        processedCount++
      } catch (error) {
        console.error(`[PROCESS_BETS] Error processing bet ${bet.id}:`, error)
        errors.push(`Bet ${bet.id}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    console.log(`[PROCESS_BETS] Processed ${processedCount}/${bets.length} bets`)
    if (errors.length > 0) {
      console.error(`[PROCESS_BETS] Errors encountered:`, errors)
    }

    return { processed: processedCount, errors: errors.length > 0 ? errors : null }
  } catch (error) {
    console.error("[PROCESS_BETS] General error:", error)
    return { processed: 0, error: error instanceof Error ? error.message : String(error) }
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

    // Get all active sessions
    const { data: activeSessions, error: sessionsError } = await supabase
      .from("game_sessions")
      .select("*")
      .in("game_type", ["lode_nhanh_1p", "lode_nhanh_5p", "lode_nhanh_30p"])
      .eq("status", "open")

    if (sessionsError) {
      console.error("Error fetching active sessions:", sessionsError)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    if (!activeSessions || activeSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active sessions to process",
        results: [],
      })
    }

    for (const session of activeSessions) {
      const endTime = new Date(session.end_time)
      const secondsRemaining = Math.floor((endTime.getTime() - now.getTime()) / 1000)

      try {
        // 10 seconds remaining: Close betting
        if (secondsRemaining <= 10 && secondsRemaining > 8) {
          const { error: updateError } = await supabase
            .from("game_sessions")
            .update({
              results_data: {
                ...session.results_data,
                status: "betting_closed",
                description: "Đã đóng cược - Chuẩn bị quay số",
              },
            })
            .eq("id", session.id)

          if (!updateError) {
            results.push(`Session ${session.session_number}: Closed betting`)
          }
        }
        // 8 seconds remaining: Generate results
        else if (secondsRemaining <= 8 && secondsRemaining > 3) {
          // Check if results already generated
          if (!session.winning_numbers || session.winning_numbers.length === 0) {
            const lotteryResults = generateLotteryResults()
            const winningNumbers = [lotteryResults.special_prize.slice(-2)]

            const { error: updateError } = await supabase
              .from("game_sessions")
              .update({
                winning_numbers: winningNumbers,
                results_data: {
                  ...session.results_data,
                  status: "drawing",
                  description: "Đang quay số",
                  ...lotteryResults,
                },
              })
              .eq("id", session.id)

            if (!updateError) {
              results.push(`Session ${session.session_number}: Generated results`)
            }
          }
        }
        // 3 seconds remaining: Process bets and pay winners
        else if (secondsRemaining <= 3 && secondsRemaining > 0) {
          // Check if already processed
          if (session.results_data?.status !== "completed") {
            const winningNumbers = session.winning_numbers || []
            const betResults = await processBetResults(session.id, winningNumbers)

            const { error: updateError } = await supabase
              .from("game_sessions")
              .update({
                results_data: {
                  ...session.results_data,
                  status: "processing_rewards",
                  description: "Đang xử lý thưởng",
                  bet_processing: betResults,
                },
              })
              .eq("id", session.id)

            if (!updateError) {
              results.push(`Session ${session.session_number}: Processed ${betResults.processed} bets`)
            }
          }
        }
        // Time expired: Complete session
        else if (secondsRemaining <= 0) {
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
            results.push(`Session ${session.session_number}: Completed`)
          }
        }
      } catch (error) {
        console.error(`Error processing session ${session.session_number}:`, error)
        results.push(`Session ${session.session_number}: Error - ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Auto-process completed",
      results: results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Auto-process error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  // Allow POST method as well for manual triggers
  return GET(request)
}
