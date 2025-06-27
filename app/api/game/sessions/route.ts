import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const gameType = searchParams.get("gameType")

    if (!gameType) {
      return NextResponse.json({ error: "Missing gameType parameter" }, { status: 400 })
    }

    // Get current open session
    const { data: currentSession, error: currentError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("game_type", gameType)
      .eq("status", "open")
      .order("session_number", { ascending: false })
      .limit(1)
      .single()

    if (currentError && currentError.code !== "PGRST116") {
      console.error("Error fetching current session:", currentError)
    }

    // If no open session found, try to create a new one
    let sessionWithCountdown = null
    if (!currentSession) {
      console.log(`No open session found for ${gameType}, attempting to create new session`)

      try {
        const createResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/game/create-next-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ gameType }),
        })

        if (createResponse.ok) {
          const createResult = await createResponse.json()
          if (createResult.success && createResult.session) {
            const now = new Date()
            const endTime = new Date(createResult.session.end_time)
            const countdownSeconds = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000))

            sessionWithCountdown = {
              ...createResult.session,
              countdown_seconds: countdownSeconds,
            }
            console.log(`Created new session for ${gameType}:`, sessionWithCountdown.session_number)
          }
        }
      } catch (createError) {
        console.error("Error creating new session:", createError)
      }
    } else {
      // Calculate countdown for existing session
      const now = new Date()
      const endTime = new Date(currentSession.end_time)
      const countdownSeconds = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000))

      sessionWithCountdown = {
        ...currentSession,
        countdown_seconds: countdownSeconds,
      }
    }

    // Get recent completed sessions with results
    const { data: recentResults, error: resultsError } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("game_type", gameType)
      .eq("status", "completed")
      .not("results_data", "is", null)
      .order("session_number", { ascending: false })
      .limit(10)

    if (resultsError) {
      console.error("Error fetching recent results:", resultsError)
      return NextResponse.json({ error: "Failed to fetch recent results" }, { status: 500 })
    }

    // Format recent results
    const formattedResults =
      recentResults?.map((result) => ({
        id: result.id,
        game_type: result.game_type,
        session_number: result.session_number,
        status: result.status,
        winning_numbers: result.winning_numbers,
        results_data: result.results_data,
        draw_time: result.draw_time,
        created_at: result.created_at,
      })) || []

    return NextResponse.json({
      currentSession: sessionWithCountdown,
      recentResults: formattedResults,
      gameType: gameType,
    })
  } catch (error) {
    console.error("Error in game sessions API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
