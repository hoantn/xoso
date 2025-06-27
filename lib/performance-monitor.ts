import { CacheManager, CACHE_TTL } from "./redis"

interface PerformanceMetric {
  endpoint: string
  method: string
  responseTime: number
  timestamp: number
  status: number
  cacheHit: boolean
  userId?: string
}

interface PerformanceStats {
  averageResponseTime: number
  totalRequests: number
  cacheHitRate: number
  errorRate: number
  slowestEndpoints: Array<{
    endpoint: string
    averageTime: number
    requestCount: number
  }>
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private readonly maxMetrics = 1000

  async recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Cache recent metrics
    await CacheManager.set(
      "performance:metrics",
      this.metrics.slice(-100), // Last 100 requests
      CACHE_TTL.MEDIUM,
    )

    // Update stats every 10 requests
    if (this.metrics.length % 10 === 0) {
      await this.updateStats()
    }
  }

  private async updateStats() {
    const now = Date.now()
    const recentMetrics = this.metrics.filter((m) => now - m.timestamp < 300000) // Last 5 minutes

    if (recentMetrics.length === 0) return

    const stats: PerformanceStats = {
      averageResponseTime: recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length,
      totalRequests: recentMetrics.length,
      cacheHitRate: recentMetrics.filter((m) => m.cacheHit).length / recentMetrics.length,
      errorRate: recentMetrics.filter((m) => m.status >= 400).length / recentMetrics.length,
      slowestEndpoints: this.getSlowestEndpoints(recentMetrics),
    }

    await CacheManager.set("performance:stats", stats, CACHE_TTL.MEDIUM)
  }

  private getSlowestEndpoints(metrics: PerformanceMetric[]) {
    const endpointStats = new Map<string, { totalTime: number; count: number }>()

    metrics.forEach((metric) => {
      const key = `${metric.method} ${metric.endpoint}`
      const existing = endpointStats.get(key) || { totalTime: 0, count: 0 }
      endpointStats.set(key, {
        totalTime: existing.totalTime + metric.responseTime,
        count: existing.count + 1,
      })
    })

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        averageTime: stats.totalTime / stats.count,
        requestCount: stats.count,
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 5)
  }

  async getStats(): Promise<PerformanceStats | null> {
    return await CacheManager.get<PerformanceStats>("performance:stats")
  }
}

export const performanceMonitor = new PerformanceMonitor()

// Middleware to track performance
export function withPerformanceTracking(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = async function (...args: any[]) {
    const startTime = Date.now()
    const [request] = args

    try {
      const response = await originalMethod.apply(this, args)
      const responseTime = Date.now() - startTime

      // Record metric
      await performanceMonitor.recordMetric({
        endpoint: new URL(request.url).pathname,
        method: request.method,
        responseTime,
        timestamp: Date.now(),
        status: response.status,
        cacheHit: response.headers.get("X-Cache") === "HIT",
        userId: request.headers.get("Authorization") ? "authenticated" : undefined,
      })

      return response
    } catch (error) {
      const responseTime = Date.now() - startTime

      await performanceMonitor.recordMetric({
        endpoint: new URL(request.url).pathname,
        method: request.method,
        responseTime,
        timestamp: Date.now(),
        status: 500,
        cacheHit: false,
        userId: request.headers.get("Authorization") ? "authenticated" : undefined,
      })

      throw error
    }
  }

  return descriptor
}
