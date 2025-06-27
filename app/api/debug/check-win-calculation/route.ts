import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Helper function to get all 2-digit endings from results
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

// Debug version of getBetWinCount with detailed logging
function debugGetBetWinCount(bet: any, results: any, allTwoDigitEndings: string[]): any {
  const { bet_type, numbers: betNumbers } = bet
  if (!betNumbers || betNumbers.length === 0) return { winCount: 0, details: "No bet numbers" }

  const details: string[] = []
  let totalWinCount = 0

  details.push(`Bet Type: ${bet_type}`)
  details.push(`Bet Numbers: [${betNumbers.join(", ")}]`)
  details.push(`All Winning 2-digit endings: [${allTwoDigitEndings.join(", ")}]`)

  switch (bet_type) {
    case "lo_2_so_1p":
    case "lo_2_so_5p":
    case "lo_2_so_30p":
    case "lo_2_so_nhanh":
    case "lo": // Traditional lottery
      // For Lô 2 số, count each occurrence of each bet number
      betNumbers.forEach((betNum: string) => {
        const occurrences = allTwoDigitEndings.filter((ending) => ending === betNum).length
        totalWinCount += occurrences
        details.push(`Number ${betNum}: ${occurrences} occurrences`)
      })
      break

    case "de_dac_biet_1p":
    case "de_dac_biet_5p":
    case "de_dac_biet_30p":
    case "de_dac_biet_nhanh":
    case "de": // Traditional lottery
      // For Đề, only special prize last 2 digits
      const specialPrize = results.special_prize || ""
      const specialLast2 = specialPrize.slice(-2)
      details.push(`Special Prize: ${specialPrize}, Last 2 digits: ${specialLast2}`)

      betNumbers.forEach((betNum: string) => {
        if (betNum === specialLast2) {
          totalWinCount += 1
          details.push(`Đề number ${betNum} matches special prize ending ${specialLast2}`)
        } else {
          details.push(`Đề number ${betNum} does NOT match special prize ending ${specialLast2}`)
        }
      })
      break

    default:
      details.push(`Unknown bet type: ${bet_type}`)
      totalWinCount = 0
  }

  details.push(`Total Win Count: ${totalWinCount}`)
  return { winCount: totalWinCount, details }
}

// Debug version of calculateWinAmount
function debugCalculateWinAmount(betType: string, betAmount: number, winCount: number): any {
  const multipliers: Record<string, number> = {
    lo_2_so_1p: 99,
    lo_2_so_nhanh: 99,
    lo_2_so_5p: 99,
    lo_2_so_30p: 99,
    de_dac_biet_1p: 99,
    de_dac_biet_nhanh: 99,
    de_dac_biet_5p: 99,
    de_dac_biet_30p: 99,
    lo: 99,
    de: 99,
  }

  const multiplier = multipliers[betType] || 0
  let winAmount = 0
  const details: string[] = []

  details.push(`Bet Type: ${betType}`)
  details.push(`Bet Amount: ${betAmount}`)
  details.push(`Win Count: ${winCount}`)
  details.push(`Multiplier: ${multiplier}`)

  if (betType.startsWith("lo_") || betType === "lo") {
    // Point-based betting: points × multiplier × occurrences × 1000
    winAmount = betAmount * multiplier * winCount * 1000
    details.push(`Calculation: ${betAmount} × ${multiplier} × ${winCount} × 1000 = ${winAmount}`)
  } else {
    // Direct money betting: amount × multiplier × occurrences
    winAmount = betAmount * multiplier * winCount
    details.push(`Calculation: ${betAmount} × ${multiplier} × ${winCount} = ${winAmount}`)
  }

  return { winAmount, details }
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, betId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    // Get session data
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Get bets for this session
    let betsQuery = supabaseAdmin.from("user_bets").select("*").eq("session_id", sessionId)

    if (betId) {
      betsQuery = betsQuery.eq("id", betId)
    }

    const { data: bets, error: betsError } = await betsQuery

    if (betsError) {
      return NextResponse.json({ error: "Error fetching bets" }, { status: 500 })
    }

    const results = session.results_data || {}
    const allTwoDigitEndings = getAllTwoDigitEndings(results)

    const debugResults = bets.map((bet) => {
      const winCountDebug = debugGetBetWinCount(bet, results, allTwoDigitEndings)
      const winAmountDebug = debugCalculateWinAmount(bet.bet_type, bet.amount, winCountDebug.winCount)

      return {
        bet_id: bet.id,
        bet_type: bet.bet_type,
        bet_numbers: bet.numbers,
        bet_amount: bet.amount,
        current_win_amount: bet.win_amount,
        calculated_win_amount: winAmountDebug.winAmount,
        win_count_debug: winCountDebug,
        win_amount_debug: winAmountDebug,
        is_correct: bet.win_amount === winAmountDebug.winAmount,
      }
    })

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        session_number: session.session_number,
        status: session.status,
        winning_numbers: session.winning_numbers,
        results_data: results,
      },
      all_two_digit_endings: allTwoDigitEndings,
      debug_results: debugResults,
    })
  } catch (error: any) {
    console.error("Debug calculation error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}
