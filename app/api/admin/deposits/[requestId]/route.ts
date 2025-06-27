// Giữ nguyên file này từ lần cập nhật trước, nó đã có logging chi tiết.
// Đảm bảo bạn đang sử dụng phiên bản có nhiều console.log để debug.
import { NextResponse } from "next/server"
import { AuthService, type AuthUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

async function getCurrentAdmin(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    try {
      const user = await AuthService.verifySessionToken(token)
      if (user && (user.role === "admin" || user.role === "super_admin")) {
        return user
      }
    } catch (error) {
      console.error("[ADMIN_DEPOSIT_PUT] Error verifying admin token:", error)
      return null
    }
  }
  return null
}

export async function PUT(request: Request, { params }: { params: { requestId: string } }) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !admin.id) {
    console.error("[ADMIN_DEPOSIT_PUT] Unauthorized or admin ID missing. Admin object:", admin)
    return NextResponse.json(
      { error: "Unauthorized: Admin access required or admin data incomplete." },
      { status: 401 },
    )
  }

  const { requestId } = params
  if (!requestId) {
    return NextResponse.json({ error: "Request ID is required" }, { status: 400 })
  }

  console.log(`\n--- [ADMIN_DEPOSIT_PUT] START ---`)
  console.log(`Request ID: ${requestId}, Admin ID: ${admin.id}, Admin Username: ${admin.username}`)

  try {
    const { status, admin_notes } = await request.json()
    console.log(`Request Body: status=${status}, admin_notes=${admin_notes}`)

    if (!status || !["completed", "cancelled", "failed"].includes(status)) {
      console.warn(`Invalid status received: ${status}`)
      return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 })
    }

    console.log("Fetching deposit request and user data...")
    const { data: depositRequest, error: fetchError } = await supabase
      .from("deposit_requests")
      .select("*, users (id, username, balance)")
      .eq("id", requestId)
      .single()

    if (fetchError || !depositRequest || !depositRequest.users) {
      console.error("Error fetching deposit request or user:", fetchError)
      const errorDetail = fetchError
        ? `${fetchError.message} (Code: ${fetchError.code})`
        : "Deposit request or user data not found."
      return NextResponse.json(
        { error: `Không tìm thấy yêu cầu nạp tiền hoặc người dùng. Details: ${errorDetail}` },
        { status: 404 },
      )
    }
    console.log("Found deposit request:", JSON.stringify(depositRequest, null, 2))

    if (depositRequest.status === "completed") {
      console.warn("Deposit request already completed.")
      return NextResponse.json({ error: "Yêu cầu này đã được hoàn thành trước đó." }, { status: 400 })
    }
    if (depositRequest.status !== "pending" && status === "completed") {
      console.warn(`Cannot complete request in status: ${depositRequest.status}`)
      return NextResponse.json(
        { error: `Không thể hoàn thành yêu cầu đã ở trạng thái ${depositRequest.status}.` },
        { status: 400 },
      )
    }

    if (status === "completed") {
      console.log("--- Processing 'completed' status ---")
      const currentUserBalance = Number(depositRequest.users.balance) || 0
      const depositAmount = Number(depositRequest.amount)
      if (isNaN(depositAmount) || depositAmount <= 0) {
        console.error("Invalid deposit amount:", depositRequest.amount)
        return NextResponse.json({ error: "Số tiền nạp không hợp lệ." }, { status: 400 })
      }
      const newBalance = currentUserBalance + depositAmount

      console.log(`User ID: ${depositRequest.user_id}`)
      console.log(`Current Balance: ${currentUserBalance}`)
      console.log(`Deposit Amount: ${depositAmount}`)
      console.log(`New Balance: ${newBalance}`)

      const transactionData = {
        user_id: depositRequest.user_id,
        type: "deposit",
        amount: depositAmount,
        balance_before: currentUserBalance,
        balance_after: newBalance,
        description:
          `Nạp tiền ${depositAmount.toLocaleString("vi-VN")} VNĐ. Mã GD ngân hàng: ${depositRequest.transaction_id || "N/A"}. ${admin_notes ? `Ghi chú của admin: ${admin_notes}` : ""}`.trim(),
        reference_id: depositRequest.id,
        status: "completed",
        created_by: admin.id,
        metadata: {
          deposit_request_id: depositRequest.id,
          bank_transaction_id: depositRequest.transaction_id,
          payment_method: depositRequest.payment_method,
          admin_notes: admin_notes,
          processed_by_admin_username: admin.username,
        },
      }
      console.log("Preparing to insert transaction. Data:", JSON.stringify(transactionData, null, 2))

      const { data: transactionRecord, error: transactionError } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select()
        .single()

      if (transactionError) {
        console.error("!!! CRITICAL: Error inserting transaction !!!")
        console.error("Error Code:", transactionError.code)
        console.error("Error Message:", transactionError.message)
        console.error("Error Details:", transactionError.details)
        console.error("Error Hint:", transactionError.hint)
        console.error("Data attempted:", JSON.stringify(transactionData, null, 2))
        return NextResponse.json(
          {
            error: "Lỗi nghiêm trọng: Không thể tạo bản ghi giao dịch.",
            details: transactionError.message,
            code: transactionError.code,
          },
          { status: 500 },
        )
      }
      console.log("SUCCESS: Transaction inserted:", JSON.stringify(transactionRecord, null, 2))

      // Log for realtime debugging
      console.log("🔔 TRANSACTION CREATED FOR REALTIME:", {
        transaction_id: transactionRecord.id,
        user_id: depositRequest.user_id,
        type: transactionRecord.type,
        status: transactionRecord.status,
        amount: transactionRecord.amount,
        timestamp: new Date().toISOString(),
        message: "This should trigger realtime notification",
      })

      console.log("Updating user balance...")
      const { error: updateBalanceError } = await supabase
        .from("users")
        .update({ balance: newBalance })
        .eq("id", depositRequest.user_id)

      if (updateBalanceError) {
        console.error("!!! CRITICAL: Error updating user balance !!!")
        console.error("Error Code:", updateBalanceError.code)
        console.error("Error Message:", updateBalanceError.message)
        console.warn("Attempting to mark transaction as failed due to balance update error...")
        await supabase
          .from("transactions")
          .update({
            status: "failed",
            description: transactionData.description + " (LỖI: Không thể cập nhật số dư người dùng)",
          })
          .eq("id", transactionRecord.id)
        return NextResponse.json(
          { error: "Lỗi cập nhật số dư người dùng sau khi tạo giao dịch.", details: updateBalanceError.message },
          { status: 500 },
        )
      }
      console.log("SUCCESS: User balance updated.")
    }

    console.log("Updating deposit request status...")
    const depositUpdates: any = { status, updated_at: new Date().toISOString() }
    if (admin_notes !== undefined) depositUpdates.admin_notes = admin_notes

    const { data: updatedRequest, error: updateRequestError } = await supabase
      .from("deposit_requests")
      .update(depositUpdates)
      .eq("id", requestId)
      .select("*, users(username, full_name)")
      .single()

    if (updateRequestError) {
      console.error("Error updating deposit request status:", updateRequestError)
      return NextResponse.json(
        { error: "Lỗi cập nhật trạng thái yêu cầu nạp tiền.", details: updateRequestError.message },
        { status: 500 },
      )
    }
    console.log("SUCCESS: Deposit request status updated.")
    console.log(`--- [ADMIN_DEPOSIT_PUT] END --- Request ID: ${requestId} processed successfully.`)
    return NextResponse.json({
      success: true,
      message: `Yêu cầu nạp tiền đã được cập nhật thành công.`,
      data: updatedRequest,
    })
  } catch (error) {
    console.error(`!!! UNHANDLED ERROR in [ADMIN_DEPOSIT_PUT] for Request ID: ${requestId} !!!`, error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Lỗi server không xác định.", details: errorMessage }, { status: 500 })
  }
}
