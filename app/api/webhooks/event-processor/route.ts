import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// Main event processor - this replaces the cron job
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`[EVENT_PROCESSOR] Starting event processing at ${new Date().toISOString()}`)

    // Get ready events from database
    const { data: events, error: eventsError } = await supabase.rpc("get_ready_events")

    if (eventsError) {
      console.error("[EVENT_PROCESSOR] Error fetching ready events:", eventsError)
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
    }

    if (!events || events.length === 0) {
      console.log("[EVENT_PROCESSOR] No events ready for processing")
      return NextResponse.json({
        success: true,
        message: "No events ready for processing",
        processed: 0,
      })
    }

    console.log(`[EVENT_PROCESSOR] Found ${events.length} events to process`)

    const results = []
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    for (const event of events) {
      try {
        console.log(`[EVENT_PROCESSOR] Processing event ${event.id}: ${event.event_type}`)

        // Mark event as processing
        await supabase.rpc("complete_lottery_event", {
          p_event_id: event.id,
          p_success: false, // Mark as processing first
          p_error_message: "Processing...",
        })

        // Determine webhook URL based on event type
        let webhookUrl = ""
        let payload = {}

        switch (event.event_type) {
          case "session_expired":
            webhookUrl = `${baseUrl}/api/webhooks/draw-lottery`
            payload = {
              sessionId: event.session_id,
              gameType: event.game_type,
              eventId: event.id,
            }
            break

          case "draw_completed":
            webhookUrl = `${baseUrl}/api/webhooks/process-payout`
            payload = {
              sessionId: event.session_id,
              gameType: event.game_type,
              eventId: event.id,
            }
            break

          case "payout_completed":
            webhookUrl = `${baseUrl}/api/webhooks/create-next-session`
            payload = {
              gameType: event.game_type,
              eventId: event.id,
              previousSessionId: event.session_id,
            }
            break

          default:
            throw new Error(`Unknown event type: ${event.event_type}`)
        }

        // Call the webhook
        console.log(`[EVENT_PROCESSOR] Calling webhook: ${webhookUrl}`)
        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${expectedSecret}`,
          },
          body: JSON.stringify(payload),
        })

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text()
          throw new Error(`Webhook failed: ${webhookResponse.status} - ${errorText}`)
        }

        const webhookResult = await webhookResponse.json()

        // Mark event as completed
        await supabase.rpc("complete_lottery_event", {
          p_event_id: event.id,
          p_success: true,
        })

        results.push({
          eventId: event.id,
          eventType: event.event_type,
          status: "success",
          result: webhookResult,
        })

        console.log(`[EVENT_PROCESSOR] ✅ Event ${event.id} processed successfully`)
      } catch (error) {
        console.error(`[EVENT_PROCESSOR] ❌ Error processing event ${event.id}:`, error)

        // Mark event as failed
        await supabase.rpc("complete_lottery_event", {
          p_event_id: event.id,
          p_success: false,
          p_error_message: error instanceof Error ? error.message : String(error),
        })

        results.push({
          eventId: event.id,
          eventType: event.event_type,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    console.log(`[EVENT_PROCESSOR] Completed processing ${events.length} events`)

    return NextResponse.json({
      success: true,
      message: `Processed ${events.length} events`,
      results,
      processed: events.length,
    })
  } catch (error) {
    console.error("[EVENT_PROCESSOR] Critical error:", error)
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
