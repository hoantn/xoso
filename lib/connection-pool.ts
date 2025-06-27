import { createClient, type SupabaseClient } from "@supabase/supabase-js"

class ConnectionPool {
  private pools: Map<string, SupabaseClient> = new Map()
  private readonly maxConnections = 10
  private readonly connectionTimeout = 10000 // 10 seconds
  private readonly retryAttempts = 3

  private createConnection(): SupabaseClient {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      db: {
        schema: "public",
      },
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
      global: {
        headers: {
          "x-connection-pool": "true",
        },
      },
    })
  }

  async getConnection(poolId = "default"): Promise<SupabaseClient> {
    if (!this.pools.has(poolId)) {
      this.pools.set(poolId, this.createConnection())
    }
    return this.pools.get(poolId)!
  }

  async executeWithRetry<T>(operation: (client: SupabaseClient) => Promise<T>, poolId = "default"): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const client = await this.getConnection(poolId)

        // Set timeout for the operation
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Operation timeout")), this.connectionTimeout)
        })

        const result = await Promise.race([operation(client), timeoutPromise])

        return result
      } catch (error) {
        lastError = error as Error
        console.warn(`Connection attempt ${attempt} failed:`, error)

        if (attempt < this.retryAttempts) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
          await new Promise((resolve) => setTimeout(resolve, delay))

          // Recreate connection on retry
          this.pools.delete(poolId)
        }
      }
    }

    throw lastError || new Error("All connection attempts failed")
  }

  closeAll(): void {
    this.pools.clear()
  }
}

export const connectionPool = new ConnectionPool()
