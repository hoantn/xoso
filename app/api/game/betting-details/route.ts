import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth"

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const user = AuthService.verifySessionToken(token)
    return user
  }
  return null
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get("transaction_id")
    const gameBetId = searchParams.get("game_bet_id")

    console.log(`[BETTING_DETAILS_GET] User: ${user.username}, Transaction: ${transactionId}, Bet: ${gameBetId}`)

    if (!transactionId && !gameBetId) {
      return NextResponse.json({ error: "Missing transaction_id or game_bet_id" }, { status: 400 })
    }

    let bettingDetails = null

    if (gameBetId) {
      // Get betting details from user_bets table
      const { data: betData, error: betError } = await supabase
        .from("user_bets")
        .select(`
          *,
          game_sessions(
            id,
            session_number,
            start_time,
            end_time,
            winning_numbers,
            status
          )
        `)
        .eq("id", gameBetId)
        .eq("user_id", user.id)
        .single()

      if (betError) {
        console.error("[BETTING_DETAILS_GET] Bet details error:", betError)
        return NextResponse.json({ error: "Failed to fetch bet details" }, { status: 500 })
      }

      if (betData) {
        // Calculate hit counts for winning numbers
        const hitCount: { [key: string]: number } = {}
        const actualWinningNumbers: string[] = []

        if (betData.numbers && betData.game_sessions?.winning_numbers) {
          betData.numbers.forEach((betNumber: number) => {
            const betNumberStr = betNumber.toString().padStart(2, "0")
            const hits = betData.game_sessions.winning_numbers.filter(
              (winNum: string) => winNum === betNumberStr,
            ).length
            if (hits > 0) {
              hitCount[betNumberStr] = hits
              actualWinningNumbers.push(betNumberStr)
            }
          })
        }

        bettingDetails = {
          id: betData.id,
          session_number: betData.game_sessions?.session_number || "N/A",
          bet_type: betData.bet_type,
          numbers: betData.numbers?.map((n: number) => n.toString().padStart(2, "0")) || [],
          bet_amount: betData.amount || 0,
          points: betData.points || 0,
          potential_win: betData.potential_win || 0,
          actual_win: betData.win_amount || 0,
          status: betData.status,
          created_at: betData.created_at,
          processed_at: betData.processed_at,
          winning_numbers: betData.game_sessions?.winning_numbers || [],
          actual_winning_numbers: actualWinningNumbers, // Only numbers that actually won
          hit_count: hitCount,
          session_info: betData.game_sessions,
        }
      }
    }

    return NextResponse.json({
      success: true,
      betting_details: bettingDetails,
    })
  } catch (error) {
    console.error("[BETTING_DETAILS_GET] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
