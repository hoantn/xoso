"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/app/components/AuthProvider"
import { useToast } from "@/hooks/use-toast"
import { Loader2, History, Clock, DollarSign, CheckCircle, AlertTriangle, Trophy, Target } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Types for lottery game
interface GameSession {
  id: string
  game_type: string
  session_number: number
  start_time: string
  end_time: string
  countdown_seconds: number
  status: "open" | "closed" | "drawing" | "completed"
  winning_numbers?: string[]
}

interface GameResult {
  session_id: string
  session_number: number
  winning_numbers: string[]
  drawn_at: string
}

interface BetType {
  id: string
  name: string
  description: string
  multiplier: number
  min_bet: number
}

// Bet types for traditional Northern lottery
const BET_TYPES: BetType[] = [
  { id: "lo", name: "Lô", description: "Đánh 2 số cuối", multiplier: 80, min_bet: 1000 },
  { id: "de", name: "Đề", description: "Đánh 2 số đầu", multiplier: 80, min_bet: 1000 },
  { id: "xien2", name: "Xiên 2", description: "Đánh 2 số khác nhau", multiplier: 15, min_bet: 1000 },
  { id: "xien3", name: "Xiên 3", description: "Đánh 3 số khác nhau", multiplier: 600, min_bet: 1000 },
  { id: "dau", name: "Đầu", description: "Đánh số đầu (0-9)", multiplier: 8, min_bet: 1000 },
  { id: "duoi", name: "Đuôi", description: "Đánh số đuôi (0-9)", multiplier: 8, min_bet: 1000 },
]

