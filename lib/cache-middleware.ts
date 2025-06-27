// import { type NextRequest, NextResponse } from "next/server"
// import { CacheManager } from "./redis" // Đảm bảo import đúng

// interface CacheOptions {
//   ttl: number
//   keyGenerator: (req: NextRequest) => string
//   onHit?: (key: string) => void
//   onMiss?: (key: string) => void
// }

// export function withCache(handler: (request: NextRequest) => Promise<NextResponse>, options: CacheOptions) {
//   return async (request: NextRequest): Promise<NextResponse> => {
//     // Cache is temporarily disabled. Always call the original handler.
//     console.warn("Cache middleware is disabled. Always calling original handler.");
//     return handler(request);
//   }
// }

// // Cache invalidation helper (also disabled)
// export async function invalidateCache(patterns: string[]) {
//   console.warn("Cache invalidation is disabled.");
// }
