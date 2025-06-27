import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Helper function to generate random lottery results
function generateLotteryResults() {
  return {
    special_prize: Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0"),
    first_prize: [
      Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0"),
    ],
    second_prize: [
      Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0"),
      Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0"),
    ],
    third_prize: Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 100000)
        .toString()
        .padStart(5, "0"),
    ),
    fourth_prize: Array.from({ length: 4 }, () =>
      Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0"),
    ),
    fifth_prize: Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0"),
    ),
    sixth_prize: Array.from({ length: 3 }, () =>
      Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, "0"),
    ),
    seventh_prize: Array.from({ length: 4 }, () => Math.floor(Math.random() * 10).toString()),
  }
}

// Helper function to get next session number
function getNextSessionNumber(gameType: string, lastSessionNumber: number): number {
  const today = new Date()
  const baseNumber = Number.parseInt(
    today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, "0") +
      today.getDate().toString().padStart(2, "0"),
  )

  let prefix = 1000
  if (gameType === "lode_nhanh_5p") prefix = 2000
  if (gameType === "lode_nhanh_30p") prefix = 3000

  const todayBase = baseNumber + prefix
  if (lastSessionNumber > todayBase) {
    return lastSessionNumber + 1
  } else {
    return todayBase + 1
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = []
    const gameTypes = [
      { type: "lode_nhanh_1p", duration: 1 },
      { type: "lode_nhanh_5p", duration: 5 },
      { type: "lode_nhanh_30p", duration: 30 },
    ]

    for (const gameConfig of gameTypes) {
      const { type: gameType, duration } = gameConfig

      // 1. Close expired sessions and generate results
      const { data: expiredSessions } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("game_type", gameType)
        .eq("status", "open")
        .lt("end_time", new Date().toISOString())

      if (expiredSessions && expiredSessions.length > 0) {
        for (const session of expiredSessions) {
          const lotteryResults = generateLotteryResults()
          const winningNumbers = [lotteryResults.special_prize.slice(-2), lotteryResults.first_prize[0].slice(-2)]

          await supabase
            .from("game_sessions")
            .update({
              status: "completed",
              winning_numbers: winningNumbers,
              results_data: {
                ...session.results_data,
                status: "completed",
                ...lotteryResults,
              },
            })
            .eq("id", session.id)

          results.push(`Completed session ${session.session_number} for ${gameType}`)
        }
      }

      // 2. Check if there's an open session
      const { data: openSession } = await supabase
        .from("game_sessions")
        .select("*")
        .eq("game_type", gameType)
        .eq("status", "open")
        .single()

      // 3. Create new session if none exists
      if (!openSession) {
        const { data: lastSession } = await supabase
          .from("game_sessions")
          .select("session_number")
          .eq("game_type", gameType)
          .order("session_number", { ascending: false })
          .limit(1)
          .single()

        const nextSessionNumber = getNextSessionNumber(gameType, lastSession?.session_number || 0)
        const now = new Date()
        const endTime = new Date(now.getTime() + duration * 60 * 1000)

        const { error: createError } = await supabase.from("game_sessions").insert({
          game_type: gameType,
          session_number: nextSessionNumber,
          start_time: now.toISOString(),
          end_time: endTime.toISOString(),
          draw_time: endTime.toISOString(),
          status: "open",
          results_data: {
            issue: nextSessionNumber.toString(),
            status: "accepting_bets",
            description: `${gameType} - Đang nhận cược`,
            session_type: gameType,
            duration_minutes: duration,
          },
        })

        if (!createError) {
          results.push(`Created new session ${nextSessionNumber} for ${gameType}`)
        } else {
          results.push(`Failed to create session for ${gameType}: ${createError.message}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Auto-draw completed for all game types",
      results: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Auto-draw error:", error)
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  // Allow POST method as well for manual triggers
  return GET(request)
}
