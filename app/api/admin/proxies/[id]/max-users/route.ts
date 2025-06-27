import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    return AuthService.verifySessionToken(token)
  }
  return null
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(request)
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { max_users } = await request.json()

    const { data, error } = await supabase
      .from("proxies")
      .update({ max_users: Number.parseInt(max_users) })
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating max users:", error)
    return NextResponse.json({ error: "Lỗi khi cập nhật giới hạn người dùng" }, { status: 500 })
  }
}
