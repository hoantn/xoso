import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { username, password, email, secretKey } = await request.json()

    // Kiểm tra secret key
    const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "super-secret-admin-key"

    if (secretKey !== ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!username || !password || !email) {
      return NextResponse.json({ error: "Username, email và mật khẩu là bắt buộc" }, { status: 400 })
    }

    // Generate password hash
    const passwordHash = await AuthService.hashPassword(password)

    // In production, you would save this to database
    // For now, just return the hash for manual addition
    return NextResponse.json({
      success: true,
      message: "Admin account info generated",
      adminData: {
        id: `admin-${Date.now()}`,
        username,
        email,
        passwordHash,
        role: "admin",
        fullName: username,
      },
    })
  } catch (error) {
    console.error("Create admin error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
