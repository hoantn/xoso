import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: No token provided" }, { status: 401 })
    }

    // Sử dụng AuthService để verify token (không phải Supabase auth)
    const user = AuthService.verifySessionToken(token)

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or insufficient role" },
        { status: 401 },
      )
    }

    const json = await req.json()
    const { server, port, username, password, description, type, visibility, max_users, url: providedUrl } = json

    // Tạo URL từ các thông tin nếu không có sẵn
    let url = providedUrl || ""
    if (!url && server) {
      // Tạo URL dựa trên loại proxy
      if (type === "mtproto") {
        // Format: tg://proxy?server=SERVER&port=PORT&secret=SECRET
        url = `tg://proxy?server=${server}&port=${port || 443}&secret=${password || ""}`
      } else if (type === "socks5") {
        // Format: socks5://USERNAME:PASSWORD@SERVER:PORT
        const auth = username && password ? `${username}:${password}@` : ""
        url = `socks5://${auth}${server}:${port || 1080}`
      } else if (type === "http") {
        // Format: http://USERNAME:PASSWORD@SERVER:PORT
        const auth = username && password ? `${username}:${password}@` : ""
        url = `http://${auth}${server}:${port || 8080}`
      } else {
        // Default format
        url = `${server}:${port || 0}`
      }
    }

    if (!url) {
      return NextResponse.json(
        { success: false, message: "URL is required. Please provide server and port information." },
        { status: 400 },
      )
    }

    // Chuẩn bị dữ liệu để insert với tất cả các trường cần thiết
    const proxyData = {
      user_id: null, // Đặt user_id là NULL để proxy không thuộc tài khoản nào khi tạo
      url: url,
      server: server || "",
      host: server || "", // Sử dụng server làm host
      port: Number.parseInt(port) || 0,
      username: username || "",
      password: password || "",
      secret: password || "", // Sử dụng password làm secret cho MTProto
      description: description || "",
      type: type || "mtproto",
      proxy_type: type || "mtproto",
      visibility: visibility || "public",
      max_users: max_users || 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Insert proxy vào Supabase
    const { data: proxy, error } = await supabase.from("proxies").insert(proxyData).select().single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ success: false, message: "Failed to create proxy: " + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: proxy }, { status: 201 })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error: " + error.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: No token provided" }, { status: 401 })
    }

    // Sử dụng AuthService để verify token
    const user = AuthService.verifySessionToken(token)

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or insufficient role" },
        { status: 401 },
      )
    }

    // Parse query parameters for pagination
    const url = new URL(req.url)
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const limit = Number.parseInt(url.searchParams.get("limit") || "10")
    const search = url.searchParams.get("search") || ""

    // Calculate offset
    const offset = (page - 1) * limit

    // Build query
    let query = supabase.from("proxies").select("*", { count: "exact" })

    // Add search filter if provided
    if (search) {
      query = query.or(
        `server.ilike.%${search}%,description.ilike.%${search}%,url.ilike.%${search}%,host.ilike.%${search}%`,
      )
    }

    // Add pagination
    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data: proxies, error, count } = await query

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json(
        { success: false, message: "Failed to fetch proxies: " + error.message },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: proxies || [],
        total: count || 0,
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error: " + error.message }, { status: 500 })
  }
}
