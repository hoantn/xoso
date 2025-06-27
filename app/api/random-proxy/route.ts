import { type NextRequest, NextResponse } from "next/server"
import { connectionPool } from "@/lib/connection-pool"
// import { CacheManager, CACHE_KEYS, CACHE_TTL } from "@/lib/redis" // Removed

export async function GET(request: NextRequest) {
  console.log("[RANDOM_PROXY_GET] START")

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "random"

    // Removed cache logic for random proxies
    let availableProxies: any[] = []

    console.log("[RANDOM_PROXY_GET] Cache disabled, fetching directly from database")

    const result = await connectionPool.executeWithRetry(async (supabase) => {
      let query = supabase.from("proxies").select("*").eq("is_active", true).is("user_id", null) // Only public proxies

      if (type !== "random") {
        query = query.eq("type", type)
      }

      return await query
    })

    const { data: proxies, error } = result

    if (error) {
      console.error("[RANDOM_PROXY_GET] Database error:", error)
      return NextResponse.json(
        { success: false, error: "Không thể tải proxy từ database.", details: error.message },
        { status: 500 },
      )
    }

    availableProxies = proxies || []

    if (availableProxies.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Không có proxy ${type === "random" ? "" : type.toUpperCase()} nào khả dụng`,
          suggestion: "Vui lòng thử lại sau hoặc liên hệ admin để thêm proxy mới.",
        },
        { status: 404 },
      )
    }

    // Select random proxy
    const randomIndex = Math.floor(Math.random() * availableProxies.length)
    const selectedProxy = availableProxies[randomIndex]

    console.log(`[RANDOM_PROXY_GET] END - Selected proxy: ${selectedProxy.server}:${selectedProxy.port}`)
    return NextResponse.json({
      success: true,
      proxy: selectedProxy,
      total_available: availableProxies.length,
    })
  } catch (error) {
    console.error(`[RANDOM_PROXY_GET] CATCH ERROR:`, error)
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
