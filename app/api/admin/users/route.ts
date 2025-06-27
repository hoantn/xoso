import { type NextRequest, NextResponse } from "next/server" // Import NextRequest
import { AuthService, type AuthUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

async function getCurrentAdminUser(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const user = AuthService.verifySessionToken(token)
    if (user && (user.role === "admin" || user.role === "super_admin")) {
      return user
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  // Change to NextRequest
  const adminUser = await getCurrentAdminUser(request)
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10") // Default limit to 10
    const search = searchParams.get("search")

    let query = supabase.from("users").select("id, username, full_name, role, is_active, created_at, updated_at", {
      count: "exact",
    })

    if (search) {
      query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: users, error, count } = await query.order("created_at", { ascending: false }).range(from, to)

    if (error) {
      console.error("Error fetching users for admin:", error)
      return NextResponse.json({ error: "Lỗi khi tải danh sách người dùng" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: users || [], // Đổi `users` thành `data`
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (err) {
    console.error("Server error fetching users for admin:", err)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
