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

// Get all 2-digit endings from all prizes, including duplicates
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

// --- MAIN API HANDLER ---

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing token" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = AuthService.verifySessionToken(token)
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized: Invalid or insufficient token" }, { status: 401 })
    }

    const { sessionId, gameType, forceManual } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    console.log(`[DRAW_API] ====================================================`)
    console.log(`[DRAW_API] Admin '${user.username}' initiated draw for session: ${sessionId}`)

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

    console.log(`[DRAW_API] Session #${session.session_number} found. Status: 'open'. Processing...`)

    // STEP 2: Generate results
    const resultsData = generateLotteryResults()
    const comprehensiveWinningNumbers = getAllTwoDigitEndings(resultsData)

    console.log(`[DRAW_API] Generated results. Special Prize: ${resultsData.special_prize}`)
    console.log(`[DRAW_API] All 2-digit endings from results: [${comprehensiveWinningNumbers.join(", ")}]`)

    // STEP 3: Process lottery draw using the function (this handles both draw and payout)
    const { data: processResult, error: processError } = await supabaseAdmin.rpc("process_lottery_draw", {
      p_session_id: session.id,
      p_winning_numbers: comprehensiveWinningNumbers,
      p_results_data: resultsData,
    })

    if (processError) {
      console.error(`[DRAW_API] CRITICAL: Failed to process lottery draw:`, processError)
      return NextResponse.json(
        { error: "Failed to process lottery draw", details: processError.message },
        { status: 500 },
      )
    }

    console.log(`[DRAW_API] Draw and processing complete for session ${sessionId}.`)
    console.log(`[DRAW_API] Process result:`, processResult)

    // STEP 4: Auto-create next session if this is a fast lottery game
    let nextSession = null
    if (gameType && gameType.startsWith("lode_nhanh_")) {
      try {
        console.log(`[DRAW_API] Auto-creating next session for ${gameType}...`)

        const createResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/game/create-next-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ gameType }),
        })

        if (createResponse.ok) {
          const createResult = await createResponse.json()
          nextSession = createResult.session
          console.log(`[DRAW_API] Auto-created next session #${nextSession?.session_number}`)
        } else {
          console.error(`[DRAW_API] Failed to auto-create next session:`, await createResponse.text())
        }
      } catch (error) {
        console.error(`[DRAW_API] Error auto-creating next session:`, error)
      }
    }

    console.log(`[DRAW_API] ====================================================`)

    return NextResponse.json({
      success: true,
      message: "Lottery drawn, bets processed, and next session created successfully.",
      session: {
        id: session.id,
        session_number: session.session_number,
        winning_numbers: comprehensiveWinningNumbers,
        results_data: resultsData,
      },
      processing_result: processResult,
      next_session: nextSession,
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

    // Fetch sessions that are 'open' and their end_time is in the past
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
