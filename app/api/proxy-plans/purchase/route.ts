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
    return NextResponse.json(
      {
        success: false,
        message: "Vui lòng đăng nhập để mua proxy.",
      },
      { status: 401 },
    )
  }

  try {
    const { plan_id } = await request.json()

    if (!plan_id) {
      return NextResponse.json(
        {
          success: false,
          message: "Vui lòng chọn gói proxy để mua.",
        },
        { status: 400 },
      )
    }

    console.log(`[Purchase] User ${user.username} (${user.id}) purchasing plan ${plan_id}`)

    // Gọi hàm RPC purchase_proxy_plan với service role
    const { data, error } = await supabase.rpc("purchase_proxy_plan", {
      p_user_id: user.id,
      p_plan_id: plan_id,
    })

    console.log(`[Purchase] RPC Response:`, { data, error })

    if (error) {
      console.error("Supabase RPC error purchasing proxy plan:", error)
      return NextResponse.json(
        {
          success: false,
          message: error.message || "Lỗi không xác định từ máy chủ khi mua proxy.",
        },
        { status: 500 },
      )
    }

    // Supabase RPC trả về một mảng, lấy phần tử đầu tiên
    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0]

      console.log(`[Purchase] Function Result:`, result)

      // Kiểm tra trường 'success' từ kết quả của hàm RPC
      if (result.success) {
        // Lấy thông tin proxy để trả về
        const { data: proxyData, error: proxyError } = await supabase
          .from("proxies")
          .select("*")
          .eq("id", result.proxy_id)
          .single()

        if (proxyError) {
          console.error("Error fetching proxy data:", proxyError)
        }

        // Lấy thông tin plan để trả về
        const { data: planData, error: planError } = await supabase
          .from("proxy_plans")
          .select("*")
          .eq("id", plan_id)
          .single()

        if (planError) {
          console.error("Error fetching plan data:", planError)
        }

        return NextResponse.json({
          success: true,
          message: result.message,
          data: {
            order_id: result.order_id,
            proxy_id: result.proxy_id,
            expires_at: result.expires_at,
            proxy_type: planData?.proxy_type || "mtproto",
            max_users: planData?.max_connections || 1,
            proxy_url: proxyData?.url || null,
            proxy_server: proxyData?.server || null,
            proxy_port: proxyData?.port || null,
            plan_name: planData?.name || "Unknown Plan",
          },
        })
      } else {
        // Nếu hàm RPC trả về success: false, sử dụng message từ hàm
        return NextResponse.json(
          {
            success: false,
            message: result.message,
          },
          { status: 400 }, // Bad Request vì lỗi logic nghiệp vụ
        )
      }
    } else {
      console.error("No data returned from RPC function or data is empty.")
      return NextResponse.json(
        {
          success: false,
          message: "Không nhận được phản hồi hợp lệ từ máy chủ.",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("General error purchasing proxy plan:", error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Lỗi hệ thống khi xử lý yêu cầu mua proxy.",
      },
      { status: 500 },
    )
  }
}
