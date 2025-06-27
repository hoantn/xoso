import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { AuthService } from "@/lib/auth"

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// --- HELPER FUNCTIONS ---

function generateLotteryResults() {
  const generateNumber = (digits: number) =>
    Math.floor(Math.random() * 10 ** digits)
      .toString()
      .padStart(digits, "0")
  const generateMultiple = (count: number, digits: number) => {
    const numbers = new Set<string>()
    while (numbers.size < count) {
      numbers.add(generateNumber(digits))
    }
    return Array.from(numbers)
  }

  return {
    special_prize: generateNumber(5),
    first_prize: generateNumber(5),
    second_prize: generateMultiple(2, 5),
    third_prize: generateMultiple(6, 5),
    fourth_prize: generateMultiple(4, 4),
    fifth_prize: generateMultiple(6, 4),
    sixth_prize: generateMultiple(3, 3),
    seventh_prize: generateMultiple(4, 2),
  }
}

// NEW HELPER: Get all 2-digit endings from all prizes, including duplicates
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

// CORRECTED: Function to calculate win count for each individual number
function calculateIndividualWinCounts(bet: any, results: any, allTwoDigitEndings: string[]): Record<string, number> {
  const { bet_type, numbers: betNumbers } = bet
  const winCounts: Record<string, number> = {}

  if (!betNumbers || betNumbers.length === 0) return winCounts

  const specialPrize = results.special_prize
  const getLastDigits = (numStr: string, count: number) => numStr.slice(-count)

  console.log(`[WIN_COUNT] Processing bet: ${bet.id}, Type: ${bet_type}, Numbers: [${betNumbers.join(", ")}]`)

  switch (bet_type) {
    case "lo_2_so_1p":
    case "lo_2_so_5p":
    case "lo_2_so_30p":
    case "lo_2_so_nhanh":
    case "lo": // Traditional lottery
      // For Lô 2 số, count occurrences for each bet number individually
      betNumbers.forEach((betNum: string) => {
        const occurrences = allTwoDigitEndings.filter((ending) => ending === betNum).length
        winCounts[betNum] = occurrences
        console.log(`[WIN_COUNT] Number ${betNum}: ${occurrences} occurrences`)
      })
      break

    case "lo_3_so_1p":
    case "lo_3_so_nhanh":
    case "lo_3_so": // Traditional lottery
      // For Lô 3 số: Count occurrences for each bet number in 3-digit endings
      const allThreeDigitEndings: string[] = []
      for (const key in results) {
        if (Object.prototype.hasOwnProperty.call(results, key)) {
          const prize = results[key]
          if (typeof prize === "string") {
            allThreeDigitEndings.push(prize.slice(-3))
          } else if (Array.isArray(prize)) {
            prize.forEach((num) => allThreeDigitEndings.push(num.slice(-3)))
          }
        }
      }
      betNumbers.forEach((betNum: string) => {
        const occurrences = allThreeDigitEndings.filter((ending) => ending === betNum).length
        winCounts[betNum] = occurrences
        console.log(`[WIN_COUNT] 3-digit number ${betNum}: ${occurrences} occurrences`)
      })
      break

    case "de_dac_biet_1p":
    case "de_dac_biet_5p":
    case "de_dac_biet_30p":
    case "de_dac_biet_nhanh":
    case "de": // Traditional lottery
      // For Đề, only special prize last 2 digits
      const specialLast2 = getLastDigits(specialPrize, 2)
      betNumbers.forEach((betNum: string) => {
        winCounts[betNum] = betNum === specialLast2 ? 1 : 0
        console.log(`[WIN_COUNT] Đề number ${betNum}: ${winCounts[betNum]} occurrences`)
      })
      break

    case "nhat_to_1p":
    case "nhat_to_nhanh":
    case "nhat_to": // Traditional lottery
      // For Nhất tố, last 1 digit of special prize
      const specialLast1 = getLastDigits(specialPrize, 1)
      betNumbers.forEach((betNum: string) => {
        winCounts[betNum] = betNum === specialLast1 ? 1 : 0
        console.log(`[WIN_COUNT] Nhất tố number ${betNum}: ${winCounts[betNum]} occurrences`)
      })
      break

    case "de_dau_duoi_1p":
    case "de_dau_duoi_nhanh":
    case "de_dau_duoi": // Traditional lottery
      // For Đề đầu đuôi, first or last digit of special prize
      const firstDigitSpecial = specialPrize.slice(0, 1)
      const lastDigitSpecial = getLastDigits(specialPrize, 1)
      betNumbers.forEach((betNum: string) => {
        winCounts[betNum] = betNum === firstDigitSpecial || betNum === lastDigitSpecial ? 1 : 0
        console.log(`[WIN_COUNT] Đầu đuôi number ${betNum}: ${winCounts[betNum]} occurrences`)
      })
      break

    case "xien_2_1p":
    case "xien_2_5p":
    case "xien_2_30p":
    case "xien_2_nhanh":
    case "xien2": // Traditional lottery
      // For Xiên 2, ALL numbers must be present (win as a group)
      const uniqueWinningEndingsForXien2 = Array.from(new Set(allTwoDigitEndings))
      const allXien2Present = betNumbers.every((num: string) => uniqueWinningEndingsForXien2.includes(num))
      betNumbers.forEach((betNum: string) => {
        winCounts[betNum] = allXien2Present ? 1 : 0
      })
      console.log(`[WIN_COUNT] Xiên 2 result: ${allXien2Present ? "WIN" : "LOSE"}`)
      break

    case "xien_3_1p":
    case "xien_3_5p":
    case "xien_3_30p":
    case "xien_3_nhanh":
    case "xien3": // Traditional lottery
      // For Xiên 3, ALL numbers must be present (win as a group)
      const uniqueWinningEndingsForXien3 = Array.from(new Set(allTwoDigitEndings))
      const allXien3Present = betNumbers.every((num: string) => uniqueWinningEndingsForXien3.includes(num))
      betNumbers.forEach((betNum: string) => {
        winCounts[betNum] = allXien3Present ? 1 : 0
      })
      console.log(`[WIN_COUNT] Xiên 3 result: ${allXien3Present ? "WIN" : "LOSE"}`)
      break

    case "xien_4_1p":
    case "xien_4_5p":
    case "xien_4_30p":
    case "xien_4_nhanh":
    case "xien_4": // Traditional lottery
      // For Xiên 4, ALL numbers must be present (win as a group)
      const uniqueWinningEndingsForXien4 = Array.from(new Set(allTwoDigitEndings))
      const allXien4Present = betNumbers.every((num: string) => uniqueWinningEndingsForXien4.includes(num))
      betNumbers.forEach((betNum: string) => {
        winCounts[betNum] = allXien4Present ? 1 : 0
      })
      console.log(`[WIN_COUNT] Xiên 4 result: ${allXien4Present ? "WIN" : "LOSE"}`)
      break

    default:
      console.warn(`[calculateIndividualWinCounts] Unknown bet type: ${bet_type}`)
  }

  return winCounts
}

