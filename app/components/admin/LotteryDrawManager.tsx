"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Play, RefreshCw, Clock, CheckCircle, Plus, Timer, Award, Trophy, Target } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface ReadySession {
  id: string
  game_type: string
  session_number: number
  end_time: string
  status: string
  countdown_seconds?: number
}

interface ActiveSession {
  id: string
  game_type: string
  session_number: number
  start_time: string
  end_time: string
  status: string
  countdown_seconds: number
}

interface DrawResult {
  success: boolean
  session: {
    id: string
    session_number: number
    winning_numbers: string[]
    results: any
  }
  processing_result: {
    success: boolean
    processed_bets: number
    winners: number
    total_payout: number
    winning_numbers: string[]
  }
  message: string
}

interface LotteryDrawManagerProps {
  token: string
}

const GAME_TYPES = [
  { id: "lode_nhanh_1p", name: "Lô Đề Nhanh 1 Phút", duration: 1, color: "bg-red-100 text-red-800" },
  { id: "lode_nhanh_5p", name: "Lô Đề Nhanh 5 Phút", duration: 5, color: "bg-blue-100 text-blue-800" },
  { id: "lode_nhanh_30p", name: "Lô Đề Nhanh 30 Phút", duration: 30, color: "bg-green-100 text-green-800" },
]

