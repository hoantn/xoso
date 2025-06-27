import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import type { UserSession } from "@/lib/auth"
import type { DepositRequest } from "@/lib/database" // Import DepositRequest type

// Helper function to get current user
async function getCurrentUser(request: Request): Promise<UserSession | null> {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    return AuthService.verifySessionToken(token)
  }
  return null
}

interface CombinedTransaction {
  id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  description: string
  status: string
  created_at: string
  metadata?: any
  reference_id?: string
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log(`[MY_TRANSACTIONS_GET] START - User: ${user.username} (ID: ${user.id})`)

  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10)
    const typeFilter = searchParams.get("type") || "all"
    const statusFilter = searchParams.get("status") || "all"

    const offset = (page - 1) * limit

    // 1. Fetch all transactions for the user
    const { data: transactionsData, error: transactionsError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)

    if (transactionsError) {
      console.error("[MY_TRANSACTIONS_GET] Fetch transactions error:", transactionsError)
      return NextResponse.json(
        { success: false, error: "Không thể tải giao dịch.", details: transactionsError.message },
        { status: 500 },
      )
    }
    const userTransactions: CombinedTransaction[] = (transactionsData || []).map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balance_before: t.balance_before || 0,
      balance_after: t.balance_after || 0,
      description: t.description || "",
      status: t.status,
      created_at: t.created_at,
      metadata: t.metadata,
      reference_id: t.reference_id,
    }))

    // 2. Fetch all deposit requests for the user
    const { data: depositRequestsData, error: drError } = await supabase
      .from("deposit_requests")
      .select("*")
      .eq("user_id", user.id)

    if (drError) {
      console.error("[MY_TRANSACTIONS_GET] Fetch deposit requests error:", drError)
      // Do not return error, proceed with transactions only
    }
    const depositRequests: DepositRequest[] = depositRequestsData || []

    // Identify completed deposit request IDs from actual transactions
    const completedDepositTransactionIds = new Set(
      userTransactions
        .filter((t) => t.type === "deposit" && t.status === "completed" && t.reference_id)
        .map((t) => t.reference_id),
    )

    // 3. Map and filter deposit requests to be combined
    const mappedDepositRequests: CombinedTransaction[] = depositRequests
      .filter((dr) => !completedDepositTransactionIds.has(dr.id)) // Exclude completed ones already in transactions table
      .map((dr) => ({
        id: dr.id, // Use deposit request ID
        type: "deposit", // Treat as 'deposit' type for consistency in filters
        amount: dr.amount,
        balance_before: 0, // Balance not affected yet for non-completed requests
        balance_after: 0, // Balance not affected yet for non-completed requests
        description: `Yêu cầu nạp tiền ${dr.amount.toLocaleString("vi-VN")} VNĐ (Mã GD: ${dr.transaction_id || "N/A"})`,
        status: dr.status, // pending, cancelled, failed
        created_at: dr.created_at,
        reference_id: dr.id, // Reference back to the deposit_request
        metadata: dr.payment_info_snapshot,
      }))

    // 4. Combine all events
    const allEvents = [...userTransactions, ...mappedDepositRequests]

    // 5. Sort the combined list by creation time (most recent first)
    allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // 6. Apply filters to the combined list
    let filteredEvents = allEvents
    if (typeFilter !== "all") {
      filteredEvents = filteredEvents.filter((t) => t.type === typeFilter)
    }
    if (statusFilter !== "all") {
      filteredEvents = filteredEvents.filter((t) => t.status === statusFilter)
    }

    // 7. Apply pagination to the filtered list
    const totalCount = filteredEvents.length
    const totalPages = Math.ceil(totalCount / limit)
    const paginatedEvents = filteredEvents.slice(offset, offset + limit)

    // 8. Calculate summary based on actual transactions (from transactions table only)
    const { data: allUserActualTransactions, error: allTransactionsError } = await supabase
      .from("transactions")
      .select("type, amount, status")
      .eq("user_id", user.id)

    let total_actual_transactions_summary = 0
    let total_deposits = 0
    let total_purchases = 0
    let total_adjustments = 0
    let total_refunds = 0
    let total_withdrawals = 0 // Khởi tạo total_withdrawals
    let current_balance = 0

    if (allUserActualTransactions) {
      total_actual_transactions_summary = allUserActualTransactions.length
      console.log(
        "[MY_TRANSACTIONS_GET] Calculating summary from allUserActualTransactions:",
        allUserActualTransactions.length,
        "records",
      )

      for (const t of allUserActualTransactions) {
        console.log(
          `[MY_TRANSACTIONS_GET] Processing transaction: Type=${t.type}, Amount=${t.amount}, Current total_purchases=${total_purchases}, Current total_withdrawals=${total_withdrawals}`,
        )

        if (t.type === "deposit") {
          total_deposits += Number(t.amount)
        } else if (t.type === "purchase") {
          // Changed from "proxy_purchase" to "purchase"
          total_purchases += Math.abs(Number(t.amount))
          console.log(
            `[MY_TRANSACTIONS_GET] Added proxy_purchase: ${Math.abs(Number(t.amount))}, New total_purchases=${total_purchases}`,
          )
        } else if (t.type === "admin_adjustment") {
          total_adjustments += Number(t.amount)
        } else if (t.type === "refund") {
          total_refunds += Number(t.amount)
        } else if (t.type === "withdrawal") {
          // Thêm loại 'withdrawal'
          total_withdrawals += Math.abs(Number(t.amount))
          console.log(
            `[MY_TRANSACTIONS_GET] Added withdrawal: ${Math.abs(Number(t.amount))}, New total_withdrawals=${total_withdrawals}`,
          )
        }
      }

      // Get current balance from user's record (most accurate)
      const { data: userData, error: userBalanceError } = await supabase
        .from("users")
        .select("balance")
        .eq("id", user.id)
        .single()

      if (userBalanceError) {
        console.error("[MY_TRANSACTIONS_GET] Error fetching user balance:", userBalanceError)
      } else if (userData) {
        current_balance = Number(userData.balance)
      }
    }
    console.log(
      `[MY_TRANSACTIONS_GET] Final summary: total_purchases=${total_purchases}, total_withdrawals=${total_withdrawals}`,
    )

    console.log(
      `[MY_TRANSACTIONS_GET] END - User: ${user.username}, Fetched ${paginatedEvents.length} transactions (combined). Total filtered: ${totalCount}`,
    )
    return NextResponse.json({
      success: true,
      data: paginatedEvents,
      pagination: {
        total: totalCount, // Total count of filtered combined events
        page: page,
        limit: limit,
        totalPages: totalPages,
      },
      summary: {
        total_transactions: total_actual_transactions_summary, // Actual transactions from DB, not combined count
        total_deposits,
        total_purchases,
        total_adjustments,
        total_refunds,
        total_withdrawals, // Thêm vào summary
        current_balance,
      },
    })
  } catch (error) {
    console.error(`[MY_TRANSACTIONS_GET] CATCH ERROR:`, error)
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
