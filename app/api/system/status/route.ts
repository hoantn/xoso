import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Kiểm tra kết nối database
    const { data: healthCheck, error: healthError } = await supabase.from("proxies").select("count").limit(1)

    if (healthError) {
      return NextResponse.json(
        {
          status: "error",
          message: "Database connection failed",
          error: healthError.message,
        },
        { status: 500 },
      )
    }

    // Lấy thông tin hệ thống
    const { data: proxiesCount } = await supabase.from("proxies").select("count")
    const { data: usersCount } = await supabase.from("user_profiles").select("count")
    const { data: statsCount } = await supabase.from("proxy_usage_stats").select("count")

    return NextResponse.json({
      status: "ok",
      database: "connected",
      stats: {
        proxies: proxiesCount?.[0]?.count || 0,
        users: usersCount?.[0]?.count || 0,
        usageStats: statsCount?.[0]?.count || 0,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("System status error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to check system status",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
