import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth"

interface BettingTransaction {
  id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  description: string
  metadata: any
  created_at: string
  game_bet_id: string | null
}

interface BettingStats {
  totalBets: number
  totalWins: number
  totalAmount: number
  winAmount: number
  lossAmount: number
  winRate: number
  todayBets: number
  todayWins: number
  todayAmount: number
}

function enhanceBettingDescription(transaction: BettingTransaction): string {
  const { description, type, amount } = transaction

  // Parse existing description for betting details
  if (type === "purchase" && description.includes("Cược")) {
    // Extract betting information from description
    const betMatch = description.match(/Cược\s+(.+?):\s*(\d+)\s*điểm/)
    if (betMatch) {
      const [, betType, points] = betMatch
      const betAmount = Math.abs(amount)

      // Enhanced description based on bet type
      if (betType.includes("lô_2_số")) {
        const numberMatch = description.match(/(\d{2})/)
        const number = numberMatch ? numberMatch[1] : "N/A"
        return `🎯 Cược Lô 2 Số: ${number} | Điểm cược: ${points} | Số tiền: ${betAmount.toLocaleString()}đ`
      } else if (betType.includes("lô_3_số")) {
        const numberMatch = description.match(/(\d{3})/)
        const number = numberMatch ? numberMatch[1] : "N/A"
        return `🎯 Cược Lô 3 Số: ${number} | Điểm cược: ${points} | Số tiền: ${betAmount.toLocaleString()}đ`
      } else if (betType.includes("đề")) {
        const numberMatch = description.match(/(\d{2})/)
        const number = numberMatch ? numberMatch[1] : "N/A"
        return `🎯 Cược Đề: ${number} | Điểm cược: ${points} | Số tiền: ${betAmount.toLocaleString()}đ`
      } else {
        return `🎯 ${description} | Số tiền: ${betAmount.toLocaleString()}đ`
      }
    }
  } else if (type === "bet_won") {
    const winAmount = amount
    if (description.includes("Thắng cược phiên")) {
      const sessionMatch = description.match(/phiên\s+(\d+)/)
      const session = sessionMatch ? sessionMatch[1] : "N/A"
      return `🏆 Thắng cược phiên ${session} | Tiền thắng: +${winAmount.toLocaleString()}đ`
    } else {
      return `🏆 ${description} | Tiền thắng: +${winAmount.toLocaleString()}đ`
    }
  }

  return description
}

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const user = AuthService.verifySessionToken(token)
    return user
  }
  return null
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log(`[BETTING_HISTORY_GET] START - User: ${user.username} (ID: ${user.id})`)

  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10)
    const typeFilter = searchParams.get("type") || "all"
    const offset = (page - 1) * limit

    // Build query for betting transactions
    let query = supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .in("type", ["purchase", "bet_won"]) // Only betting-related transactions
      .order("created_at", { ascending: false })

    // Apply type filter if specified
    if (typeFilter === "bet") {
      query = query.eq("type", "purchase")
    } else if (typeFilter === "win") {
      query = query.eq("type", "bet_won")
    }

    // Get paginated results
    const { data: transactions, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error("[BETTING_HISTORY_GET] Database error:", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    // Get statistics
    const { data: allBettingTransactions } = await supabase
      .from("transactions")
      .select("type, amount, created_at")
      .eq("user_id", user.id)
      .in("type", ["purchase", "bet_won"])

    // Calculate statistics
    const stats: BettingStats = {
      totalBets: 0,
      totalWins: 0,
      totalAmount: 0,
      winAmount: 0,
      lossAmount: 0,
      winRate: 0,
      todayBets: 0,
      todayWins: 0,
      todayAmount: 0,
    }

    const today = new Date().toISOString().split("T")[0]

    if (allBettingTransactions) {
      allBettingTransactions.forEach((transaction) => {
        const isToday = transaction.created_at.startsWith(today)

        if (transaction.type === "purchase") {
          stats.totalBets++
          stats.lossAmount += Math.abs(transaction.amount)
          if (isToday) {
            stats.todayBets++
            stats.todayAmount += Math.abs(transaction.amount)
          }
        } else if (transaction.type === "bet_won") {
          stats.totalWins++
          stats.winAmount += transaction.amount
          if (isToday) {
            stats.todayWins++
          }
        }
      })

      stats.totalAmount = stats.lossAmount
      stats.winRate = stats.totalBets > 0 ? Math.round((stats.totalWins / stats.totalBets) * 100) : 0
    }

    // Enhance descriptions
    const enhancedTransactions =
      transactions?.map((transaction) => ({
        ...transaction,
        enhanced_description: enhanceBettingDescription(transaction),
        formatted_amount: transaction.amount.toLocaleString(),
        formatted_balance_before: transaction.balance_before.toLocaleString(),
        formatted_balance_after: transaction.balance_after.toLocaleString(),
        is_win: transaction.type === "bet_won",
        is_bet: transaction.type === "purchase",
      })) || []

    console.log(`[BETTING_HISTORY_GET] END - Fetched ${enhancedTransactions.length} transactions`)

    return NextResponse.json({
      success: true,
      data: enhancedTransactions,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats,
    })
  } catch (error) {
    console.error(`[BETTING_HISTORY_GET] CATCH ERROR:`, error)
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
