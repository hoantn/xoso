import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const baseUrl = request.url.replace("/api/cron/test", "")
    const results = []

    // Test auto-draw endpoint
    try {
      const drawResponse = await fetch(`${baseUrl}/api/cron/auto-draw`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${expectedSecret}`,
        },
      })
      const drawResult = await drawResponse.json()
      results.push({
        endpoint: "auto-draw",
        status: drawResponse.status,
        success: drawResult.success,
        message: drawResult.message,
        results: drawResult.results,
      })
    } catch (error) {
      results.push({
        endpoint: "auto-draw",
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // Test auto-process-lottery endpoint
    try {
      const processResponse = await fetch(`${baseUrl}/api/cron/auto-process-lottery`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${expectedSecret}`,
        },
      })
      const processResult = await processResponse.json()
      results.push({
        endpoint: "auto-process-lottery",
        status: processResponse.status,
        success: processResult.success,
        message: processResult.message,
        results: processResult.results,
      })
    } catch (error) {
      results.push({
        endpoint: "auto-process-lottery",
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      })
    }

    // Test status endpoint
    try {
      const statusResponse = await fetch(`${baseUrl}/api/cron/status`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${expectedSecret}`,
        },
      })
      const statusResult = await statusResponse.json()
      results.push({
        endpoint: "status",
        status: statusResponse.status,
        summary: statusResult.summary,
        sessions_count: Object.keys(statusResult.sessions || {}).length,
      })
    } catch (error) {
      results.push({
        endpoint: "status",
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return NextResponse.json({
      success: true,
      message: "Cron system test completed",
      timestamp: new Date().toISOString(),
      test_results: results,
    })
  } catch (error) {
    console.error("Cron test error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
