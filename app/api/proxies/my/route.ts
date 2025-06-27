import { type NextRequest, NextResponse } from "next/server"
import { AuthService, type AuthUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import type { Proxy } from "@/lib/database" // Import Proxy type for consistency

async function getCurrentUser(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7) // Remove "Bearer "
    return AuthService.verifySessionToken(token)
  }
  return null
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search")

    const from = (page - 1) * limit
    const to = from + limit - 1

    // Bước 1: Lấy proxy_id từ bảng proxy_orders của người dùng
    const proxyOrdersQuery = supabase
      .from("proxy_orders")
      .select("proxy_id, expires_at", { count: "exact" }) // Select proxy_id and expires_at
      .eq("user_id", user.id)
      .eq("status", "active") // Only get active orders
      .gte("expires_at", new Date().toISOString()) // Only get non-expired orders

    if (search) {
      // For search, we need to join first or query proxies table for search
      // For simplicity, let's just filter after fetching all if search is on proxy details
      // A more complex query would involve joining proxies table in the initial select
      // For now, search applies only to the eventual proxy details, not order details.
      // This might require a database view or function for more efficient searching across joins.
    }

    const {
      data: orderData,
      error: orderError,
      count: totalOrdersCount,
    } = await proxyOrdersQuery.order("created_at", { ascending: false }).range(from, to)

    if (orderError) {
      console.error("Error fetching user's proxy orders:", orderError)
      return NextResponse.json({ error: "Lỗi khi tải đơn hàng proxy của bạn" }, { status: 500 })
    }

    const proxyIds = orderData?.map((order) => order.proxy_id) || []

    // Bước 2: Lấy thông tin chi tiết proxy từ bảng proxies dựa trên proxy_id
    let proxies: Proxy[] = []
    let totalCount = 0

    if (proxyIds.length > 0) {
      let proxyDetailsQuery = supabase.from("proxies").select("*").in("id", proxyIds) // Filter by the proxy_ids obtained from proxy_orders

      if (search) {
        proxyDetailsQuery = proxyDetailsQuery.or(`server.ilike.%${search}%,description.ilike.%${search}%`)
      }

      const { data: fetchedProxies, error: proxiesError, count: actualProxiesCount } = await proxyDetailsQuery

      if (proxiesError) {
        console.error("Error fetching proxy details:", proxiesError)
        return NextResponse.json({ error: "Lỗi khi tải chi tiết proxy" }, { status: 500 })
      }

      proxies = fetchedProxies || []
      totalCount = actualProxiesCount || 0

      // Add expires_at to each proxy from its order for display
      const proxiesWithExpiry = proxies.map((proxy) => {
        const order = orderData?.find((order) => order.proxy_id === proxy.id)
        return {
          ...proxy,
          expires_at: order?.expires_at || null, // Attach expires_at from proxy_orders
        } as Proxy // Cast to Proxy type, assuming Proxy might have an expires_at field now
      })
      proxies = proxiesWithExpiry
    }

    return NextResponse.json({
      success: true,
      data: proxies,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (err) {
    console.error("Server error fetching user's proxies:", err)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
