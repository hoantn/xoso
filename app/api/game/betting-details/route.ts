import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { AuthService } from "@/lib/auth"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = AuthService.verifySessionToken(token)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const betId = searchParams.get("betId")

    if (!betId) {
      return NextResponse.json({ error: "betId is required" }, { status: 400 })
    }

    console.log(`[BETTING_DETAILS] Fetching details for bet: ${betId}`)

    // Get bet details with session and transaction info
    const { data: betDetails, error: betError } = await supabaseAdmin
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
        ),
        transactions!left(
          id,
          type,
          amount,
          description,
          created_at
        )
      `)
      .eq("id", betId)
      .eq("user_id", user.id)
      .single()

    if (betError || !betDetails) {
      console.error("[BETTING_DETAILS] Error fetching bet details:", betError)
      return NextResponse.json({ error: "Bet not found" }, { status: 404 })
    }

    // Calculate actual winning numbers (intersection of bet numbers and session winning numbers)
    const betNumbers = betDetails.numbers.map((n: number) => n.toString().padStart(2, "0"))
    const sessionWinningNumbers = betDetails.game_sessions.winning_numbers || []

    // Find which numbers actually won
    const actualWinningNumbers: { [key: string]: number } = {}

    if (betDetails.status === "won" && sessionWinningNumbers.length > 0) {
      // For Lô betting: count occurrences of each bet number in winning numbers
      if (betDetails.bet_type.includes("lo")) {
        betNumbers.forEach((betNumber) => {
          const hitCount = sessionWinningNumbers.filter((winNum: string) => winNum === betNumber).length
          if (hitCount > 0) {
            actualWinningNumbers[betNumber] = hitCount
          }
        })
      }
      // For Đề betting: check if bet number matches special prize last 2 digits
      else if (betDetails.bet_type.includes("de")) {
        const specialPrize = betDetails.game_sessions.results_data?.special_prize
        if (specialPrize) {
          const specialLast2 = specialPrize.toString().slice(-2)
          betNumbers.forEach((betNumber) => {
            if (betNumber === specialLast2) {
              actualWinningNumbers[betNumber] = 1
            }
          })
        }
      }
      // For other bet types, check direct matches
      else {
        betNumbers.forEach((betNumber) => {
          if (sessionWinningNumbers.includes(betNumber)) {
            actualWinningNumbers[betNumber] = 1
          }
        })
      }
    }

    // Create formatted winning description
    let winningDescription = ""
    if (Object.keys(actualWinningNumbers).length > 0) {
      const winningParts = Object.entries(actualWinningNumbers).map(([number, count]) => `${number}[${count}]`)
      const totalHits = Object.values(actualWinningNumbers).reduce((sum, count) => sum + count, 0)

      winningDescription = `Số trúng [${winningParts.join(", ")}] | ${betDetails.points}.00 điểm/số | Tổng ${totalHits} lần trúng | Phiên ${betDetails.game_sessions.session_number} | Thưởng: ${betDetails.win_amount || 0}.00đ`
    }

    const response = {
      success: true,
      bet: {
        id: betDetails.id,
        bet_type: betDetails.bet_type,
        numbers: betNumbers,
        points: betDetails.points,
        amount: betDetails.amount,
        status: betDetails.status,
        win_amount: betDetails.win_amount || 0,
        created_at: betDetails.created_at,
        processed_at: betDetails.processed_at,
        actual_winning_numbers: actualWinningNumbers,
        winning_description: winningDescription,
      },
      session: {
        id: betDetails.game_sessions.id,
        session_number: betDetails.game_sessions.session_number,
        game_type: betDetails.game_sessions.game_type,
        winning_numbers: betDetails.game_sessions.winning_numbers,
        results_data: betDetails.game_sessions.results_data,
        status: betDetails.game_sessions.status,
      },
      transactions: betDetails.transactions || [],
    }

    console.log(`[BETTING_DETAILS] Successfully fetched details for bet ${betId}`)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[BETTING_DETAILS] CRITICAL ERROR:", error)
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 })
  }
}
