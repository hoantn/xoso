import { NextResponse } from "next/server"
import { AuthService, type AuthUser } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"

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
      console.error("[ADMIN_WITHDRAWAL_PUT] Error verifying admin token:", error)
      return null
    }
  }
  return null
}

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function PUT(request: Request, { params }: { params: { requestId: string } }) {
  const admin = await getCurrentAdmin(request)
  if (!admin || !admin.id) {
    console.error("[ADMIN_WITHDRAWAL_PUT] Unauthorized or admin ID missing. Admin object:", admin)
    return NextResponse.json(
      { error: "Unauthorized: Admin access required or admin data incomplete." },
      { status: 401 },
    )
  }

  const { requestId } = params
  if (!requestId) {
    return NextResponse.json({ error: "Request ID is required" }, { status: 400 })
  }

  console.log(`\n--- [ADMIN_WITHDRAWAL_PUT] START ---`)
  console.log(`Request ID: ${requestId}, Admin ID: ${admin.id}, Admin Username: ${admin.username}`)

  try {
    const { status, admin_notes } = await request.json()
    console.log(`Request Body: status=${status}, admin_notes=${admin_notes}`)

    if (!status || !["completed", "cancelled", "failed"].includes(status)) {
      console.warn(`Invalid status received: ${status}`)
      return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 })
    }

    console.log("Fetching withdrawal request and user data...")
    const { data: withdrawalRequest, error: fetchError } = await supabaseAdmin // Use supabaseAdmin
      .from("withdrawal_requests")
      .select("*, users (id, username, balance)")
      .eq("id", requestId)
      .single()

    if (fetchError || !withdrawalRequest || !withdrawalRequest.users) {
      console.error("Error fetching withdrawal request or user:", fetchError)
      const errorDetail = fetchError
        ? `${fetchError.message} (Code: ${fetchError.code})`
        : "Withdrawal request or user data not found."
      return NextResponse.json(
        { error: `Không tìm thấy yêu cầu rút tiền hoặc người dùng. Details: ${errorDetail}` },
        { status: 404 },
      )
    }
    console.log("Found withdrawal request:", JSON.stringify(withdrawalRequest, null, 2))

    // Fetch the associated pending transaction
    const { data: associatedTransaction, error: fetchTransactionError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("reference_id", requestId)
      .eq("type", "withdrawal")
      .single()

    if (fetchTransactionError || !associatedTransaction) {
      console.error("Error fetching associated transaction:", fetchTransactionError)
      return NextResponse.json(
        { error: "Không tìm thấy giao dịch liên quan đến yêu cầu rút tiền này." },
        { status: 404 },
      )
    }
    console.log("Found associated transaction:", JSON.stringify(associatedTransaction, null, 2))

    if (withdrawalRequest.status !== "pending") {
      console.warn(`Withdrawal request already processed. Current status: ${withdrawalRequest.status}`)
      return NextResponse.json(
        { error: `Yêu cầu này đã được xử lý trước đó với trạng thái: ${withdrawalRequest.status}.` },
        { status: 400 },
      )
    }

    if (status === "completed") {
      console.log("--- Processing 'completed' status ---")

      // Cập nhật trạng thái yêu cầu rút tiền
      const { error: updateRequestError } = await supabaseAdmin
        .from("withdrawal_requests")
        .update({ status: "completed", admin_notes: admin_notes, updated_at: new Date().toISOString() })
        .eq("id", requestId)

      if (updateRequestError) {
        console.error("Error updating withdrawal request status to completed:", updateRequestError)
        throw new Error("Lỗi cập nhật trạng thái yêu cầu rút tiền.")
      }

      // Cập nhật trạng thái giao dịch liên quan
      const { error: updateTransactionError } = await supabaseAdmin
        .from("transactions")
        .update({
          status: "completed",
          description: associatedTransaction.description?.replace("đang chờ xử lý", "đã hoàn thành"),
          metadata: {
            ...associatedTransaction.metadata,
            admin_notes: admin_notes, // Add admin notes to transaction metadata
            processed_by_admin_username: admin.username,
          },
        })
        .eq("id", associatedTransaction.id)

      if (updateTransactionError) {
        console.error("Error updating associated transaction status to completed:", updateTransactionError)
        throw new Error("Lỗi cập nhật trạng thái giao dịch liên quan.")
      }
      console.log("SUCCESS: Withdrawal request and associated transaction marked as completed.")
    } else if (status === "cancelled" || status === "failed") {
      console.log(`--- Processing '${status}' status ---`)

      // Cập nhật trạng thái yêu cầu rút tiền
      const { error: updateRequestError } = await supabaseAdmin
        .from("withdrawal_requests")
        .update({ status: status, admin_notes: admin_notes, updated_at: new Date().toISOString() })
        .eq("id", requestId)

      if (updateRequestError) {
        console.error("Error updating withdrawal request status to cancelled/failed:", updateRequestError)
        throw new Error("Lỗi cập nhật trạng thái yêu cầu rút tiền.")
      }

      // Cập nhật trạng thái giao dịch liên quan
      const { error: updateTransactionError } = await supabaseAdmin
        .from("transactions")
        .update({
          status: status,
          description: associatedTransaction.description?.replace(
            "đang chờ xử lý",
            `đã ${status === "cancelled" ? "hủy" : "thất bại"}`,
          ),
          metadata: {
            ...associatedTransaction.metadata,
            admin_notes: admin_notes, // Add admin notes to transaction metadata
            processed_by_admin_username: admin.username,
          },
        })
        .eq("id", associatedTransaction.id)

      if (updateTransactionError) {
        console.error("Error updating associated transaction status to cancelled/failed:", updateTransactionError)
        throw new Error("Lỗi cập nhật trạng thái giao dịch liên quan.")
      }

      // Hoàn tiền vào số dư người dùng
      const currentUserBalance = Number(withdrawalRequest.users.balance) || 0
      const withdrawalAmount = Number(withdrawalRequest.amount)
      const newBalance = currentUserBalance + withdrawalAmount

      console.log(`Refunding ${withdrawalAmount} to user ${withdrawalRequest.user_id}. New balance: ${newBalance}`)

      const { error: updateBalanceError } = await supabaseAdmin
        .from("users")
        .update({ balance: newBalance })
        .eq("id", withdrawalRequest.user_id)

      if (updateBalanceError) {
        console.error("CRITICAL: Error refunding user balance:", updateBalanceError)
        throw new Error("Lỗi hoàn tiền vào số dư người dùng.")
      }

      // Tạo một bản ghi giao dịch hoàn tiền mới
      const { error: insertRefundTransactionError } = await supabaseAdmin.from("transactions").insert({
        user_id: withdrawalRequest.user_id,
        type: "refund", // Sử dụng loại 'refund'
        amount: withdrawalAmount, // Số dương cho hoàn tiền
        balance_before: currentUserBalance,
        balance_after: newBalance,
        description: `Hoàn tiền rút ${withdrawalAmount.toLocaleString("vi-VN")} VNĐ do yêu cầu bị ${status === "cancelled" ? "hủy" : "thất bại"}.`,
        status: "completed", // Giao dịch hoàn tiền này là hoàn thành
        reference_id: withdrawalRequest.id, // Tham chiếu đến yêu cầu rút tiền gốc
        created_by: admin.id, // Admin là người khởi tạo hoàn tiền
        metadata: {
          original_withdrawal_request_id: withdrawalRequest.id,
          admin_notes: admin_notes,
          processed_by_admin_username: admin.username,
        },
      })

      if (insertRefundTransactionError) {
        console.error("CRITICAL: Error creating refund transaction:", insertRefundTransactionError)
        // Ngay cả khi lỗi này xảy ra, số dư đã được cập nhật, nên chúng ta tiếp tục nhưng ghi lại lỗi nghiêm trọng.
      }
      console.log(
        "SUCCESS: Withdrawal request marked as cancelled/failed, associated transaction updated, and balance refunded.",
      )
    }

    console.log(`--- [ADMIN_WITHDRAWAL_PUT] END --- Request ID: ${requestId} processed successfully.`)
    return NextResponse.json({
      success: true,
      message: `Yêu cầu rút tiền đã được cập nhật thành công.`,
      data: withdrawalRequest, // Trả về dữ liệu yêu cầu gốc, có thể cập nhật lại từ DB nếu cần
    })
  } catch (error) {
    console.error(`!!! UNHANDLED ERROR in [ADMIN_WITHDRAWAL_PUT] for Request ID: ${requestId} !!!`, error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Lỗi server không xác định.", details: errorMessage }, { status: 500 })
  }
}
