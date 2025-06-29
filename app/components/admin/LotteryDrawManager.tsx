"use client"

import { useState, useEffect } from "react"

const LotteryDrawManager = () => {
  const [activeSessions, setActiveSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchActiveSessions()
  }, [])

  // Add better error handling and session state management
  const fetchActiveSessions = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/lottery/active-sessions")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      if (data.success) {
        setActiveSessions(data.sessions || [])

        // Check if there are sessions ready for processing
        const readySessions = (data.sessions || []).filter((session: any) => {
          const now = new Date()
          const endTime = new Date(session.end_time)
          const secondsRemaining = Math.floor((endTime.getTime() - now.getTime()) / 1000)

          return (
            (session.status === "open" && secondsRemaining <= 30) ||
            (session.status === "drawing" && secondsRemaining <= 10) ||
            (session.status === "processing_rewards" && secondsRemaining <= 0)
          )
        })

        if (readySessions.length === 0 && data.sessions.length > 0) {
          setError("Có phiên đang hoạt động nhưng chưa sẵn sàng xử lý")
        }
      } else {
        setError(data.error || "Không thể tải danh sách phiên")
      }
    } catch (err) {
      console.error("Error fetching active sessions:", err)
      setError(err instanceof Error ? err.message : "Lỗi không xác định")
      setActiveSessions([])
    } finally {
      setLoading(false)
    }
  }

  // Update the session display to show more detailed status
  const getSessionStatusDisplay = (session: any) => {
    const now = new Date()
    const endTime = new Date(session.end_time)
    const secondsRemaining = Math.floor((endTime.getTime() - now.getTime()) / 1000)

    let statusText = session.status
    let statusColor = "gray"
    let canProcess = false

    switch (session.status) {
      case "open":
        if (secondsRemaining <= 30) {
          statusText = "Sẵn sàng đóng cược"
          statusColor = "yellow"
          canProcess = true
        } else {
          statusText = `Đang mở cược (${secondsRemaining}s)`
          statusColor = "green"
        }
        break
      case "drawing":
        if (secondsRemaining <= 10) {
          statusText = "Sẵn sàng quay số"
          statusColor = "orange"
          canProcess = true
        } else {
          statusText = `Đang đóng cược (${secondsRemaining}s)`
          statusColor = "yellow"
        }
        break
      case "processing_rewards":
        if (secondsRemaining <= 0) {
          statusText = "Sẵn sàng hoàn thành"
          statusColor = "blue"
          canProcess = true
        } else {
          statusText = `Đang xử lý thưởng (${secondsRemaining}s)`
          statusColor = "purple"
        }
        break
      case "completed":
        statusText = "Đã hoàn thành"
        statusColor = "green"
        break
      default:
        statusText = session.status
    }

    return { statusText, statusColor, canProcess, secondsRemaining }
  }

  return (
    <div>
      <h1>Lottery Draw Manager</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <h2>Active Sessions</h2>
      {activeSessions.length > 0 ? (
        <ul>
          {activeSessions.map((session) => {
            const { statusText, statusColor, canProcess } = getSessionStatusDisplay(session)
            return (
              <li key={session.id}>
                Session ID: {session.id}, Status: <span style={{ color: statusColor }}>{statusText}</span>
                {canProcess && <button>Process</button>}
              </li>
            )
          })}
        </ul>
      ) : (
        <p>No active sessions found.</p>
      )}
    </div>
  )
}

export { LotteryDrawManager }
export default LotteryDrawManager
