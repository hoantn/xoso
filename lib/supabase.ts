import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = "user" | "admin" | "super_admin"

export type Database = {
  public: {
    Tables: {
      proxies: {
        Row: {
          id: string
          user_id: string | null
          server: string
          port: number
          username: string
          password: string
          description: string
          type: "http" | "socks5" | "mtproto"
          is_active: boolean
          visibility: "public" | "private"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          server: string
          port: number
          username: string
          password: string
          description: string
          type: "http" | "socks5" | "mtproto"
          is_active?: boolean
          visibility?: "public" | "private"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          server?: string
          port?: number
          username?: string
          password?: string
          description?: string
          type?: "http" | "socks5" | "mtproto"
          is_active?: boolean
          visibility?: "public" | "private"
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          role: UserRole
          full_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role?: UserRole
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: UserRole
          full_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      proxy_usage_stats: {
        Row: {
          id: string
          proxy_id: string
          user_id: string
          used_at: string
          success: boolean
          error_message: string | null
        }
        Insert: {
          id?: string
          proxy_id: string
          user_id: string
          used_at?: string
          success?: boolean
          error_message?: string | null
        }
        Update: {
          id?: string
          proxy_id?: string
          user_id?: string
          used_at?: string
          success?: boolean
          error_message?: string | null
        }
      }
    }
  }
}
