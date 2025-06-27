import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Check transactions table
    const { data: transactions, error: transError } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)

    // Check deposit requests
    const { data: deposits, error: depositError } = await supabase
      .from("deposit_requests")
      .select(`
        *,
        users(username, balance)
      `)
      .order("created_at", { ascending: false })
      .limit(20)

    // Check users
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, username, balance, role")
      .eq("role", "user")
      .limit(10)

    return NextResponse.json({
      success: true,
      debug_info: {
        transactions: {
          count: transactions?.length || 0,
          data: transactions || [],
          error: transError,
        },
        deposits: {
          count: deposits?.length || 0,
          data: deposits || [],
          error: depositError,
        },
        users: {
          count: users?.length || 0,
          data: users || [],
          error: userError,
        },
      },
    })
  } catch (error) {
    console.error("Debug API error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
