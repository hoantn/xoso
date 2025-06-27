import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    return AuthService.verifySessionToken(token)
  }
  return null
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log(`[PROXY_PURCHASE_POST] START - User: ${user.username} (ID: ${user.id})`)

  try {
    const { proxy_id, price, description } = await request.json() // Thêm description từ client nếu cần
    console.log(`[PROXY_PURCHASE_POST] Body:`, { proxy_id, price, description })

    if (!proxy_id || price === undefined || price === null) {
      return NextResponse.json({ error: "Thiếu thông tin proxy_id hoặc price" }, { status: 400 })
    }

    const purchasePrice = Number(price)
    if (isNaN(purchasePrice) || purchasePrice <= 0) {
      return NextResponse.json({ error: "Giá không hợp lệ" }, { status: 400 })
    }

    const purchaseDescription = description || `Mua proxy ID ${proxy_id}`

    // Gọi stored function để thực hiện mua proxy
    console.log(`[PROXY_PURCHASE_POST] Calling purchase_proxy function with:`, {
      p_user_id: user.id,
      p_proxy_id: proxy_id,
      p_price: purchasePrice,
      p_description: purchaseDescription,
    })
    const { data: result, error: rpcError } = await supabase.rpc("purchase_proxy", {
      p_user_id: user.id,
      p_proxy_id: proxy_id,
      p_price: purchasePrice,
      p_description: purchaseDescription,
    })

    if (rpcError) {
      console.error("[PROXY_PURCHASE_POST] Error calling purchase_proxy RPC:", rpcError)
      return NextResponse.json({ error: "Lỗi khi gọi hàm mua proxy.", details: rpcError.message }, { status: 500 })
    }

    console.log("[PROXY_PURCHASE_POST] RPC result:", result)

    // Hàm RPC trả về một mảng, ta lấy phần tử đầu tiên
    const purchaseResult = Array.isArray(result) ? result[0] : result

    if (!purchaseResult || !purchaseResult.success) {
      return NextResponse.json(
        { error: purchaseResult?.message || "Mua proxy thất bại.", details: purchaseResult },
        { status: 400 },
      )
    }

    console.log(`[PROXY_PURCHASE_POST] END - Success. User: ${user.username}`)
    return NextResponse.json({
      success: true,
      message: purchaseResult.message,
      transaction_id: purchaseResult.transaction_id,
      new_balance: purchaseResult.new_balance,
    })
  } catch (error) {
    console.error(`[PROXY_PURCHASE_POST] CATCH ERROR:`, error)
    return NextResponse.json(
      { error: "Lỗi server không xác định.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
