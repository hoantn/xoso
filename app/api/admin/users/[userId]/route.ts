import { NextResponse } from "next/server"
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

export async function PUT(request: Request, { params }: { params: { userId: string } }) {
  const adminUser = await getCurrentAdminUser(request)
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 })
  }

  const { userId } = params
  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 })
  }

  try {
    const { role, is_active, fullName } = await request.json()
    const updates: { role?: string; is_active?: boolean; full_name?: string } = {}

    if (role && ["user", "admin", "super_admin"].includes(role)) {
      // Super admin không thể bị hạ role bởi admin thường
      if (adminUser.role !== "super_admin" && role !== "user") {
        const { data: targetUser } = await supabase.from("users").select("role").eq("id", userId).single()
        if (targetUser && targetUser.role === "super_admin") {
          return NextResponse.json({ error: "Admin không thể thay đổi role của Super Admin" }, { status: 403 })
        }
      }
      updates.role = role
    }
    if (is_active !== undefined) {
      updates.is_active = is_active
    }
    if (fullName !== undefined) {
      updates.full_name = fullName
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: "Không có thông tin nào được cập nhật" }, { status: 200 })
    }

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId)
      .select("id, username, full_name, role, is_active")
      .single()

    if (error) {
      console.error(`Error updating user ${userId}:`, error)
      return NextResponse.json({ error: "Lỗi cập nhật người dùng" }, { status: 500 })
    }
    if (!updatedUser) {
      return NextResponse.json({ error: "Không tìm thấy người dùng để cập nhật" }, { status: 404 })
    }

    return NextResponse.json({ message: "Cập nhật người dùng thành công", user: updatedUser })
  } catch (err) {
    console.error(`Server error updating user ${userId}:`, err)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
