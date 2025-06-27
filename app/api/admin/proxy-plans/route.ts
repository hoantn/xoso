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

// GET - Lấy danh sách gói proxy
export async function GET() {
  try {
    const { data, error } = await supabase.from("proxy_plans").select("*").order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching proxy plans:", error)
    return NextResponse.json({ error: "Lỗi khi tải gói proxy" }, { status: 500 })
  }
}

// POST - Tạo gói proxy mới
export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description, price, duration_days, max_connections, proxy_type } = body

    const { data, error } = await supabase
      .from("proxy_plans")
      .insert({
        name,
        description,
        price: Number.parseFloat(price),
        duration_days: Number.parseInt(duration_days),
        max_connections: Number.parseInt(max_connections),
        proxy_type: proxy_type || "mtproto",
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating proxy plan:", error)
    return NextResponse.json({ error: "Lỗi khi tạo gói proxy" }, { status: 500 })
  }
}
