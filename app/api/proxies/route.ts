import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { connectionPool } from "@/lib/connection-pool"
// import { CacheManager, CACHE_KEYS, CACHE_TTL } from "@/lib/redis" // Removed
// import { withCache } from "@/lib/cache-middleware" // Removed

async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    return AuthService.verifySessionToken(token)
  }
  return null
}

// Hàm xử lý GET gốc, không có cache
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  console.log(`[PROXIES_GET] START - User: ${user?.username || "Anonymous"}`)

  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1", 10)
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "10", 10), 100)
    const type = searchParams.get("type")
    const visibility = searchParams.get("visibility") || "all"
    const search = searchParams.get("search")

    const offset = (page - 1) * limit

    const result = await connectionPool.executeWithRetry(async (supabase) => {
      let query = supabase.from("proxies").select("*", { count: "exact" }).eq("is_active", true)

      // Apply filters
      if (type && type !== "all") {
        query = query.eq("type", type)
      }

      if (visibility === "public") {
        query = query.is("user_id", null)
      } else if (visibility === "private" && user) {
        query = query.eq("user_id", user.id)
      } else if (visibility === "all") {
        if (user) {
          query = query.or(`user_id.is.null,user_id.eq.${user.id}`)
        } else {
          query = query.is("user_id", null)
        }
      }

      if (search) {
        query = query.or(`server.ilike.%${search}%,description.ilike.%${search}%`)
      }

      return await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)
    })

    const { data: proxies, error, count } = result

    if (error) {
      console.error("[PROXIES_GET] Database error:", error)
      return NextResponse.json(
        { success: false, error: "Không thể tải danh sách proxy.", details: error.message },
        { status: 500 },
      )
    }

    const totalPages = Math.ceil((count || 0) / limit)

    // Removed cache logic for stats
    let stats = {
      total: count || 0,
      public: 0, // Placeholder, actual calculation would require another query or more complex logic
      private: 0, // Placeholder
      by_type: {}, // Placeholder
    }

    // If you need accurate stats without cache, you'd run another query here
    // For now, just return basic stats or remove if not critical for temporary build
    const statsResult = await connectionPool.executeWithRetry(async (supabase) => {
      const { data: allProxies } = await supabase.from("proxies").select("type, user_id").eq("is_active", true)
      return allProxies || []
    })

    stats = {
      total: statsResult.length,
      public: statsResult.filter((p) => !p.user_id).length,
      private: statsResult.filter((p) => p.user_id).length,
      by_type: statsResult.reduce(
        (acc, p) => {
          acc[p.type] = (acc[p.type] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ),
    }

    console.log(`[PROXIES_GET] END - Fetched ${proxies?.length || 0} proxies`)
    return NextResponse.json({
      success: true,
      data: proxies,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages,
      },
      stats,
    })
  } catch (error) {
    console.error(`[PROXIES_GET] CATCH ERROR:`, error)
    return NextResponse.json(
      {
        success: false,
        error: "Lỗi server không xác định.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
