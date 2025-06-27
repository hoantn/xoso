import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching active sessions")

    // Get all open sessions
    const { data: sessions, error } = await supabase
      .from("game_sessions")
      .select("*")
      .eq("status", "open")
      .order("start_time", { ascending: true })

    if (error) {
      console.error("Error fetching sessions:", error)
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 })
    }

    // Calculate countdown for each session
    const now = new Date()
    const activeSessions = sessions.map((session) => {
      const endTime = new Date(session.end_time)
      const countdownSeconds = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000))

      return {
        ...session,
        countdown_seconds: countdownSeconds,
      }
    })

    console.log("Found active sessions:", activeSessions.length)

    return NextResponse.json({
      success: true,
      sessions: activeSessions,
    })
  } catch (error) {
    console.error("Active sessions error:", error)
    return NextResponse.json(
      {
        error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    )
  }
}
