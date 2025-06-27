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

export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { data, error } = await supabase.rpc("cleanup_expired_proxies")

    if (error) throw error

    return NextResponse.json({ updated_count: data })
  } catch (error) {
    console.error("Error cleaning up expired proxies:", error)
    return NextResponse.json({ error: "Lỗi khi cleanup proxy hết hạn" }, { status: 500 })
  }
}
