import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Helper function to generate lottery results
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

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId, gameType, eventId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    console.log(`[DRAW_WEBHOOK] Processing draw for session ${sessionId}, event ${eventId}`)

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      console.error(`[DRAW_WEBHOOK] Session not found:`, sessionError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.status !== "open") {
      console.log(`[DRAW_WEBHOOK] Session ${sessionId} is not open (status: ${session.status}), skipping`)
      return NextResponse.json({
        success: true,
        message: "Session already processed",
        session: { id: sessionId, status: session.status },
      })
    }

    // Generate results
    const resultsData = generateLotteryResults()
    const winningNumbers = getAllTwoDigitEndings(resultsData)

    console.log(`[DRAW_WEBHOOK] Generated results for session ${session.session_number}`)
    console.log(`[DRAW_WEBHOOK] Winning numbers: [${winningNumbers.join(", ")}]`)

    // Process lottery draw (this handles both draw and payout)
    const { data: processResult, error: processError } = await supabase.rpc("process_lottery_draw", {
      p_session_id: session.id,
      p_winning_numbers: winningNumbers,
      p_results_data: resultsData,
    })

    if (processError) {
      console.error(`[DRAW_WEBHOOK] Failed to process lottery draw:`, processError)
      return NextResponse.json(
        { error: "Failed to process lottery draw", details: processError.message },
        { status: 500 },
      )
    }

    console.log(`[DRAW_WEBHOOK] ✅ Draw completed for session ${sessionId}`)
    console.log(`[DRAW_WEBHOOK] Process result:`, processResult)

    // Schedule next event: create next session for fast lottery games
    if (gameType && gameType.startsWith("lode_nhanh_")) {
      console.log(`[DRAW_WEBHOOK] Scheduling next session creation for ${gameType}`)

      await supabase.rpc("schedule_lottery_event", {
        p_event_type: "payout_completed",
        p_session_id: sessionId,
        p_game_type: gameType,
        p_scheduled_at: new Date().toISOString(),
        p_payload: {
          previous_session_id: sessionId,
          previous_session_number: session.session_number,
          winners: processResult?.winners || 0,
          total_payout: processResult?.total_payout || 0,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Draw completed successfully",
      session: {
        id: session.id,
        session_number: session.session_number,
        winning_numbers: winningNumbers,
        results_data: resultsData,
      },
      processing_result: processResult,
    })
  } catch (error) {
    console.error("[DRAW_WEBHOOK] Critical error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
