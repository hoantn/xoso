import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const gameType = searchParams.get("gameType")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    if (!gameType) {
      return NextResponse.json({ error: "Missing gameType parameter" }, { status: 400 })
    }

    let gameTypes: string[] = []

    if (gameType === "lode_nhanh") {
      gameTypes = ["lode_nhanh_1p", "lode_nhanh_3p"]
    } else if (gameType === "lode_mien_bac") {
      gameTypes = ["lode_mien_bac"]
    } else {
      gameTypes = [gameType]
    }

    // Fetch recent completed sessions
    const { data: recentResults, error } = await supabase
      .from("game_sessions")
      .select(`
        id,
        game_type,
        session_number,
        status,
        winning_numbers,
        results_data,
        draw_time,
        created_at
      `)
      .in("game_type", gameTypes)
      .eq("status", "completed")
      .not("winning_numbers", "is", null)
      .order("session_number", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error fetching recent results:", error)
      return NextResponse.json({ error: "Failed to fetch recent results" }, { status: 500 })
    }

    // Format results for display
    const formattedResults =
      recentResults?.map((result) => ({
        id: result.id,
        game_type: result.game_type,
        session_number: result.session_number,
        status: result.status,
        winning_number: result.winning_numbers?.[0] || "00",
        special_prize: result.results_data?.special_prize || "00000",
        draw_time_formatted: new Date(result.draw_time).toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "2-digit",
        }),
        session_type: result.results_data?.session_type || "unknown",
        bonus_info: result.results_data?.bonus_info || null,
        full_results: result.results_data,
      })) || []

    return NextResponse.json({
      results: formattedResults,
      total: formattedResults.length,
    })
  } catch (error) {
    console.error("Error in recent-results API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
