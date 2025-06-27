import { NextResponse } from "next/server"
import { AuthService, type AuthUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { createClient } from "@supabase/supabase-js"

async function getCurrentUser(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    return AuthService.verifySessionToken(token)
  }
  return null
}

function generateTransactionId(userId: string): string {
  const userPart = userId.substring(0, 6).toUpperCase()
  const timestampPart = Date.now().toString().slice(-8)
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `RUT_${userPart}${timestampPart}_${randomPart}`
}

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let initialBalance = 0
  let newBalance = 0
  let withdrawalRequestId: string | null = null
  let transactionRecordId: string | null = null

  try {
    const { amount, bank_name, account_number, account_name } = await request.json()

    if (!amount || typeof amount !== "number" || amount <= 0) {
      throw new Error("Số tiền rút không hợp lệ.")
    }
    if (amount < 50000) {
      throw new Error("Số tiền rút tối thiểu là 50,000 VNĐ.")
    }
    if (!bank_name || !account_number || !account_name) {
      throw new Error("Vui lòng cung cấp đầy đủ thông tin tài khoản ngân hàng.")
    }

    // 1. Lấy số dư hiện tại của người dùng (sử dụng client thông thường vì đây là thao tác đọc)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("balance")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      console.error("Error fetching user balance:", userError)
      throw new Error("Không thể lấy thông tin số dư của bạn.")
    }
    initialBalance = Number(userData.balance) || 0

    if (initialBalance < amount) {
      throw new Error("Số dư không đủ để thực hiện giao dịch này.")
    }

    newBalance = initialBalance - amount
    const transactionId = generateTransactionId(user.id)
    const bankAccountDetailsSnapshot = {
      bank_name,
      account_number,
      account_name,
    }

    // Bắt đầu các thao tác ghi, sử dụng supabaseAdmin để bỏ qua RLS và đảm bảo tính nhất quán
    // 2. Trừ số dư người dùng ngay lập tức
    const { error: updateBalanceError } = await supabaseAdmin
      .from("users")
      .update({ balance: newBalance })
      .eq("id", user.id)

    if (updateBalanceError) {
      console.error("Error deducting user balance:", updateBalanceError)
      throw new Error("Lỗi khi trừ số dư người dùng.")
    }

    // 3. Tạo yêu cầu rút tiền
    const { data: withdrawalRequestData, error: insertRequestError } = await supabaseAdmin
      .from("withdrawal_requests")
      .insert({
        user_id: user.id,
        amount: amount,
        transaction_id: transactionId,
        status: "pending",
        bank_account_details_snapshot: bankAccountDetailsSnapshot,
      })
      .select("id")
      .single()

    if (insertRequestError) {
      console.error("Error creating withdrawal request:", insertRequestError)
      throw new Error("Không thể tạo yêu cầu rút tiền.")
    }
    withdrawalRequestId = withdrawalRequestData.id

    // 4. Tạo bản ghi giao dịch với trạng thái "pending"
    const { data: transactionRecord, error: insertTransactionError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "withdrawal",
        amount: -amount, // Số âm vì là giao dịch rút tiền
        balance_before: initialBalance,
        balance_after: newBalance,
        description: `Yêu cầu rút tiền ${amount.toLocaleString("vi-VN")} VNĐ về TK ${bank_name} ${account_number} đang chờ xử lý.`,
        status: "pending",
        reference_id: withdrawalRequestId,
        created_by: user.id, // Người dùng là người khởi tạo
        metadata: {
          withdrawal_request_id: withdrawalRequestId,
          bank_details: bankAccountDetailsSnapshot,
        },
      })
      .select("id")
      .single()

    if (insertTransactionError) {
      console.error("Error creating pending transaction:", insertTransactionError)
      throw new Error("Không thể tạo bản ghi giao dịch chờ xử lý.")
    }
    transactionRecordId = transactionRecord.id

    return NextResponse.json({
      message: "Yêu cầu rút tiền của bạn đã được gửi thành công và số dư đã được trừ.",
      withdrawal_request_id: withdrawalRequestId,
      transaction_id: transactionId,
    })
  } catch (error: any) {
    console.error("POST /api/withdrawals/request error:", error.message)

    // Rollback: Nếu có lỗi sau khi trừ tiền, cố gắng hoàn lại số dư
    if (newBalance !== initialBalance) {
      console.warn("Attempting to revert user balance due to error...")
      const { error: revertError } = await supabaseAdmin
        .from("users")
        .update({ balance: initialBalance })
        .eq("id", user.id)
      if (revertError) {
        console.error("CRITICAL: Failed to revert balance:", revertError)
      } else {
        console.log("Balance successfully reverted.")
      }
    }

    // Dọn dẹp các bản ghi đã tạo một phần nếu có lỗi
    if (withdrawalRequestId) {
      console.warn("Attempting to delete partial withdrawal request...")
      await supabaseAdmin.from("withdrawal_requests").delete().eq("id", withdrawalRequestId)
    }
    if (transactionRecordId) {
      console.warn("Attempting to delete partial transaction record...")
      await supabaseAdmin.from("transactions").delete().eq("id", transactionRecordId)
    }

    return NextResponse.json({ error: error.message || "Lỗi server khi tạo yêu cầu rút tiền." }, { status: 500 })
  }
}
