import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { verifyAdminToken } from "@/lib/auth"

export async function GET(request: Request) {
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

    // Get event statistics
    const { data: eventStats, error: statsError } = await supabase
      .from("lottery_events")
      .select("status, event_type, game_type")

    if (statsError) {
      console.error("Error fetching event stats:", statsError)
      return NextResponse.json({ error: "Failed to fetch event statistics" }, { status: 500 })
    }

    // Get recent events
    const { data: recentEvents, error: recentError } = await supabase
      .from("lottery_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    if (recentError) {
      console.error("Error fetching recent events:", recentError)
      return NextResponse.json({ error: "Failed to fetch recent events" }, { status: 500 })
    }

    // Get pending events
    const { data: pendingEvents, error: pendingError } = await supabase
      .from("lottery_events")
      .select("*")
      .eq("status", "pending")
      .order("scheduled_at", { ascending: true })

    if (pendingError) {
      console.error("Error fetching pending events:", pendingError)
      return NextResponse.json({ error: "Failed to fetch pending events" }, { status: 500 })
    }

    // Calculate statistics
    const stats = {
      total: eventStats?.length || 0,
      pending: eventStats?.filter((e) => e.status === "pending").length || 0,
      processing: eventStats?.filter((e) => e.status === "processing").length || 0,
      completed: eventStats?.filter((e) => e.status === "completed").length || 0,
      failed: eventStats?.filter((e) => e.status === "failed").length || 0,
      byEventType: {},
      byGameType: {},
    }

    // Group by event type
    eventStats?.forEach((event) => {
      if (!stats.byEventType[event.event_type]) {
        stats.byEventType[event.event_type] = { total: 0, pending: 0, completed: 0, failed: 0 }
      }
      stats.byEventType[event.event_type].total++
      stats.byEventType[event.event_type][event.status]++
    })

    // Group by game type
    eventStats?.forEach((event) => {
      if (!stats.byGameType[event.game_type]) {
        stats.byGameType[event.game_type] = { total: 0, pending: 0, completed: 0, failed: 0 }
      }
      stats.byGameType[event.game_type].total++
      stats.byGameType[event.game_type][event.status]++
    })

    return NextResponse.json({
      success: true,
      statistics: stats,
      recentEvents: recentEvents || [],
      pendingEvents: pendingEvents || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error in events status API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
