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

    console.log(`[BETTING_DETAILS] Request: transaction_id=${transactionId}, game_bet_id=${gameBetId}`)

    if (!transactionId && !gameBetId) {
      return NextResponse.json({ error: "transaction_id or game_bet_id is required" }, { status: 400 })
    }

    let betDetails = null

    // If we have game_bet_id, get bet details directly
    if (gameBetId) {
      const { data: betData, error: betError } = await supabase
        .from("user_bets")
        .select(`
          *,
          game_sessions!inner(
            id,
            session_number,
            game_type,
            winning_numbers,
            results_data,
            status
          )
        `)
        .eq("id", gameBetId)
        .eq("user_id", user.id)
        .limit(1)
        .single()

      // If the .single() call fails because of multiple rows, retry and take the first row
      if (betError?.code === "PGRST116") {
        const { data } = await supabase
          .from("user_bets")
          .select(`
            *,
            game_sessions!inner(
              id,
              session_number,
              game_type,
              winning_numbers,
              results_data,
              status
            )
          `)
          .eq("id", gameBetId)
          .eq("user_id", user.id)
          .limit(1)
        betDetails = data?.[0] || null
      }

      if (betError) {
        console.error("[BETTING_DETAILS] Bet query error:", betError)
        return NextResponse.json({ error: "Bet not found" }, { status: 404 })
      }

      betDetails = betData
    } else if (transactionId) {
      // Get transaction and related bet details
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select(`
          *,
          user_bets!inner(
            *,
            game_sessions!inner(
              id,
              session_number,
              game_type,
              winning_numbers,
              results_data,
              status
            )
          )
        `)
        .eq("id", transactionId)
        .eq("user_id", user.id)
        .limit(1)
        .single()

      if (transactionError?.code === "PGRST116") {
        const { data } = await supabase
          .from("transactions")
          .select(`
            *,
            user_bets!inner(
              *,
              game_sessions!inner(
                id,
                session_number,
                game_type,
                winning_numbers,
                results_data,
                status
              )
            )
          )
        `)
          .eq("id", transactionId)
          .eq("user_id", user.id)
          .limit(1)
        betDetails = data?.user_bets ?? null
      }

      if (transactionError || !transactionData.user_bets) {
        console.error("[BETTING_DETAILS] Transaction query error:", transactionError)
        return NextResponse.json({ error: "Transaction or bet not found" }, { status: 404 })
      }

      betDetails = transactionData.user_bets
    }

    if (!betDetails) {
      return NextResponse.json({ error: "No betting details found" }, { status: 404 })
    }

    // Calculate hit counts for winning bets
    const hitCount: { [key: string]: number } = {}
    const betNumbers = betDetails.numbers || []
    const sessionWinningNumbers = betDetails.game_sessions.winning_numbers || []

    console.debug(`[BETTING_DETAILS] Bet numbers:`, betNumbers)
    console.debug(`[BETTING_DETAILS] Session winning numbers:`, sessionWinningNumbers)

    // Calculate which of the user's bet numbers actually won
    if (betDetails.status === "won" && betNumbers.length > 0) {
      betNumbers.forEach((betNumber: number) => {
        const betNumberStr = betNumber.toString().padStart(2, "0")
        const occurrences = sessionWinningNumbers.filter((winNum: string) => winNum === betNumberStr).length
        if (occurrences > 0) {
          hitCount[betNumberStr] = occurrences
        }
      })
    }

    // Calculate potential win based on bet type and points/amount
    let potentialWin = 0
    const multipliers: { [key: string]: number } = {
      lo_2_so_1p: 99,
      lo_2_so_5p: 99,
      lo_2_so_30p: 99,
      lo_3_so_1p: 900,
      de_dac_biet_1p: 99,
      de_dac_biet_5p: 99,
      de_dac_biet_30p: 99,
      xien_2_1p: 17,
      xien_3_1p: 65,
      xien_4_1p: 200,
    }

    const multiplier = multipliers[betDetails.bet_type] || 99
    if (betDetails.points > 0) {
      // Point-based betting
      potentialWin = betDetails.points * multiplier * betNumbers.length * 1000
    } else {
      // Amount-based betting
      potentialWin = betDetails.amount * multiplier
    }

    const response = {
      success: true,
      betting_details: {
        id: betDetails.id,
        session_number: betDetails.game_sessions.session_number,
        game_mode: betDetails.game_sessions.game_type,
        bet_type: betDetails.bet_type,
        numbers: betNumbers.map((n: number) => n.toString().padStart(2, "0")),
        bet_amount: betDetails.amount,
        points: betDetails.points,
        potential_win: potentialWin,
        actual_win: betDetails.win_amount || 0,
        status: betDetails.status,
        created_at: betDetails.created_at,
        processed_at: betDetails.processed_at,
        winning_numbers: sessionWinningNumbers,
        hit_count: hitCount,
        session_info: {
          id: betDetails.game_sessions.id,
          session_number: betDetails.game_sessions.session_number,
          game_type: betDetails.game_sessions.game_type,
          status: betDetails.game_sessions.status,
          results_data: betDetails.game_sessions.results_data,
        },
      },
    }

    console.log(`[BETTING_DETAILS] Response:`, response)

    return NextResponse.json(response)
  } catch (error) {
    console.error(`[BETTING_DETAILS] Error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
