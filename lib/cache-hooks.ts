import { CacheManager, CACHE_KEYS } from "./redis"

export class CacheInvalidator {
  // Invalidate proxy-related caches
  static async invalidateProxyCaches(userId?: string) {
    const patterns = [CACHE_KEYS.PROXIES.PUBLIC + "*", CACHE_KEYS.PROXIES.RANDOM("*"), CACHE_KEYS.PROXIES.STATS]

    if (userId) {
      patterns.push(CACHE_KEYS.PROXIES.USER(userId))
    }

    for (const pattern of patterns) {
      await CacheManager.invalidatePattern(pattern)
    }
  }

  // Invalidate user-related caches
  static async invalidateUserCaches(userId: string) {
    const patterns = [
      CACHE_KEYS.USERS.PROFILE(userId),
      CACHE_KEYS.USERS.BALANCE(userId),
      CACHE_KEYS.USERS.TRANSACTIONS(userId),
    ]

    for (const pattern of patterns) {
      await CacheManager.del(pattern)
    }
  }

  // Invalidate system caches
  static async invalidateSystemCaches() {
    const patterns = [CACHE_KEYS.SYSTEM.HEALTH, CACHE_KEYS.SYSTEM.STATS, CACHE_KEYS.SYSTEM.BANK_ACCOUNTS]

    for (const pattern of patterns) {
      await CacheManager.del(pattern)
    }
  }

  // Clear all API response caches
  static async clearApiCaches() {
    await CacheManager.invalidatePattern("api:*")
  }
}

// Auto-invalidation hooks for common operations
export const cacheHooks = {
  onProxyCreated: (userId?: string) => CacheInvalidator.invalidateProxyCaches(userId),
  onProxyUpdated: (userId?: string) => CacheInvalidator.invalidateProxyCaches(userId),
  onProxyDeleted: (userId?: string) => CacheInvalidator.invalidateProxyCaches(userId),
  onUserBalanceChanged: (userId: string) => CacheInvalidator.invalidateUserCaches(userId),
  onTransactionCreated: (userId: string) => CacheInvalidator.invalidateUserCaches(userId),
  onSystemConfigChanged: () => CacheInvalidator.invalidateSystemCaches(),
}
