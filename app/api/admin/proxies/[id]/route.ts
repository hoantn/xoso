import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth"

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get("Authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    if (!token) {
      return NextResponse.json({ message: "Unauthorized: No token provided" }, { status: 401 })
    }

    const user = AuthService.verifySessionToken(token)

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return NextResponse.json({ message: "Unauthorized: Invalid token or insufficient role" }, { status: 401 })
    }

    const json = await req.json()
    const { server, port, username, password, description, type, visibility, max_users } = json

    const { data: proxy, error } = await supabase
      .from("proxies")
      .update({
        server: server || "",
        port: Number.parseInt(port) || 0,
        username: username || "",
        password: password || "",
        description: description || "",
        type: type || "mtproto",
        visibility: visibility || "public",
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ message: "Failed to update proxy: " + error.message }, { status: 500 })
    }

    return NextResponse.json(proxy, { status: 200 })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ message: "Internal server error: " + error.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const authHeader = req.headers.get("Authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    if (!token) {
      return NextResponse.json({ message: "Unauthorized: No token provided" }, { status: 401 })
    }

    const user = AuthService.verifySessionToken(token)

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return NextResponse.json({ message: "Unauthorized: Invalid token or insufficient role" }, { status: 401 })
    }

    const { error } = await supabase.from("proxies").delete().eq("id", params.id)

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ message: "Failed to delete proxy: " + error.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Proxy deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ message: "Internal server error: " + error.message }, { status: 500 })
  }
}
