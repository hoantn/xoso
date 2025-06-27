import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { performanceMonitor } from "@/lib/performance-monitor"
// import { CacheManager } from "@/lib/redis" // Removed

async function getCurrentAdmin(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const user = await AuthService.verifySessionToken(token)
    if (user && (user.role === "admin" || user.role === "super_admin")) {
      return user
    }
  }
  return null
}

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const stats = await performanceMonitor.getStats()
    // const recentMetrics = (await CacheManager.get<any[]>("performance:metrics")) || [] // Removed

    return NextResponse.json({
      success: true,
      data: {
        stats,
        // recentMetrics: recentMetrics.slice(-20), // Last 20 requests // Removed
        // cacheStats: { // Removed
        //   totalCacheOperations: recentMetrics.length,
        //   cacheHits: recentMetrics.filter((m) => m.cacheHit).length,
        //   cacheMisses: recentMetrics.filter((m) => !m.cacheHit).length,
        // },
      },
    })
  } catch (error) {
    console.error("Performance stats error:", error)
    return NextResponse.json({ error: "Không thể tải thống kê hiệu suất" }, { status: 500 })
  }
}
