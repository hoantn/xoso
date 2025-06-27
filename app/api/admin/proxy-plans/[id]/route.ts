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

// PUT - Cập nhật gói proxy
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(request)
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description, price, duration_days, max_connections, proxy_type } = body

    const { data, error } = await supabase
      .from("proxy_plans")
      .update({
        name,
        description,
        price: Number.parseFloat(price),
        duration_days: Number.parseInt(duration_days),
        max_connections: Number.parseInt(max_connections),
        proxy_type,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating proxy plan:", error)
    return NextResponse.json({ error: "Lỗi khi cập nhật gói proxy" }, { status: 500 })
  }
}

// DELETE - Xóa gói proxy
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(request)
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { error } = await supabase.from("proxy_plans").delete().eq("id", params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting proxy plan:", error)
    return NextResponse.json({ error: "Lỗi khi xóa gói proxy" }, { status: 500 })
  }
}
