import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Tạo Supabase client với service role key
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email và mật khẩu là bắt buộc" }, { status: 400 })
    }

    // Hardcoded admin credentials cho demo
    // Trong production, bạn nên lưu hash password trong database
    const ADMIN_EMAIL = "admin@test.com"
    const ADMIN_PASSWORD = "admin123456"
    const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001"

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Email hoặc mật khẩu không đúng" }, { status: 401 })
    }

    // Kiểm tra role admin trong database
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .select("role")
      .eq("user_id", ADMIN_USER_ID)
      .single()

    if (profileError || !profileData) {
      return NextResponse.json({ error: "Tài khoản admin không tồn tại" }, { status: 403 })
    }

    if (profileData.role !== "admin" && profileData.role !== "super_admin") {
      return NextResponse.json({ error: "Bạn không có quyền truy cập trang admin" }, { status: 403 })
    }

    // Tạo session token cho admin
    const { data, error } = await supabaseAdmin.auth.admin.generateAccessToken({
      user_id: ADMIN_USER_ID,
      expires_in: 3600, // 1 hour
    })

    if (error) {
      console.error("Generate token error:", error)
      return NextResponse.json({ error: "Không thể tạo session" }, { status: 500 })
    }

    // Tạo fake session object
    const session = {
      access_token: data.access_token,
      refresh_token: "fake-refresh-token",
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: ADMIN_USER_ID,
        email: ADMIN_EMAIL,
        role: "authenticated",
        aud: "authenticated",
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error("Admin login error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
