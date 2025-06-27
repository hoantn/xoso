import { type NextRequest, NextResponse } from "next/server"
import { AuthService, type AuthUser } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js" // Import createClient

// Initialize Supabase client with service role key to bypass RLS for admin queries
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    persistSession: false, // Do not persist session for service role client
  },
})

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
    let query = supabaseAdmin // Use supabaseAdmin here to bypass RLS
      .from("withdrawal_requests")
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
      // Note: Supabase's `or` clause with `ilike` on joined tables might need specific handling
      // For simplicity, we'll assume direct column access for now.
      // If `users.username` search doesn't work, you might need a separate query or a view.
      query = query.or(`transaction_id.ilike.%${searchTerm}%,users.username.ilike.%${searchTerm}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching withdrawal requests (admin service role):", error) // Debug log
      return NextResponse.json({ error: "Không thể tải danh sách yêu cầu rút tiền." }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("GET /api/admin/withdrawals error:", error)
    return NextResponse.json({ error: "Lỗi server." }, { status: 500 })
  }
}
