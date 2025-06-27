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

export async function GET(request: Request) {
  const user = await getCurrentUser(request)
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from("proxies")
      .select("id, server, port, type, description, max_users, current_users, is_active, created_at")
      .order("current_users", { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching proxy stats:", error)
    return NextResponse.json({ error: "Lỗi khi tải thống kê proxy" }, { status: 500 })
  }
}
