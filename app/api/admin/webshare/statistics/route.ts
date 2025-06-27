import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import type { WebshareStatistics } from "@/app/types/webshare"

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

    // Gọi API Webshare để lấy thống kê
    const webshareStats: WebshareStatistics = await callWebshareApi("/proxy/statistics/")

    return NextResponse.json({ success: true, data: webshareStats }, { status: 200 })
  } catch (error: any) {
    console.error("API error fetching Webshare statistics:", error)
    return NextResponse.json({ success: false, message: "Internal server error: " + error.message }, { status: 500 })
  }
}
