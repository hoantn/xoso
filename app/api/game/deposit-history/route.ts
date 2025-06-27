import { type NextRequest, NextResponse } from "next/server"
import { getAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status") || "all"

    // Get authenticated user using our custom auth system
    const { user, error: authError } = await getAuth(request)

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from("deposit_requests")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (status !== "all") {
      query = query.eq("status", status)
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: deposits, error, count } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Calculate summary statistics
    const { data: summaryData } = await supabase
      .from("deposit_requests")
      .select("amount, status")
      .eq("user_id", user.id)

    const summary = {
      total_requests: summaryData?.length || 0,
      total_completed: summaryData?.filter((d) => d.status === "completed").length || 0,
      total_pending: summaryData?.filter((d) => d.status === "pending").length || 0,
      total_amount: summaryData?.filter((d) => d.status === "completed").reduce((sum, d) => sum + d.amount, 0) || 0,
    }

    return NextResponse.json({
      success: true,
      data: deposits || [],
      pagination: {
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        totalItems: count || 0,
      },
      summary,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
