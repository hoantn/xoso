import type { Database } from "./supabase"

export type Proxy = Database["public"]["Tables"]["proxies"]["Row"]
export type ProxyInsert = Database["public"]["Tables"]["proxies"]["Insert"]
export type ProxyUpdate = Database["public"]["Tables"]["proxies"]["Update"]

export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"]
export type UserProfileInsert = Database["public"]["Tables"]["user_profiles"]["Insert"]
export type UserProfileUpdate = Database["public"]["Tables"]["user_profiles"]["Update"]

export type ProxyUsageStat = Database["public"]["Tables"]["proxy_usage_stats"]["Row"]
export type ProxyUsageStatInsert = Database["public"]["Tables"]["proxy_usage_stats"]["Insert"]
export type ProxyUsageStatUpdate = Database["public"]["Tables"]["proxy_usage_stats"]["Update"]

export type WithdrawalRequest = Database["public"]["Tables"]["withdrawal_requests"]["Row"]
export type WithdrawalRequestInsert = Database["public"]["Tables"]["withdrawal_requests"]["Insert"]
export type WithdrawalRequestUpdate = Database["public"]["Tables"]["withdrawal_requests"]["Update"]

export type UserRole = "user" | "admin" | "super_admin"
