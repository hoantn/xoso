import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: "Token không hợp lệ" }, { status: 400 })
    }

    // Verify token
    const user = AuthService.verifySessionToken(token)

    if (!user) {
      return NextResponse.json({ error: "Token hết hạn hoặc không hợp lệ" }, { status: 401 })
    }

    // Fetch fresh user data including balance
    const { data: freshUserData, error } = await supabase
      .from("users")
      .select("id, username, full_name, role, balance")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Error fetching fresh user data:", error)
      // Fallback to token data if DB fetch fails
      return NextResponse.json({
        user: {
          ...user,
          balance: user.balance || 0, // Đảm bảo balance có giá trị
        },
      })
    }

    // Return fresh user data with properly typed balance
    return NextResponse.json({
      user: {
        id: freshUserData.id,
        username: freshUserData.username,
        fullName: freshUserData.full_name,
        role: freshUserData.role,
        balance: freshUserData.balance ? Number(freshUserData.balance) : 0,
      },
    })
  } catch (error) {
    console.error("Verify error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
