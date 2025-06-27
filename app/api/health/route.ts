import { NextResponse } from "next/server"
import { connectionPool } from "@/lib/connection-pool"
// import { redis, CacheManager, CACHE_KEYS, CACHE_TTL } from "@/lib/redis" // Removed

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  services: {
    database: {
      status: "up" | "down"
      responseTime: number
      error?: string
    }
    api: {
      status: "up" | "down"
      responseTime: number
    }
  }
  metrics: {
    uptime: number
    memory: {
      used: number
      total: number
      percentage: number
    }
  }
}

export async function GET() {
  const startTime = Date.now()
  const healthStatus: HealthStatus = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: { status: "down", responseTime: 0 },
      api: { status: "up", responseTime: 0 },
    },
    metrics: {
      uptime: process.uptime(),
      memory: {
        used: 0,
        total: 0,
        percentage: 0,
      },
    },
  }

  // Check database health
  try {
    const dbStartTime = Date.now()
    await connectionPool.executeWithRetry(async (supabase) => {
      const { data, error } = await supabase.from("users").select("id").limit(1)

      if (error) throw error
      return data
    })

    healthStatus.services.database = {
      status: "up",
      responseTime: Date.now() - dbStartTime,
    }
  } catch (error) {
    healthStatus.services.database = {
      status: "down",
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    }
    healthStatus.status = "degraded"
  }

  // Removed cache health check
  // try {
  //   const cacheStartTime = Date.now()
  //   const testKey = "health:test"
  //   const testValue = { test: true, timestamp: Date.now() }

  //   await redis.set(testKey, JSON.stringify(testValue))
  //   const retrieved = await redis.get(testKey)
  //   await redis.del(testKey)

  //   if (!retrieved) throw new Error("Cache read/write test failed")

  //   healthStatus.services.cache = {
  //     status: "up",
  //     responseTime: Date.now() - cacheStartTime,
  //   }
  // } catch (error) {
  //   healthStatus.services.cache = {
  //     status: "down",
  //     responseTime: Date.now() - startTime,
  //     error: error instanceof Error ? error.message : "Unknown error",
  //   }
  //   healthStatus.status = "degraded"
  // }

  // Calculate API response time
  healthStatus.services.api.responseTime = Date.now() - startTime

  // Get memory usage
  if (typeof process !== "undefined" && process.memoryUsage) {
    const memUsage = process.memoryUsage()
    healthStatus.metrics.memory = {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
    }
  }

  // Determine overall status
  const servicesDown = Object.values(healthStatus.services).filter((s) => s.status === "down").length
  if (servicesDown >= 1) {
    // Changed from 2 to 1 as only database is checked now
    healthStatus.status = "unhealthy"
  } else if (servicesDown === 0) {
    healthStatus.status = "healthy"
  }

  // Removed cache health status set
  // await CacheManager.set(CACHE_KEYS.SYSTEM.HEALTH, healthStatus, CACHE_TTL.SHORT)

  const statusCode = healthStatus.status === "healthy" ? 200 : healthStatus.status === "degraded" ? 200 : 503

  return NextResponse.json(healthStatus, { status: statusCode })
}