// CORRECTED: Function to calculate win amount with accurate formula
// Formula: điểm × tỉ lệ thưởng × số lần xuất hiện × 1000
function calculateWinAmount(bet: any, individualWinCounts: Record<string, number>): number {
  const { bet_type, amount, points } = bet

  const multipliers: Record<string, number> = {
    // Fast lottery multipliers
    lo_2_so_1p: 99,
    lo_2_so_nhanh: 99,
    lo_2_so_5p: 99,
    lo_2_so_30p: 99,
    lo_3_so_1p: 900,
    lo_3_so_nhanh: 900,
    de_dac_biet_1p: 99,
    de_dac_biet_nhanh: 99,
    de_dac_biet_5p: 99,
    de_dac_biet_30p: 99,
    nhat_to_1p: 9,
    nhat_to_nhanh: 9,
    de_dau_duoi_1p: 9,
    de_dau_duoi_nhanh: 9,
    xien_2_1p: 17,
    xien_2_nhanh: 17,
    xien_3_1p: 65,
    xien_3_nhanh: 65,
    xien_4_1p: 200,
    xien_4_nhanh: 200,
    // Traditional lottery multipliers
    lo: 99,
    lo_2_so: 99,
    lo_3_so: 900,
    de: 99,
    de_dac_biet: 99,
    de_3_cang: 900,
    nhat_to: 9,
    de_dau_duoi: 9,
    xien2: 17,
    xien_2: 17,
    xien3: 65,
    xien_3: 65,
    xien_4: 200,
  }

  const multiplier = multipliers[bet_type]
  if (multiplier === undefined) {
    console.warn(`[calculateWinAmount] No multiplier found for bet type: ${bet_type}`)
    return 0
  }

  let totalWinAmount = 0

  // Check if this is a point-based bet (Lô) or money-based bet (Đề/Xiên)
  if (points > 0) {
    // Point-based betting (Lô): điểm × tỉ lệ thưởng × số lần xuất hiện × 1000
    console.log(`[calculateWinAmount] Point-based calculation for ${bet_type}:`)

    for (const [number, occurrences] of Object.entries(individualWinCounts)) {
      if (occurrences > 0) {
        const numberWinAmount = points * multiplier * occurrences * 1000
        totalWinAmount += numberWinAmount
        console.log(
          `  Number ${number}: ${points} points × ${multiplier} × ${occurrences} × 1000 = ${numberWinAmount.toLocaleString()}đ`,
        )
      }
    }

    console.log(`[calculateWinAmount] Total win amount: ${totalWinAmount.toLocaleString()}đ`)
  } else {
    // Money-based betting (Đề/Xiên): amount × multiplier × total occurrences
    const totalOccurrences = Object.values(individualWinCounts).reduce((sum, count) => sum + count, 0)

    if (bet_type.includes("xien")) {
      // For Xiên, it's all or nothing (either all numbers hit or none)
      const allHit = Object.values(individualWinCounts).every((count) => count > 0)
      totalWinAmount = allHit ? amount * multiplier : 0
      console.log(
        `[calculateWinAmount] Xiên calculation: ${amount} × ${multiplier} × ${allHit ? 1 : 0} = ${totalWinAmount.toLocaleString()}đ`,
      )
    } else {
      // For other money-based bets
      totalWinAmount = amount * multiplier * totalOccurrences
      console.log(
        `[calculateWinAmount] Money-based calculation: ${amount} × ${multiplier} × ${totalOccurrences} = ${totalWinAmount.toLocaleString()}đ`,
      )
    }
  }

  return totalWinAmount
}

