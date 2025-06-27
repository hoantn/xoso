import { NextResponse } from "next/server"
import { AuthService, type AuthUser as AuthLibUser } from "@/lib/auth" // Renamed to avoid conflict
import { supabase } from "@/lib/supabase"

// Define AuthUser type for this API context if it's different or for clarity
interface ApiAuthUser extends AuthLibUser {
  balance?: number // Assuming balance is numeric
}

async function getCurrentUser(request: Request): Promise<ApiAuthUser | null> {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7) // Remove "Bearer "
    // AuthService.verifySessionToken should ideally return balance too
    // For now, we fetch fresh from DB below
    return AuthService.verifySessionToken(token) as ApiAuthUser | null
  }
  return null
}

// GET: Lấy thông tin user hiện tại
export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: dbUser, error } = await supabase
    .from("users")
    .select("id, username, full_name, role, created_at, balance") // Ensure balance is selected
    .eq("id", user.id)
    .single()

  if (error || !dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  // Convert balance to number if it's not already
  const responseUser = {
    ...dbUser,
    balance: dbUser.balance !== null ? Number(dbUser.balance) : 0,
  }

  return NextResponse.json(responseUser)
}

// PUT: Cập nhật thông tin user hiện tại
export async function PUT(request: Request) {
  const userSession = await getCurrentUser(request) // Use a different name to avoid conflict
  if (!userSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { fullName, oldPassword, newPassword } = await request.json()
    const updates: { full_name?: string; password_hash?: string } = {}

    if (fullName !== undefined) {
      updates.full_name = fullName.trim() || null
    }

    if (newPassword) {
      if (!oldPassword) {
        return NextResponse.json({ error: "Mật khẩu cũ là bắt buộc để đổi mật khẩu" }, { status: 400 })
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự" }, { status: 400 })
      }

      const { data: dbUserForPassword, error: fetchError } = await supabase
        .from("users")
        .select("password_hash")
        .eq("id", userSession.id)
        .single()

      if (fetchError || !dbUserForPassword) {
        return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 })
      }

      const isOldPasswordValid = await AuthService.verifyPassword(oldPassword, dbUserForPassword.password_hash)
      if (!isOldPasswordValid) {
        return NextResponse.json({ error: "Mật khẩu cũ không đúng" }, { status: 400 })
      }
      updates.password_hash = await AuthService.hashPassword(newPassword)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "Không có thông tin nào được cập nhật" }, { status: 200 })
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userSession.id)
      .select("id, username, full_name, role, balance") // Ensure balance is selected
      .single()

    if (updateError) {
      console.error("Update user error:", updateError)
      return NextResponse.json({ error: "Lỗi cập nhật thông tin" }, { status: 500 })
    }

    const responseUser = updatedUser
      ? {
          ...updatedUser,
          balance: updatedUser.balance !== null ? Number(updatedUser.balance) : 0,
        }
      : null

    return NextResponse.json({ message: "Cập nhật thông tin thành công", user: responseUser })
  } catch (error) {
    console.error("PUT /api/users/me error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
