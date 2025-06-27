export interface Proxy {
  id: string
  user_id: string
  server: string
  port: number
  username: string
  password: string
  description: string
  type: "http" | "socks5" | "mtproto"
  is_active: boolean
  source?: string // Add source as optional
  visibility?: string // Add visibility as optional
  max_users?: number // Add max_users as optional
  current_users?: number // Add current_users as optional
  created_at: string
  updated_at: string
}

export type ProxyInsert = Omit<Proxy, "id" | "created_at" | "updated_at"> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type ProxyUpdate = Partial<Omit<Proxy, "id" | "user_id" | "created_at">> & {
  updated_at?: string
}

// Export for backward compatibility
export type { Proxy as ProxyType }