export function LotteryDrawManager({ token }: LotteryDrawManagerProps) {
  const [readySessions, setReadySessions] = useState<ReadySession[]>([])
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [selectedGameTypes, setSelectedGameTypes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDrawing, setIsDrawing] = useState<string | null>(null)
  const [lastDrawResult, setLastDrawResult] = useState<DrawResult | null>(null)
  const { toast } = useToast()

  const fetchActiveSessions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/lottery/active-sessions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error("Failed to fetch active sessions")

      const data = await response.json()
      setActiveSessions(data.sessions || [])
    } catch (error) {
      console.error("Error fetching active sessions:", error)
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách phiên đang hoạt động",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchReadySessions = async () => {
    try {
      const response = await fetch("/api/game/draw-lottery", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        if (errorText.trim().startsWith("<!DOCTYPE html>")) {
          throw new Error(
            `Server returned an HTML error page (Status: ${response.status}). The API route might be missing or broken.`,
          )
        }
        throw new Error(`Failed to fetch ready sessions: ${errorText}`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "API returned an error")
      }

      setReadySessions(data.ready_sessions || [])
    } catch (error) {
      console.error("Error fetching ready sessions:", error)
      toast({
        title: "Lỗi Tải Phiên Sẵn Sàng",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
        variant: "destructive",
      })
    }
  }

  const createNewSessions = async () => {
    if (selectedGameTypes.length === 0) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ít nhất một loại lô đề để tạo phiên",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const results: string[] = []
      let hasSuccess = false

      for (const gameType of selectedGameTypes) {
        try {
          console.log(`Creating session for ${gameType}`)

          const res = await fetch("/api/admin/lottery/create-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ gameType }),
          })

          const responseText = await res.text()
          console.log(`Response for ${gameType}:`, responseText)

          let data
          try {
            data = JSON.parse(responseText)
          } catch {
            data = { error: responseText }
          }

          if (res.ok && data.success) {
            results.push(`✅ ${formatGameType(gameType)}: Phiên #${data.session?.session_number}`)
            hasSuccess = true
          } else {
            results.push(`❌ ${formatGameType(gameType)}: ${data.error || "Lỗi không xác định"}`)
          }
        } catch (err) {
          console.error(`Error creating session for ${gameType}:`, err)
          results.push(`❌ ${formatGameType(gameType)}: Lỗi kết nối`)
        }
      }

      toast({
        title: hasSuccess ? "Tạo phiên hoàn tất!" : "Có lỗi xảy ra",
        description: results.join("\n"),
        variant: hasSuccess ? "default" : "destructive",
      })

      if (hasSuccess) {
        setSelectedGameTypes([])
        fetchActiveSessions()
      }
    } catch (error) {
      console.error("Error creating sessions:", error)
      toast({
        title: "Lỗi tạo phiên",
        description: "Không thể tạo phiên mới",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleGameTypeSelection = (gameType: string, checked: boolean) => {
    if (checked) {
      setSelectedGameTypes([...selectedGameTypes, gameType])
    } else {
      setSelectedGameTypes(selectedGameTypes.filter((type) => type !== gameType))
    }
  }

  const formatGameType = (gameType: string) => {
    const gameConfig = GAME_TYPES.find((g) => g.id === gameType)
    return gameConfig?.name || gameType
  }

  const getGameTypeColor = (gameType: string) => {
    const gameConfig = GAME_TYPES.find((g) => g.id === gameType)
    return gameConfig?.color || "bg-gray-100 text-gray-800"
  }

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const getSessionStatus = (session: ActiveSession) => {
    if (session.countdown_seconds <= 10 && session.countdown_seconds > 8) {
      return { text: "Đóng cược", color: "bg-yellow-100 text-yellow-800" }
    } else if (session.countdown_seconds <= 8 && session.countdown_seconds > 3) {
      return { text: "Đang quay", color: "bg-orange-100 text-orange-800" }
    } else if (session.countdown_seconds <= 3 && session.countdown_seconds > 0) {
      return { text: "Trả thưởng", color: "bg-purple-100 text-purple-800" }
    } else if (session.countdown_seconds <= 0) {
      return { text: "Hoàn thành", color: "bg-green-100 text-green-800" }
    } else {
      return { text: "Đang mở", color: "bg-blue-100 text-blue-800" }
    }
  }

  const drawLottery = async (sessionId: string, gameType: string) => {
    setIsDrawing(sessionId)
    try {
      console.log(`Manual draw for session ${sessionId}, gameType: ${gameType}`)

      const response = await fetch("/api/game/draw-lottery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          gameType,
          forceManual: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to draw lottery")
      }

      const result = await response.json()
      setLastDrawResult(result)

      toast({
        title: "Quay số thành công!",
        description: `Phiên #${result.session.session_number}: Xử lý ${result.processing_result?.processed_bets || 0} cược, ${result.processing_result?.winners || 0} người thắng`,
      })

      // Refresh both ready sessions and active sessions
      fetchReadySessions()
      fetchActiveSessions()
    } catch (error) {
      console.error("Error drawing lottery:", error)
      toast({
        title: "Lỗi quay số",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
        variant: "destructive",
      })
    } finally {
      setIsDrawing(null)
    }
  }

  useEffect(() => {
    fetchActiveSessions()
    fetchReadySessions()

    const interval = setInterval(() => {
      fetchActiveSessions()
      fetchReadySessions()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-6">
      {/* Create New Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Tạo Phiên Quay Số Mới
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {GAME_TYPES.map((gameType) => (
                <div key={gameType.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox
                    id={gameType.id}
                    checked={selectedGameTypes.includes(gameType.id)}
                    onCheckedChange={(checked) => handleGameTypeSelection(gameType.id, checked as boolean)}
                  />
                  <Label htmlFor={gameType.id} className="flex-1 cursor-pointer">
                    <div className="font-medium">{gameType.name}</div>
                    <div className="text-sm text-gray-500">Thời gian: {gameType.duration} phút</div>
                  </Label>
                </div>
              ))}
            </div>

            <Button
              onClick={createNewSessions}
              disabled={isCreating || selectedGameTypes.length === 0}
              className="w-full"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Tạo Phiên Quay Số ({selectedGameTypes.length} loại)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Phiên Đang Hoạt Động
            </span>
            <Button onClick={fetchActiveSessions} disabled={isLoading} variant="outline" size="sm">
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Đang tải...</span>
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Không có phiên nào đang hoạt động</div>
          ) : (
            <div className="space-y-4">
              {activeSessions.map((session) => {
                const status = getSessionStatus(session)
                return (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">#{session.session_number}</Badge>
                        <Badge className={getGameTypeColor(session.game_type)}>
                          {formatGameType(session.game_type)}
                        </Badge>
                        <Badge className={status.color}>{status.text}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Còn lại: {formatCountdown(session.countdown_seconds)}
                        </span>
                        <span>Kết thúc: {new Date(session.end_time).toLocaleTimeString("vi-VN")}</span>
                      </div>
                    </div>

                    {session.countdown_seconds <= 0 && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Hoàn thành
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Draw Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Quay Số Thủ Công
          </CardTitle>
        </CardHeader>
        <CardContent>
          {readySessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Không có phiên nào sẵn sàng quay số</div>
          ) : (
            <div className="space-y-4">
              {readySessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{session.session_number}</Badge>
                      <span className="font-medium">{formatGameType(session.game_type)}</span>
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(session.end_time).toLocaleTimeString("vi-VN")}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Kết thúc: {new Date(session.end_time).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <Button
                    onClick={() => drawLottery(session.id, session.game_type)}
                    disabled={isDrawing === session.id}
                    size="sm"
                  >
                    {isDrawing === session.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Quay số
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Draw Result - FIXED */}
      {lastDrawResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Kết Quả Quay Số Gần Nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Phiên #{lastDrawResult.session?.session_number}: Quay số thành công và xử lý cược hoàn tất
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Session Info */}
              <div className="space-y-4">
                <h4 className="font-semibold mb-3 flex items-center">
                  <Target className="w-4 h-4 mr-2" />
                  Thông tin phiên
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số phiên:</span>
                    <span className="font-medium">#{lastDrawResult.session?.session_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trạng thái:</span>
                    <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số trúng giải:</span>
                    <span className="font-medium">{lastDrawResult.session?.winning_numbers?.length || 0} số</span>
                  </div>
                </div>

                {/* Winning Numbers Display */}
                {lastDrawResult.session?.winning_numbers && (
                  <div>
                    <h5 className="font-medium mb-2 text-sm text-gray-700">Danh sách số trúng giải:</h5>
                    <div className="flex flex-wrap gap-1">
                      {lastDrawResult.session.winning_numbers.slice(0, 10).map((number, index) => (
                        <Badge key={index} variant="outline" className="text-xs font-mono">
                          {number}
                        </Badge>
                      ))}
                      {lastDrawResult.session.winning_numbers.length > 10 && (
                        <Badge variant="outline" className="text-xs">
                          +{lastDrawResult.session.winning_numbers.length - 10} số khác
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Processing Results */}
              <div className="space-y-4">
                <h4 className="font-semibold mb-3 flex items-center">
                  <Trophy className="w-4 h-4 mr-2" />
                  Xử lý cược
                </h4>
                <div className="space-y-3">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Tổng cược xử lý:</span>
                      <span className="font-bold text-blue-900">
                        {lastDrawResult.processing_result?.processed_bets || 0}
                      </span>
                    </div>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Số người thắng:</span>
                      <span className="font-bold text-green-900">{lastDrawResult.processing_result?.winners || 0}</span>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-purple-700">Tổng tiền thưởng:</span>
                      <span className="font-bold text-purple-900">
                        {(lastDrawResult.processing_result?.total_payout || 0).toLocaleString()}đ
                      </span>
                    </div>
                  </div>

                  {lastDrawResult.processing_result?.winners > 0 && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-yellow-700">Tỷ lệ thắng:</span>
                        <span className="font-bold text-yellow-900">
                          {(
                            (lastDrawResult.processing_result.winners /
                              lastDrawResult.processing_result.processed_bets) *
                              100 || 0
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Special Prize Display */}
            {lastDrawResult.session?.results && (
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <h5 className="font-semibold mb-3 text-yellow-800">Kết quả chi tiết:</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Đặc Biệt</div>
                    <Badge className="bg-red-100 text-red-800 font-mono">
                      {lastDrawResult.session.results.special_prize}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Giải Nhất</div>
                    <Badge className="bg-blue-100 text-blue-800 font-mono">
                      {lastDrawResult.session.results.first_prize}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Lô về</div>
                    <Badge className="bg-green-100 text-green-800">
                      {lastDrawResult.session.results.special_prize?.slice(-2)}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-1">Đề về</div>
                    <Badge className="bg-purple-100 text-purple-800">
                      {lastDrawResult.session.results.special_prize?.slice(-2)}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
