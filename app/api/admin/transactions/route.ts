import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import type { UserSession } from "@/lib/auth"

async function getCurrentAdminUser(request: Request): Promise<UserSession | null> {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const user = await AuthService.verifySessionToken(token)
    if (user && (user.role === "admin" || user.role === "super_admin")) {
      return user
    }
  }
  return null
}

export async function GET(request: Request) {
  const user = await getCurrentAdminUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log(`[ADMIN_TRANSACTIONS_GET] START - Admin User: ${user.username} (ID: ${user.id})`)

  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10)
    const typeFilter = searchParams.get("type") || "all"
    const userIdFilter = searchParams.get("userId")
    const startDateFilter = searchParams.get("startDate")
    const endDateFilter = searchParams.get("endDate")

    const offset = (page - 1) * limit

    let query = supabase.from("transactions").select(
      `
        *,
        user:user_id(id, username, full_name),
        created_by_user:created_by(id, username, full_name)
      `,
      { count: "exact" },
    )

    if (typeFilter !== "all") {
      query = query.eq("type", typeFilter)
    }
    if (userIdFilter) {
      query = query.eq("user_id", userIdFilter)
    }
    if (startDateFilter) {
      query = query.gte("created_at", startDateFilter)
    }
    if (endDateFilter) {
      query = query.lte("created_at", endDateFilter)
    }

    const {
      data: transactions,
      error: fetchError,
      count,
    } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

    if (fetchError) {
      console.error("[ADMIN_TRANSACTIONS_GET] Fetch error:", fetchError)
      return NextResponse.json(
        { success: false, error: "Không thể tải giao dịch.", details: fetchError.message },
        { status: 500 },
      )
    }

    // Calculate totals for stats from ALL transactions (ignoring typeFilter for totals)
    // The previous logic was filtering by 'completed' status for totals, which is incorrect.
    let allStatsQuery = supabase.from("transactions").select("type, amount", { count: "exact" })

    if (userIdFilter) {
      allStatsQuery = allStatsQuery.eq("user_id", userIdFilter)
    }
    if (startDateFilter) {
      allStatsQuery = allStatsQuery.gte("created_at", startDateFilter)
    }
    if (endDateFilter) {
      allStatsQuery = allStatsQuery.lte("created_at", endDateFilter)
    }

    const { data: allTransactionsForStats, error: statsError } = await allStatsQuery

    if (statsError) {
      console.error("[ADMIN_TRANSACTIONS_GET] Error fetching all transactions for stats:", statsError)
      // Still proceed, just stats might be incomplete
    }

    let total_transactions = 0
    let total_deposits = 0
    let total_purchases = 0
    let total_adjustments = 0
    let total_refunds = 0 // Initialize total refunds
    let total_withdrawals = 0 // Initialize total withdrawals
    let total_volume = 0 // Sum of all amounts, positive for deposit/refund, negative for purchase

    if (allTransactionsForStats) {
      total_transactions = allTransactionsForStats.length
      console.log(
        "[ADMIN_TRANSACTIONS_GET] Calculating stats from allTransactionsForStats:",
        allTransactionsForStats.length,
        "records",
      )

      for (const t of allTransactionsForStats) {
        const amount = Number(t.amount)
        total_volume += amount // Sum all amounts for total volume
        console.log(
          `[ADMIN_TRANSACTIONS_GET] Processing transaction: Type=${t.type}, Amount=${amount}, Current total_purchases=${total_purchases}, Current total_withdrawals=${total_withdrawals}`,
        )

        if (t.type === "deposit") {
          total_deposits += amount
        } else if (t.type === "purchase") {
          // Changed from "proxy_purchase" to "purchase"
          total_purchases += Math.abs(amount) // Purchases are negative, count absolute value
          console.log(
            `[ADMIN_TRANSACTIONS_GET] Added proxy_purchase: ${Math.abs(amount)}, New total_purchases=${total_purchases}`,
          )
        } else if (t.type === "admin_adjustment") {
          total_adjustments += amount
        } else if (t.type === "refund") {
          total_refunds += amount // Refunds are positive
        } else if (t.type === "withdrawal") {
          // Thêm loại 'withdrawal'
          total_withdrawals += Math.abs(amount) // Rút tiền là âm, tính giá trị tuyệt đối
          console.log(
            `[ADMIN_TRANSACTIONS_GET] Added withdrawal: ${Math.abs(amount)}, New total_withdrawals=${total_withdrawals}`,
          )
        }
      }
    }
    console.log(
      `[ADMIN_TRANSACTIONS_GET] Final stats: total_purchases=${total_purchases}, total_withdrawals=${total_withdrawals}`,
    )

    const totalCountRecords = count || 0
    const totalPages = Math.ceil(totalCountRecords / limit)

    console.log(`[ADMIN_TRANSACTIONS_GET] END - Fetched ${transactions?.length || 0} transactions.`)
    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        total: totalCountRecords,
        page: page,
        limit: limit,
        totalPages: totalPages,
      },
      stats: {
        total_transactions,
        total_deposits,
        total_purchases,
        total_adjustments,
        total_refunds,
        total_withdrawals, // Thêm vào stats
        total_volume,
      },
    })
  } catch (error) {
    console.error(`[ADMIN_TRANSACTIONS_GET] CATCH ERROR:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi server không xác định.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