async function processBetsForSession(sessionId: string, results: any) {
  console.log(`[BETS_PROCESS] ----------------------------------------------------`)
  console.log(`[BETS_PROCESS] Starting bet processing for session: ${sessionId}`)

  // Pre-calculate all 2-digit endings once for the session
  const allTwoDigitEndings = getAllTwoDigitEndings(results)
  console.log(`[BETS_PROCESS] All 2-digit endings from results: [${allTwoDigitEndings.join(", ")}]`)

  // STEP 1: Fetch ALL pending bets for the session using the admin client
  const { data: pendingBets, error: fetchError } = await supabaseAdmin
    .from("user_bets")
    .select("*")
    .eq("session_id", sessionId)
    .eq("status", "pending")

  if (fetchError) {
    console.error(`[BETS_PROCESS] CRITICAL: Error fetching bets for session ${sessionId}:`, fetchError)
    return { success: false, message: `DB Error: ${fetchError.message}`, processed: 0, winners: 0, totalWinAmount: 0 }
  }

  console.log(`[BETS_PROCESS] Found ${pendingBets.length} pending bet(s) for session ${sessionId}.`)

  if (pendingBets.length === 0) {
    console.log(`[BETS_PROCESS] No pending bets to process. Task finished.`)
    return { success: true, message: "Không có cược nào cần xử lý.", processed: 0, winners: 0, totalWinAmount: 0 }
  }

  let processedCount = 0
  let winnersCount = 0
  let totalWinAmount = 0
  const errors: string[] = []

  // STEP 2: Loop through each bet and process it
  for (const bet of pendingBets) {
    try {
      // Call the RPC function to handle payout
      const { data: payoutResult, error: payoutError } = await supabaseAdmin.rpc("payout_winner_with_points", {
        p_bet_id: bet.id,
        p_session_id: sessionId,
        p_winning_numbers: allTwoDigitEndings, // Pass the comprehensive winning numbers
        p_game_mode: "mien_bac", // Assuming game_mode for now, should come from session
        p_bet_type: bet.bet_type, // Pass bet_type from the bet itself
      })

      if (payoutError) {
        throw new Error(`Payout RPC failed for bet ${bet.id}: ${payoutError.message}`)
      }

      const { success, winnings, status } = payoutResult as { success: boolean; winnings: number; status: string }

      if (success) {
        processedCount++
        if (status === "won" && winnings > 0) {
          winnersCount++
          totalWinAmount += winnings
          console.log(
            `[BETS_PROCESS] SUCCESS: Bet ${bet.id} processed. Status: ${status}, Winnings: ${winnings.toLocaleString()}đ.`,
          )
        } else {
          console.log(`[BETS_PROCESS] Bet ${bet.id} processed. Status: ${status}, No winnings.`)
        }
      } else {
        throw new Error(`Payout RPC returned failure for bet ${bet.id}.`)
      }
    } catch (error: any) {
      console.error(`[BETS_PROCESS] ERROR: Failed to process bet ${bet.id}:`, error.message)
      errors.push(`Bet ${bet.id}: ${error.message}`)
    }
  }

  console.log(
    `[BETS_PROCESS] Finished processing. Processed: ${processedCount}, Winners: ${winnersCount}, Total Payout: ${totalWinAmount.toLocaleString()}đ`,
  )
  console.log(`[BETS_PROCESS] ----------------------------------------------------`)

  return {
    success: errors.length === 0,
    message: `Processed ${processedCount} bets. ${winnersCount} winners with total payout of ${totalWinAmount.toLocaleString()}đ.`,
    processed: processedCount,
    winners: winnersCount,
    totalWinAmount,
    errors: errors.length > 0 ? errors : null,
  }
}

