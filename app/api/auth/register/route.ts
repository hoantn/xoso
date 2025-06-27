import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { username, password, fullName } = await request.json()

    const { user, error } = await AuthService.register({ username, password, fullName })

    if (error || !user) {
      return NextResponse.json({ error: error || "Đăng ký thất bại" }, { status: 400 })
    }

    // Đảm bảo user mới có balance = 0
    user.balance = 0

    // Create session token
    const token = AuthService.createSessionToken(user)

    return NextResponse.json({ user, token })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