export default function XSKTGamePage() {
  const { user, balance, refreshBalance } = useAuth()
  const { toast } = useToast()

  const [currentMode, setCurrentMode] = useState<"1p" | "5p" | "30p">("1p")
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null)
  const [recentResults, setRecentResults] = useState<GameResult[]>([])
  const [selectedBetType, setSelectedBetType] = useState<string>("lo")
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [betAmount, setBetAmount] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const currentBetType = BET_TYPES.find((bt) => bt.id === selectedBetType) || BET_TYPES[0]

  // Fetch game data
  const fetchGameData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Dummy data for demonstration
      setCurrentSession({
        id: "session_12345",
        game_type: `lode_${currentMode}`,
        session_number: 12345,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60 * 1000).toISOString(),
        countdown_seconds: 60,
        status: "open",
      })
      setRecentResults([
        {
          session_id: "prev_1",
          session_number: 12344,
          winning_numbers: ["12", "34", "56"],
          drawn_at: new Date(Date.now() - 120 * 1000).toISOString(),
        },
        {
          session_id: "prev_2",
          session_number: 12343,
          winning_numbers: ["78", "90", "01"],
          drawn_at: new Date(Date.now() - 240 * 1000).toISOString(),
        },
      ])
    } catch (err) {
      setError("Không thể tải dữ liệu game. Vui lòng thử lại.")
      console.error("Error fetching game data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [currentMode])

  useEffect(() => {
    fetchGameData()
    const interval = setInterval(() => {
      setCurrentSession((prev) => {
        if (prev) {
          const newCountdown = prev.countdown_seconds - 1
          if (newCountdown <= 0) {
            fetchGameData()
            return null
          }
          return { ...prev, countdown_seconds: newCountdown }
        }
        return prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [currentMode, fetchGameData])

  const handleNumberSelect = (num: string) => {
    const maxNumbers = selectedBetType === "xien3" ? 3 : selectedBetType === "xien2" ? 2 : 1

    if (selectedNumbers.includes(num)) {
      setSelectedNumbers((prev) => prev.filter((n) => n !== num))
    } else if (selectedNumbers.length < maxNumbers) {
      setSelectedNumbers((prev) => [...prev, num].sort())
    } else {
      toast({
        title: "Giới hạn số lượng",
        description: `Chỉ được chọn tối đa ${maxNumbers} số cho loại cược này.`,
        variant: "destructive",
      })
    }
  }

  const handleBetTypeChange = (betType: string) => {
    setSelectedBetType(betType)
    setSelectedNumbers([])
  }

  const handlePlaceBet = async () => {
    if (!user) {
      toast({
        title: "Lỗi đặt cược",
        description: "Vui lòng đăng nhập để đặt cược.",
        variant: "destructive",
      })
      return
    }

    if (!currentSession || currentSession.status !== "open") {
      toast({
        title: "Lỗi đặt cược",
        description: "Phiên hiện tại đã đóng hoặc đang quay số.",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(betAmount)
    if (isNaN(amount) || amount < currentBetType.min_bet) {
      toast({
        title: "Lỗi đặt cược",
        description: `Số tiền cược tối thiểu là ${currentBetType.min_bet.toLocaleString("vi-VN")} VNĐ.`,
        variant: "destructive",
      })
      return
    }

    const requiredNumbers = selectedBetType === "xien3" ? 3 : selectedBetType === "xien2" ? 2 : 1
    if (selectedNumbers.length !== requiredNumbers) {
      toast({
        title: "Lỗi đặt cược",
        description: `Vui lòng chọn đúng ${requiredNumbers} số cho loại cược này.`,
        variant: "destructive",
      })
      return
    }

    if (balance === null || amount > balance) {
      toast({
        title: "Lỗi đặt cược",
        description: "Số dư không đủ.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const potentialWin = amount * currentBetType.multiplier
      setSuccessMessage(`Đặt cược thành công! Tiền thắng tối đa: ${potentialWin.toLocaleString("vi-VN")} VNĐ`)
      setBetAmount("")
      setSelectedNumbers([])
      refreshBalance()

      toast({
        title: "Đặt cược thành công!",
        description: `${currentBetType.name}: ${selectedNumbers.join(", ")} - ${amount.toLocaleString("vi-VN")} VNĐ`,
        variant: "success",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định khi đặt cược.")
      toast({
        title: "Lỗi đặt cược",
        description: err instanceof Error ? err.message : "Lỗi không xác định.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const renderNumberGrid = () => {
    if (selectedBetType === "dau" || selectedBetType === "duoi") {
      // Single digit selection (0-9)
      return (
        <div className="grid grid-cols-5 gap-2 mt-2">
          {Array.from({ length: 10 }, (_, i) => i.toString()).map((num) => (
            <Button
              key={num}
              variant={selectedNumbers.includes(num) ? "default" : "outline"}
              onClick={() => handleNumberSelect(num)}
              className="w-full h-12 text-lg font-bold"
            >
              {num}
            </Button>
          ))}
        </div>
      )
    } else {
      // Two digit selection (00-99)
      return (
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mt-2">
          {Array.from({ length: 100 }, (_, i) => i.toString().padStart(2, "0")).map((num) => (
            <Button
              key={num}
              variant={selectedNumbers.includes(num) ? "default" : "outline"}
              onClick={() => handleNumberSelect(num)}
              className="w-full h-10 text-sm"
            >
              {num}
            </Button>
          ))}
        </div>
      )
    }
  }

  return (
    <div className="container mx-auto py-8">
      {/* Game Header */}
      <Card className="mb-6 bg-gradient-to-r from-green-500 to-green-700 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="w-8 h-8" />
            Lô Đề Nhanh - Tốc Độ Cao
          </CardTitle>
          <CardDescription className="text-green-100">
            Lô đề siêu tốc với phiên quay 1-30 phút - Kết quả nhanh, thắng liền tay!
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs
        value={currentMode}
        onValueChange={(value) => setCurrentMode(value as "1p" | "5p" | "30p")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="1p">Siêu Nhanh 1 Phút</TabsTrigger>
          <TabsTrigger value="5p">Nhanh 5 Phút</TabsTrigger>
          <TabsTrigger value="30p">Bình Thường 30 Phút</TabsTrigger>
        </TabsList>

        <TabsContent value={currentMode} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Đang tải phiên game...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Session Info & Results */}
              <div className="space-y-6">
                {/* Current Session */}
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-2">
                      <Clock className="h-5 w-5" />
                      Phiên #{currentSession?.session_number}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-4xl font-bold text-red-600 mb-2">
                      {currentSession ? formatTime(currentSession.countdown_seconds) : "00:00"}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Thời gian còn lại</p>
                    <Badge
                      variant={currentSession?.status === "open" ? "default" : "secondary"}
                      className="text-lg px-4 py-2"
                    >
                      {currentSession?.status === "open" ? "Đang mở cược" : "Đang quay số"}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Recent Results */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Kết quả gần đây
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentResults.length === 0 ? (
                      <p className="text-gray-500 text-center">Chưa có kết quả nào.</p>
                    ) : (
                      <div className="space-y-3">
                        {recentResults.map((result, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 border rounded-md bg-gray-50"
                          >
                            <div>
                              <p className="font-medium">#{result.session_number}</p>
                              <p className="text-xs text-gray-600">
                                {new Date(result.drawn_at).toLocaleTimeString("vi-VN")}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {result.winning_numbers.map((num, i) => (
                                <Badge key={i} className="bg-red-100 text-red-800 font-bold">
                                  {num}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Betting Area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Bet Type Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Chọn loại cược
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {BET_TYPES.map((betType) => (
                        <Button
                          key={betType.id}
                          variant={selectedBetType === betType.id ? "default" : "outline"}
                          onClick={() => handleBetTypeChange(betType.id)}
                          className="h-auto p-3 flex flex-col items-center"
                        >
                          <span className="font-bold">{betType.name}</span>
                          <span className="text-xs">{betType.description}</span>
                          <span className="text-xs text-green-600">x{betType.multiplier}</span>
                        </Button>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-800">
                        <strong>{currentBetType.name}:</strong> {currentBetType.description} - Tỷ lệ thắng{" "}
                        <strong>1:{currentBetType.multiplier}</strong> - Cược tối thiểu{" "}
                        <strong>{currentBetType.min_bet.toLocaleString("vi-VN")} VNĐ</strong>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Number Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Chọn số</CardTitle>
                    <CardDescription>
                      {selectedBetType === "xien3"
                        ? "Chọn 3 số khác nhau"
                        : selectedBetType === "xien2"
                          ? "Chọn 2 số khác nhau"
                          : "Chọn 1 số"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {renderNumberGrid()}
                    {selectedNumbers.length > 0 && (
                      <div className="mt-4 p-3 bg-green-50 rounded-md">
                        <p className="text-sm text-green-800">
                          Đã chọn: <strong>{selectedNumbers.join(", ")}</strong>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Betting Form */}
                <Card>
                  <CardHeader>
                    <CardTitle>Đặt cược</CardTitle>
                    <CardDescription>
                      Số dư:{" "}
                      <strong className="text-green-600">
                        {balance !== null ? `${balance.toLocaleString("vi-VN")} VNĐ` : "Đang tải..."}
                      </strong>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="betAmount">Số tiền cược (VNĐ)</Label>
                      <Input
                        id="betAmount"
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        placeholder={`Tối thiểu ${currentBetType.min_bet.toLocaleString("vi-VN")}`}
                        min={currentBetType.min_bet}
                      />
                      {betAmount && !isNaN(Number.parseFloat(betAmount)) && (
                        <p className="text-sm text-blue-600 mt-1">
                          Tiền thắng tối đa:{" "}
                          <strong>
                            {(Number.parseFloat(betAmount) * currentBetType.multiplier).toLocaleString("vi-VN")} VNĐ
                          </strong>
                        </p>
                      )}
                    </div>

                    {/* Quick bet amounts */}
                    <div>
                      <Label>Chọn nhanh:</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {[10000, 20000, 50000, 100000].map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            size="sm"
                            onClick={() => setBetAmount(amount.toString())}
                          >
                            {amount.toLocaleString("vi-VN")}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {successMessage && (
                      <Alert className="bg-green-50 border-green-200">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handlePlaceBet}
                      disabled={
                        isLoading ||
                        !user ||
                        !currentSession ||
                        currentSession.status !== "open" ||
                        selectedNumbers.length === 0 ||
                        Number.parseFloat(betAmount) < currentBetType.min_bet
                      }
                      className="w-full bg-red-600 hover:bg-red-700 text-lg py-6"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <DollarSign className="w-5 h-5 mr-2" />
                      )}
                      Đặt cược ngay
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
