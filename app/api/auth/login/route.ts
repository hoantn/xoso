import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    const { user, error } = await AuthService.login({ username, password })

    if (error || !user) {
      return NextResponse.json({ error: error || "Đăng nhập thất bại" }, { status: 400 })
    }

    // Fetch fresh balance from database
    const { data: userData, error: fetchError } = await supabase
      .from("users")
      .select("balance")
      .eq("id", user.id)
      .single()

    if (!fetchError && userData) {
      // Update user with fresh balance
      user.balance = userData.balance ? Number(userData.balance) : 0
    }

    // Create session token
    const token = AuthService.createSessionToken(user)

    return NextResponse.json({ user, token })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
