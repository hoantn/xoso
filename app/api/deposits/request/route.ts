import { NextResponse } from "next/server"
import { AuthService, type AuthUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

async function getCurrentUser(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7) // Remove "Bearer "
    return AuthService.verifySessionToken(token)
  }
  return null
}

function generateTransactionId(userId: string): string {
  const userPart = userId.substring(0, 6).toUpperCase()
  const timestampPart = Date.now().toString().slice(-8)
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `NAP_${userPart}${timestampPart}_${randomPart}`
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { amount } = await request.json()

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Số tiền nạp không hợp lệ." }, { status: 400 })
    }
    if (amount < 10000) {
      return NextResponse.json({ error: "Số tiền nạp tối thiểu là 10,000 VNĐ." }, { status: 400 })
    }

    // Fetch active bank account from the database
    const { data: activeBankAccount, error: fetchBankError } = await supabase
      .from("bank_accounts")
      .select("bank_id, bank_name, account_number, account_name, qr_template") // Sử dụng account_name
      .eq("is_active", true)
      .single()

    if (fetchBankError || !activeBankAccount) {
      console.error("Error fetching active bank account or no active account found:", fetchBankError)
      return NextResponse.json(
        {
          error:
            "Hệ thống chưa được cấu hình để nhận tiền nạp hoặc không tìm thấy tài khoản ngân hàng hoạt động. Vui lòng liên hệ admin.",
        },
        { status: 503 }, // Service Unavailable
      )
    }

    const {
      bank_id: bankId,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName, // Sử dụng account_name
      qr_template: template,
    } = activeBankAccount

    const transactionId = generateTransactionId(user.id)
    const transferMemo = `${transactionId}`

    // Sử dụng accountName trong URL QR Code
    const qrCodeUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(transferMemo)}&accountName=${encodeURIComponent(accountName)}`

    const paymentInfoSnapshot = {
      bank_id: bankId,
      bank_name: bankName,
      account_name: accountName, // Sử dụng account_name
      account_number: accountNumber,
      transfer_memo: transferMemo,
      qr_code_url: qrCodeUrl,
      amount_deposited: amount,
      used_bank_account_details: activeBankAccount,
    }

    const { data: depositRequestData, error: insertError } = await supabase
      .from("deposit_requests")
      .insert({
        user_id: user.id,
        amount: amount,
        transaction_id: transactionId,
        status: "pending",
        payment_info_snapshot: paymentInfoSnapshot,
      })
      .select("id")
      .single()

    if (insertError) {
      console.error("Error creating deposit request:", insertError)
      return NextResponse.json({ error: "Không thể tạo yêu cầu nạp tiền. " + insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Yêu cầu nạp tiền đã được tạo thành công.",
      deposit_request_id: depositRequestData.id,
      transaction_id: transactionId,
      bank_details: {
        bank_name: bankName,
        account_name: accountName, // Sử dụng account_name
        account_number: accountNumber,
        transfer_memo: transferMemo,
        amount: amount,
      },
      qr_code_url: qrCodeUrl,
    })
  } catch (error) {
    console.error("POST /api/deposits/request error:", error)
    return NextResponse.json({ error: "Lỗi server khi tạo yêu cầu nạp tiền." }, { status: 500 })
  }
}
