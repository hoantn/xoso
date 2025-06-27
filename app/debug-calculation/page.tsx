"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DebugCalculationPage() {
  const [sessionId, setSessionId] = useState("0b4009d4-816c-467a-a72c-a546d76e6c0e") // Session #2158
  const [betId, setBetId] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const debugCalculation = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/debug/check-win-calculation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, betId: betId || undefined }),
      })
      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Debug Win Calculation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Session ID</label>
            <Input value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="Enter session ID" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Bet ID (optional)</label>
            <Input
              value={betId}
              onChange={(e) => setBetId(e.target.value)}
              placeholder="Enter specific bet ID to debug"
            />
          </div>
          <Button onClick={debugCalculation} disabled={loading}>
            {loading ? "Debugging..." : "Debug Calculation"}
          </Button>

          {results && (
            <div className="mt-6 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Session Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(results.session, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>All 2-Digit Endings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">[{results.all_two_digit_endings?.join(", ")}]</p>
                </CardContent>
              </Card>

              {results.debug_results?.map((debug: any, index: number) => (
                <Card key={index} className={debug.is_correct ? "border-green-500" : "border-red-500"}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Bet {debug.bet_id} - {debug.is_correct ? "✅ CORRECT" : "❌ INCORRECT"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Type:</strong> {debug.bet_type}
                      </p>
                      <p>
                        <strong>Numbers:</strong> [{debug.bet_numbers?.join(", ")}]
                      </p>
                      <p>
                        <strong>Amount:</strong> {debug.bet_amount}
                      </p>
                      <p>
                        <strong>Current Win Amount:</strong> {debug.current_win_amount?.toLocaleString()}
                      </p>
                      <p>
                        <strong>Calculated Win Amount:</strong> {debug.calculated_win_amount?.toLocaleString()}
                      </p>

                      <div className="mt-4">
                        <p>
                          <strong>Win Count Debug:</strong>
                        </p>
                        <ul className="list-disc list-inside text-xs">
                          {debug.win_count_debug?.details?.map((detail: string, i: number) => (
                            <li key={i}>{detail}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4">
                        <p>
                          <strong>Win Amount Debug:</strong>
                        </p>
                        <ul className="list-disc list-inside text-xs">
                          {debug.win_amount_debug?.details?.map((detail: string, i: number) => (
                            <li key={i}>{detail}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
