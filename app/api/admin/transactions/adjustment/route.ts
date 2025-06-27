import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

async function getCurrentAdminUser(request: Request) {
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

export async function POST(request: Request) {
  const adminUser = await getCurrentAdminUser(request)
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 })
  }

  console.log(`[ADMIN_ADJUSTMENT_POST] START - Admin: ${adminUser.username}`)

  try {
    const { userId, amount, description, type = "admin_adjustment" } = await request.json()
    console.log(`[ADMIN_ADJUSTMENT_POST] Body:`, { userId, amount, description, type })

    if (!userId || !amount || !description) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc: userId, amount, description" }, { status: 400 })
    }

    const adjustmentAmount = Number(amount)
    if (isNaN(adjustmentAmount) || adjustmentAmount === 0) {
      return NextResponse.json({ error: "Số tiền điều chỉnh không hợp lệ" }, { status: 400 })
    }

    // Lấy thông tin người dùng
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, username, balance")
      .eq("id", userId)
      .single()

    if (userError || !userData) {
      console.error("[ADMIN_ADJUSTMENT_POST] Error fetching user:", userError)
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 })
    }
    console.log("[ADMIN_ADJUSTMENT_POST] Found user:", userData)

    const currentBalance = Number(userData.balance) || 0
    const newBalance = currentBalance + adjustmentAmount

    if (newBalance < 0 && type !== "refund") {
      // Cho phép số dư âm nếu là refund, còn lại thì không
      // Tuy nhiên, logic refund nên phức tạp hơn, đây là ví dụ đơn giản
      // return NextResponse.json({ error: "Số dư sau điều chỉnh không thể âm" }, { status: 400 });
    }
    console.log("[ADMIN_ADJUSTMENT_POST] Balance calculation:", { currentBalance, adjustmentAmount, newBalance })

    // Bước 1: Tạo bản ghi giao dịch
    const transactionData = {
      user_id: userId,
      type: type,
      amount: adjustmentAmount,
      balance_before: currentBalance,
      balance_after: newBalance,
      description: description,
      status: "completed",
      created_by: adminUser.id,
      metadata: {
        admin_username: adminUser.username,
        admin_id: adminUser.id,
        adjustment_reason: description,
      },
    }
    console.log("[ADMIN_ADJUSTMENT_POST] Inserting transaction:", transactionData)
    const { data: transactionRecord, error: transactionError } = await supabase
      .from("transactions")
      .insert(transactionData)
      .select()
      .single()

    if (transactionError) {
      console.error("[ADMIN_ADJUSTMENT_POST] Error inserting transaction:", transactionError)
      return NextResponse.json({ error: "Không thể tạo giao dịch", details: transactionError.message }, { status: 500 })
    }
    console.log("[ADMIN_ADJUSTMENT_POST] Transaction inserted:", transactionRecord)

    // Bước 2: Cập nhật số dư người dùng
    const { error: updateError } = await supabase.from("users").update({ balance: newBalance }).eq("id", userId)

    if (updateError) {
      console.error("[ADMIN_ADJUSTMENT_POST] Error updating user balance:", updateError)
      await supabase
        .from("transactions")
        .update({ status: "failed", description: transactionData.description + " (Lỗi cập nhật số dư)" })
        .eq("id", transactionRecord.id)
      return NextResponse.json(
        { error: "Không thể cập nhật số dư người dùng", details: updateError.message },
        { status: 500 },
      )
    }
    console.log("[ADMIN_ADJUSTMENT_POST] User balance updated.")

    console.log(`[ADMIN_ADJUSTMENT_POST] END - Success. User: ${userData.username}`)
    return NextResponse.json({
      success: true,
      message: `Đã ${adjustmentAmount > 0 ? "cộng" : "trừ"} ${Math.abs(adjustmentAmount).toLocaleString("vi-VN")} VNĐ ${adjustmentAmount > 0 ? "vào" : "từ"} tài khoản ${userData.username}. Lý do: ${description}`,
      transaction: transactionRecord,
      new_balance: newBalance,
    })
  } catch (error) {
    console.error(`[ADMIN_ADJUSTMENT_POST] CATCH ERROR:`, error)
    return NextResponse.json(
      { error: "Lỗi server không xác định.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
