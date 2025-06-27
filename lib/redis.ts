// Dummy Redis client and CacheManager for build success when cache is disabled
// This file provides dummy exports to prevent build errors when other files import them.

// Dummy Redis client
export const redis = {
  get: async (key: string) => {
    console.warn("Redis is disabled. GET operation skipped.")
    return null
  },
  set: async (key: string, value: any, ttl: number) => {
    console.warn("Redis is disabled. SET operation skipped.")
    return false
  },
  del: async (key: string) => {
    console.warn("Redis is disabled. DEL operation skipped.")
    return false
  },
  keys: async (pattern: string) => {
    console.warn("Redis is disabled. KEYS operation skipped.")
    return []
  },
  setex: async (key: string, ttl: number, value: string) => {
    console.warn("Redis is disabled. SETEX operation skipped.")
    return false
  },
}

// Dummy Cache Keys constants
export const CACHE_KEYS = {
  PROXIES: {
    PUBLIC: "proxies:public",
    USER: (userId: string) => `proxies:user:${userId}`,
    RANDOM: (type: string) => `proxies:random:${type}`,
    STATS: "proxies:stats",
  },
  USERS: {
    PROFILE: (userId: string) => `users:profile:${userId}`,
    BALANCE: (userId: string) => `users:balance:${userId}`,
    TRANSACTIONS: (userId: string) => `users:transactions:${userId}`,
  },
  SYSTEM: {
    HEALTH: "system:health",
    STATS: "system:stats",
    BANK_ACCOUNTS: "system:bank_accounts",
  },
  API: {
    RESPONSE: (endpoint: string, params: string) => `api:${endpoint}:${params}`,
  },
} as const

// Dummy Cache TTL constants
export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  DAILY: 86400, // 24 hours
} as const

// Dummy Cache utility functions
export class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    console.warn("CacheManager is disabled. GET operation skipped.")
    return null
  }

  static async set(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM): Promise<boolean> {
    console.warn("CacheManager is disabled. SET operation skipped.")
    return false
  }

  static async del(key: string): Promise<boolean> {
    console.warn("CacheManager is disabled. DEL operation skipped.")
    return false
  }

  static async invalidatePattern(pattern: string): Promise<void> {
    console.warn("CacheManager is disabled. Invalidation skipped.")
  }

  static async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number = CACHE_TTL.MEDIUM): Promise<T | null> {
    console.warn("CacheManager is disabled. getOrSet operation will always fetch.")
    return fetcher() // Always fetch if cache is disabled
  }
}