// --- MAIN API HANDLER ---

export async function POST(request: NextRequest) {
  try {
    // Authentication check (e.g., admin token or internal cron job token)
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = AuthService.verifySessionToken(token) // Assuming admin token verification
    if (!user || user.role !== "admin") {
      // Ensure only admins can trigger this
      return NextResponse.json({ error: "Unauthorized: Invalid or insufficient token" }, { status: 401 })
    }

    const { sessionId } = await request.json() // Removed winningNumbers from direct input, will generate

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    console.log(`[DRAW_API] ====================================================`)
    console.log(`[DRAW_API] Admin '${user.username}' initiated manual draw for session: ${sessionId}`)

    // STEP 1: Get the session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      console.error(`[DRAW_API] Error fetching session:`, sessionError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    if (session.status !== "open") {
      return NextResponse.json({ error: `Session is not open, status is '${session.status}'` }, { status: 400 })
    }

    console.log(`[DRAW_API] Session #${session.session_number} found. Status: 'open'. Drawing now...`)

    // STEP 2: Generate results
    const results = generateLotteryResults()
    const comprehensiveWinningNumbers = getAllTwoDigitEndings(results) // This is now ALL 2-digit endings, including duplicates
    const resultsData = { ...results, issue: session.session_number.toString() }

    console.log(`[DRAW_API] Generated results. Special Prize: ${results.special_prize}`)
    console.log(`[DRAW_API] All 2-digit endings from results: [${comprehensiveWinningNumbers.join(", ")}]`)

    // STEP 3: Update session to 'completed' with results
    const { error: updateError } = await supabaseAdmin
      .from("game_sessions")
      .update({
        status: "completed",
        winning_numbers: comprehensiveWinningNumbers, // Store all 2-digit endings for reference
        results_data: resultsData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)

    if (updateError) {
      console.error(`[DRAW_API] CRITICAL: Failed to update session status:`, updateError)
      return NextResponse.json({ error: "Failed to update session" }, { status: 500 })
    }

    console.log(`[DRAW_API] Session #${session.session_number} successfully updated to 'completed'.`)

    // STEP 4: Process all bets for this session
    // Pass the full results object to processBetsForSession so it can calculate based on all prize types
    const betProcessingResult = await processBetsForSession(session.id, results)

    console.log(`[DRAW_API] Draw and processing complete for session ${sessionId}.`)
    console.log(`[DRAW_API] ====================================================`)

    return NextResponse.json({
      success: true,
      message: "Lottery drawn and bets processed.",
      session: {
        id: session.id,
        session_number: session.session_number,
        winning_numbers: comprehensiveWinningNumbers,
      },
      bet_processing_summary: betProcessingResult,
    })
  } catch (error: any) {
    console.error("[DRAW_API] UNHANDLED CRITICAL ERROR:", error)
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log("[DRAW_API_GET] Fetching ready sessions...")
    // Admin check for security
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 })
    }
    const token = authHeader.substring(7)
    const admin = AuthService.verifySessionToken(token)
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized: Invalid admin token" }, { status: 403 })
    }

    // Fetch sessions that are 'open' and their draw_time is in the past
    const { data: sessions, error } = await supabaseAdmin
      .from("game_sessions")
      .select("*")
      .eq("status", "open")
      .lte("end_time", new Date().toISOString())
      .order("end_time", { ascending: true })

    if (error) {
      console.error("[DRAW_API_GET] Error fetching ready sessions from DB:", error)
      return NextResponse.json({ success: false, error: "Error fetching ready sessions" }, { status: 500 })
    }

    console.log(`[DRAW_API_GET] Found ${sessions?.length || 0} ready sessions.`)

    return NextResponse.json({
      success: true,
      ready_sessions: sessions || [],
      count: sessions?.length || 0,
    })
  } catch (error: any) {
    console.error("[DRAW_API_GET] CRITICAL ERROR:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error", details: error.message },
      { status: 500 },
    )
  }
}
