import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// GET - Lấy danh sách gói proxy cho user
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("proxy_plans")
      .select("*")
      .eq("is_active", true)
      .order("price", { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching proxy plans:", error)
    return NextResponse.json({ error: "Lỗi khi tải gói proxy" }, { status: 500 })
  }
}
