import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

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

    console.log(`[PAYOUT_WEBHOOK] Processing payout for session ${sessionId}, event ${eventId}`)

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      console.error(`[PAYOUT_WEBHOOK] Session not found:`, sessionError)
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.status !== "completed") {
      console.log(`[PAYOUT_WEBHOOK] Session ${sessionId} is not completed (status: ${session.status}), skipping`)
      return NextResponse.json({
        success: true,
        message: "Session not ready for payout",
        session: { id: sessionId, status: session.status },
      })
    }

    if (!session.winning_numbers || session.winning_numbers.length === 0) {
      console.error(`[PAYOUT_WEBHOOK] Session ${sessionId} has no winning numbers`)
      return NextResponse.json({ error: "Session has no winning numbers" }, { status: 400 })
    }

    // Re-process payouts (in case they weren't processed during draw)
    const { data: result, error: processError } = await supabase.rpc("process_lottery_draw", {
      p_session_id: sessionId,
      p_winning_numbers: session.winning_numbers,
      p_results_data: session.results_data || {},
    })

    if (processError) {
      console.error("[PAYOUT_WEBHOOK] Error processing payout:", processError)
      return NextResponse.json({ error: "Failed to process payout: " + processError.message }, { status: 500 })
    }

    console.log(`[PAYOUT_WEBHOOK] ✅ Payout completed for session ${sessionId}`)
    console.log(`[PAYOUT_WEBHOOK] Payout result:`, result)

    // Schedule next event: create next session
    if (gameType && gameType.startsWith("lode_nhanh_")) {
      console.log(`[PAYOUT_WEBHOOK] Scheduling next session creation for ${gameType}`)

      await supabase.rpc("schedule_lottery_event", {
        p_event_type: "payout_completed",
        p_session_id: sessionId,
        p_game_type: gameType,
        p_scheduled_at: new Date().toISOString(),
        p_payload: {
          previous_session_id: sessionId,
          previous_session_number: session.session_number,
          winners: result?.winners || 0,
          total_payout: result?.total_payout || 0,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: "Payout processed successfully",
      processed_bets: result?.processed_bets || 0,
      winners: result?.winners || 0,
      total_payout: result?.total_payout || 0,
    })
  } catch (error) {
    console.error("[PAYOUT_WEBHOOK] Critical error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
