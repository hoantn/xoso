import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/auth"

const INTERNAL_WEBHOOK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/event-processor`
const CRON_SECRET = process.env.CRON_SECRET // NEVER exposed to client

export async function POST(req: NextRequest) {
  /* ----------------------------- auth check ----------------------------- */
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = verifyAdminToken(authHeader.slice(7))
  if (!admin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 })
  }

  /* -------------------------- forward request --------------------------- */
  try {
    const webhookRes = await fetch(INTERNAL_WEBHOOK_URL, {
      method: "POST",
      headers: { "x-cron-secret": CRON_SECRET! },
    })

    const data = await webhookRes.json()
    return NextResponse.json(data, { status: webhookRes.status })
  } catch (err) {
    console.error("Forward-to-webhook error:", err)
    return NextResponse.json({ error: "Trigger failed" }, { status: 500 })
  }
}
