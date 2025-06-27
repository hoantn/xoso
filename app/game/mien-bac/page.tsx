"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/app/components/AuthProvider"
import { useToast } from "@/hooks/use-toast"
import { Loader2, History, DollarSign, CheckCircle, AlertTriangle, Trophy, Target, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Types for traditional Northern lottery
interface LotterySession {
  id: string
  date: string
  draw_time: string
  status: "waiting" | "drawing" | "completed"
  results?: {
    special_prize: string
    first_prize: string[]
    second_prize: string[]
    third_prize: string[]
    fourth_prize: string[]
    fifth_prize: string[]
    sixth_prize: string[]
    seventh_prize: string[]
  }
}

interface BetType {
  id: string
  name: string
  description: string
  multiplier: number
  min_bet: number
}

// Traditional Northern lottery bet types
const TRADITIONAL_BET_TYPES: BetType[] = [
  { id: "lo", name: "Lô", description: "Đánh 2 số cuối của các giải", multiplier: 80, min_bet: 1000 },
  { id: "de", name: "Đề", description: "Đánh 2 số cuối giải đặc biệt", multiplier: 80, min_bet: 1000 },
  { id: "xien2", name: "Xiên 2", description: "Đánh 2 số khác nhau về cùng ngày", multiplier: 15, min_bet: 1000 },
  { id: "xien3", name: "Xiên 3", description: "Đánh 3 số khác nhau về cùng ngày", multiplier: 600, min_bet: 1000 },
  { id: "dau", name: "Đầu", description: "Đánh số đầu (0-9)", multiplier: 8, min_bet: 1000 },
  { id: "duoi", name: "Đuôi", description: "Đánh số đuôi (0-9)", multiplier: 8, min_bet: 1000 },
  { id: "lo_kep", name: "Lô Kép", description: "Đánh số kép (00, 11, 22...)", multiplier: 80, min_bet: 1000 },
  { id: "dau_duoi", name: "Đầu Đuôi", description: "Đánh cả đầu và đuôi", multiplier: 60, min_bet: 1000 },
]

export default function MienBacLotteryPage() {
  const { user, balance, refreshBalance } = useAuth()
  const { toast } = useToast()

  const [currentSession, setCurrentSession] = useState<LotterySession | null>(null)
  const [recentResults, setRecentResults] = useState<LotterySession[]>([])
  const [selectedBetType, setSelectedBetType] = useState<string>("lo")
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [betAmount, setBetAmount] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const currentBetType = TRADITIONAL_BET_TYPES.find((bt) => bt.id === selectedBetType) || TRADITIONAL_BET_TYPES[0]

  // Get next draw time (18:15 daily)
  const getNextDrawTime = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 15, 0)

    if (now > today) {
      // If past today's draw time, get tomorrow's draw
      today.setDate(today.getDate() + 1)
    }

    return today
  }

  const [nextDrawTime, setNextDrawTime] = useState<Date>(getNextDrawTime())
  const [timeUntilDraw, setTimeUntilDraw] = useState<number>(0)

  // Fetch lottery data
  const fetchLotteryData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      // Dummy data for demonstration
      const now = new Date()
      const drawTime = getNextDrawTime()

      setCurrentSession({
        id: "mb_" + now.toISOString().split("T")[0],
        date: drawTime.toISOString().split("T")[0],
        draw_time: "18:15",
        status: now < drawTime ? "waiting" : "drawing",
      })

      // Mock recent results
      setRecentResults([
        {
          id: "mb_2024-01-15",
          date: "2024-01-15",
          draw_time: "18:15",
          status: "completed",
          results: {
            special_prize: "12345",
            first_prize: ["67890"],
            second_prize: ["11111", "22222"],
            third_prize: ["33333", "44444", "55555", "66666", "77777", "88888"],
            fourth_prize: ["1234", "5678", "9012", "3456"],
            fifth_prize: ["789", "012", "345", "678", "901", "234"],
            sixth_prize: ["12", "34", "56"],
            seventh_prize: ["7", "8", "9", "0"],
          },
        },
      ])
    } catch (err) {
      setError("Không thể tải dữ liệu xổ số. Vui lòng thử lại.")
      console.error("Error fetching lottery data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLotteryData()

    // Update countdown every second
    const interval = setInterval(() => {
      const now = new Date()
      const drawTime = getNextDrawTime()
      const timeDiff = drawTime.getTime() - now.getTime()

      setTimeUntilDraw(Math.max(0, Math.floor(timeDiff / 1000)))

      // Update next draw time if needed
      if (timeDiff <= 0) {
        setNextDrawTime(getNextDrawTime())
        fetchLotteryData()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [fetchLotteryData])

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

    if (!currentSession || currentSession.status !== "waiting") {
      toast({
        title: "Lỗi đặt cược",
        description: "Hiện tại không thể đặt cược. Vui lòng chờ phiên tiếp theo.",
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

  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
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
    } else if (selectedBetType === "lo_kep") {
      // Double numbers (00, 11, 22, ..., 99)
      return (
        <div className="grid grid-cols-5 gap-2 mt-2">
          {Array.from({ length: 10 }, (_, i) => i.toString() + i.toString()).map((num) => (
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
      <Card className="mb-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Trophy className="w-8 h-8" />
            Lô Đề Miền Bắc Truyền Thống
          </CardTitle>
          <CardDescription className="text-blue-100">
            Đặt cược theo kết quả xổ số miền Bắc chính thức - Quay số 18:15 hàng ngày
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Đang tải dữ liệu xổ số...</span>
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
                  <Calendar className="h-5 w-5" />
                  Phiên {currentSession?.date}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{formatCountdown(timeUntilDraw)}</div>
                <p className="text-sm text-gray-500 mb-2">Thời gian đến khi quay số</p>
                <p className="text-lg font-semibold mb-4">Quay số lúc 18:15</p>
                <Badge
                  variant={currentSession?.status === "waiting" ? "default" : "secondary"}
                  className="text-lg px-4 py-2"
                >
                  {currentSession?.status === "waiting"
                    ? "Đang nhận cược"
                    : currentSession?.status === "drawing"
                      ? "Đang quay số"
                      : "Đã có kết quả"}
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
                  <div className="space-y-4">
                    {recentResults.map((result, index) => (
                      <div key={index} className="border rounded-md p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">Ngày {result.date}</p>
                          <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>
                        </div>
                        {result.results && (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-red-600">ĐB:</span>
                              <Badge className="bg-red-100 text-red-800 font-bold">
                                {result.results.special_prize}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">G1:</span>
                              {result.results.first_prize.map((num, i) => (
                                <Badge key={i} className="bg-blue-100 text-blue-800">
                                  {num}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">G2:</span>
                              {result.results.second_prize.map((num, i) => (
                                <Badge key={i} className="bg-gray-100 text-gray-800 text-xs">
                                  {num}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {TRADITIONAL_BET_TYPES.map((betType) => (
                    <Button
                      key={betType.id}
                      variant={selectedBetType === betType.id ? "default" : "outline"}
                      onClick={() => handleBetTypeChange(betType.id)}
                      className="h-auto p-3 flex flex-col items-center"
                    >
                      <span className="font-bold">{betType.name}</span>
                      <span className="text-xs text-center">{betType.description}</span>
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
                      : selectedBetType === "lo_kep"
                        ? "Chọn số kép (00, 11, 22...)"
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
                      <Button key={amount} variant="outline" size="sm" onClick={() => setBetAmount(amount.toString())}>
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
                    currentSession.status !== "waiting" ||
                    selectedNumbers.length === 0 ||
                    Number.parseFloat(betAmount) < currentBetType.min_bet
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
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
    </div>
  )
}
