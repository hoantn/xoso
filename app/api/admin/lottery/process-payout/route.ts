import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyAdminToken } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const adminUser = await verifyAdminToken(token)
    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 })
    }

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    if (session.status !== "completed") {
      return NextResponse.json({ error: "Session is not completed yet" }, { status: 400 })
    }

    if (!session.winning_numbers || session.winning_numbers.length === 0) {
      return NextResponse.json({ error: "Session has no winning numbers" }, { status: 400 })
    }

    // Call the process_lottery_draw function to re-process payouts
    const { data: result, error: processError } = await supabase.rpc("process_lottery_draw", {
      p_session_id: sessionId,
      p_winning_numbers: session.winning_numbers,
      p_results_data: session.results_data || {},
    })

    if (processError) {
      console.error("Error processing payout:", processError)
      return NextResponse.json({ error: "Failed to process payout: " + processError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Payout processed successfully",
      processed_bets: result?.processed_bets || 0,
      winners: result?.winners || 0,
      total_payout: result?.total_payout || 0,
    })
  } catch (error) {
    console.error("Error in process-payout API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
