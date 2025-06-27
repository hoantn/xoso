"use client"

import { useState, useEffect } from "react"

const LodeNhanhGame = () => {
  const [recentResults, setRecentResults] = useState<any[]>([])

  const fetchRecentResults = async () => {
    try {
      const response = await fetch("/api/game/recent-results?gameType=lode_nhanh")
      if (response.ok) {
        const data = await response.json()
        setRecentResults(data.results || [])
      }
    } catch (error) {
      console.error("Error fetching recent results:", error)
    }
  }

  useEffect(() => {
    fetchRecentResults()
    const interval = setInterval(fetchRecentResults, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Kết Quả Gần Đây</h3>
        <div className="space-y-2">
          {recentResults.slice(0, 5).map((result, index) => (
            <div
              key={result.session_number}
              className="flex justify-between items-center py-2 border-b border-gray-100"
            >
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-500">{result.game_type === "lode_nhanh_1p" ? "1P" : "3P"}</span>
                <span className="text-sm text-gray-600">{result.draw_time_formatted}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Phiên:</span>
                <span className="text-sm font-mono">{result.session_number}</span>
                <span className="text-xs text-gray-500">→</span>
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-bold">
                  {result.winning_number}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* rest of the game component */}
    </div>
  )
}

export default LodeNhanhGame
