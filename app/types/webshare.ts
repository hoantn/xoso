export interface WebshareProxy {
  id: string
  host: string
  port: number
  username: string
  password: string
  type: "http" | "socks5" // Webshare typically offers HTTP/SOCKS5
  country_code: string
  city_name: string
  is_active: boolean
  created_at: string
  expires_at: string
  // Thêm các trường khác nếu cần từ API Webshare
}

export interface WebshareProxyListResponse {
  count: number
  next: string | null
  previous: string | null
  results: WebshareProxy[]
}

export interface WebshareStatistics {
  total_proxies: number
  active_proxies: number
  expired_proxies: number
  bandwidth_used_gb: number
  bandwidth_limit_gb: number
  // Thêm các trường thống kê khác nếu có
}

export type WebshareConfig = {}
