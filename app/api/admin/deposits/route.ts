import { type NextRequest, NextResponse } from "next/server" // Import NextRequest
import { AuthService, type AuthUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

async function getCurrentAdmin(request: Request): Promise<AuthUser | null> {
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

export async function GET(request: NextRequest) {
  // Change to NextRequest
  const admin = await getCurrentAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "1")
  const limit = Number.parseInt(searchParams.get("limit") || "10")
  const status = searchParams.get("status")
  const searchTerm = searchParams.get("searchTerm") // Search by transaction_id or username

  const offset = (page - 1) * limit

  try {
    let query = supabase
      .from("deposit_requests")
      .select(
        `
        *,
        users (
          username,
          full_name
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status)
    }
    if (searchTerm) {
      query = query.or(`transaction_id.ilike.%${searchTerm}%,users.username.ilike.%${searchTerm}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching deposit requests:", error)
      return NextResponse.json({ error: "Không thể tải danh sách yêu cầu nạp tiền." }, { status: 500 })
    }

    return NextResponse.json({
      success: true, // Thêm success field
      data: data, // Đổi `data` thành `data` để nhất quán
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/admin/deposits error:", error)
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 })
  }
}
