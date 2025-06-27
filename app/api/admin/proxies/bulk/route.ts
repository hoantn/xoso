import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { ProxyInsert } from "@/lib/database"

export async function POST(request: NextRequest) {
  console.log("🔧 Admin bulk proxy POST request received")

  try {
    // Verify admin authentication
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ Missing or invalid authorization header")
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log("🔐 Token extracted, length:", token.length)

    // Verify admin token
    const { data: adminResult, error: adminError } = await supabase
      .from("users")
      .select("id, username, role")
      .eq("token", token)
      .eq("role", "admin")
      .single()

    if (adminError || !adminResult) {
      console.log("❌ Invalid admin token")
      return NextResponse.json({ error: "Invalid admin token" }, { status: 401 })
    }

    console.log("👤 Admin user verified:", adminResult.username)

    const proxiesToInsert: Omit<ProxyInsert, "user_id">[] = await request.json()
    console.log(`📝 Received ${proxiesToInsert.length} proxies for bulk insert`)

    if (!Array.isArray(proxiesToInsert) || proxiesToInsert.length === 0) {
      return NextResponse.json({ error: "Invalid input: expected an array of proxies" }, { status: 400 })
    }

    const insertData = proxiesToInsert.map((proxy) => ({
      server: proxy.server?.trim() || "",
      port: proxy.port ? Number.parseInt(proxy.port as any) : 0, // Ensure port is number
      username: proxy.username?.trim() || "",
      password: proxy.password?.trim() || "",
      description: proxy.description?.trim() || "",
      type: proxy.type,
      is_active: true, // Default to active for bulk import
      visibility: proxy.visibility || "public",
      max_users: proxy.max_users || 1, // Default to 1 if not provided
      current_users: 0, // Always start at 0
      user_id: null, // Admin-added proxies are public
    }))

    console.log("💾 Inserting proxies into database...")

    const { data: result, error } = await supabase.from("proxies").insert(insertData).select("id") // Select only ID to reduce payload

    if (error) {
      console.error("❌ Failed to bulk insert proxies:", error)
      return NextResponse.json(
        {
          error: "Database error during bulk insert",
          details: error?.message || "Failed to insert proxies",
        },
        { status: 500 },
      )
    }

    console.log(`✅ Successfully inserted ${result?.length || 0} proxies`)
    return NextResponse.json({
      success: true,
      added: result?.length || 0,
      message: `Đã thêm thành công ${result?.length || 0} proxy`,
    })
  } catch (error) {
    console.error("💥 Unhandled error in admin bulk proxy creation:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
