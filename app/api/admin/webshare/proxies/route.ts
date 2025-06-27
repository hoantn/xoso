import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import type { WebshareProxy } from "@/app/types/webshare"

const WEBSHARE_API_BASE_URL = "https://proxy.webshare.io/api/v2"
const WEBSHARE_API_KEY = process.env.WEBSHARE_API_KEY

async function callWebshareApi(endpoint: string, method = "GET", body?: any) {
  if (!WEBSHARE_API_KEY) {
    throw new Error("Webshare API Key is not configured.")
  }

  const headers: HeadersInit = {
    Authorization: `Token ${WEBSHARE_API_KEY}`,
    "Content-Type": "application/json",
  }

  const options: RequestInit = {
    method,
    headers,
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${WEBSHARE_API_BASE_URL}${endpoint}`, options)

  if (!response.ok) {
    const errorText = await response.text().catch(() => "No response body")
    console.error(`Webshare API raw error response (${response.status}):`, errorText)
    let errorData: any = { message: response.statusText }
    try {
      errorData = JSON.parse(errorText)
    } catch (e) {
      // Not a JSON response, use the raw text
    }
    throw new Error(`Webshare API Error (${response.status}): ${errorData.detail || errorData.message || errorText}`)
  }

  return response.json()
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: No token provided" }, { status: 401 })
    }

    const user = AuthService.verifySessionToken(token)

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or insufficient role" },
        { status: 401 },
      )
    }

    // Lấy danh sách proxy từ Webshare
    const webshareProxies: { results: WebshareProxy[] } = await callWebshareApi("/proxy/list/")

    return NextResponse.json({ success: true, data: webshareProxies.results }, { status: 200 })
  } catch (error: any) {
    console.error("API error fetching Webshare proxies:", error)
    return NextResponse.json({ success: false, message: "Internal server error: " + error.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization")
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null

    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: No token provided" }, { status: 401 })
    }

    const user = AuthService.verifySessionToken(token)

    if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or insufficient role" },
        { status: 401 },
      )
    }

    const { action, proxyId, newConfig } = await req.json()

    let result: any

    switch (action) {
      case "replace":
        if (!proxyId) {
          return NextResponse.json(
            { success: false, message: "Proxy ID is required for replacement." },
            { status: 400 },
          )
        }
        // Giả định endpoint thay thế proxy là /proxy/replace/<proxy_id>/
        result = await callWebshareApi(`/proxy/replace/${proxyId}/`, "POST")
        break
      case "update_config":
        if (!proxyId || !newConfig) {
          return NextResponse.json(
            { success: false, message: "Proxy ID and new config are required for update." },
            { status: 400 },
          )
        }
        // Giả định endpoint cập nhật cấu hình là /proxy/config/<proxy_id>/
        result = await callWebshareApi(`/proxy/config/${proxyId}/`, "PATCH", newConfig)
        break
      default:
        return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 })
  } catch (error: any) {
    console.error("API error managing Webshare proxies:", error)
    return NextResponse.json({ success: false, message: "Internal server error: " + error.message }, { status: 500 })
  }
}
