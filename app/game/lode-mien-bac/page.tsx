"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/app/components/AuthProvider"
import { useToast } from "@/hooks/use-toast"
import { Loader2, History, DollarSign, CheckCircle, AlertTriangle, Trophy, Calendar, BookOpen } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Import game components and utilities
import { BetTypeSelectorWithCategories } from "../components/BetTypeSelectorWithCategories"
import { NumberInputSelector } from "../components/NumberInputSelector"
import { TraditionalGameGuide } from "../components/TraditionalGameGuide"
import type { LotterySession } from "../types"
import { TRADITIONAL_LOTTERY_BET_TYPES, BET_CATEGORIES } from "../constants"
import { formatCountdown } from "../utils"
import { DynamicBetAmountInput } from "../components/DynamicBetAmountInput"
import { getCalculationBreakdown, validateBetSelection } from "../utils"
import { getNumberLengthForBetType, getMaxNumbersForBetType, validateNumberFormat } from "../utils/validation"

// Helper function to safely render prize numbers
const renderPrizeNumbers = (prizes: any, className = "bg-gray-100 text-gray-800 text-xs") => {
  if (!prizes) return null
  const prizeArray = Array.isArray(prizes) ? prizes : [prizes]
  return prizeArray.map((num, i) => (
    <Badge key={i} className={className}>
      {String(num)}
    </Badge>
  ))
}

export default function TraditionalLotteryPage() {
  const { user, balance, refreshBalance } = useAuth()
  const { toast } = useToast()

  const [currentTab, setCurrentTab] = useState<string>("game") // New state for main tabs
  const [currentSession, setCurrentSession] = useState<LotterySession | null>(null)
  const [recentResults, setRecentResults] = useState<LotterySession[]>([])
  const [selectedBetType, setSelectedBetType] = useState<string>("lo")
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [betAmount, setBetAmount] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const currentBetType =
    TRADITIONAL_LOTTERY_BET_TYPES.find((bt) => bt.id === selectedBetType) || TRADITIONAL_LOTTERY_BET_TYPES[0]

  const [timeUntilDraw, setTimeUntilDraw] = useState<number>(0)

  // Fetch lottery data from our API
  const fetchLotteryData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/game/sessions?gameType=lode_mien_bac")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.currentSession) {
        setCurrentSession(data.currentSession)
        setTimeUntilDraw(data.currentSession.countdown_seconds || 0)
      }

      if (data.recentResults) {
        setRecentResults(data.recentResults)
      }
    } catch (err) {
      setError("Không thể tải dữ liệu xổ số. Vui lòng thử lại.")
      console.error("Error fetching lottery data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLotteryData()

    const interval = setInterval(() => {
      setTimeUntilDraw((prev) => {
        const newTime = Math.max(0, prev - 1)
        if (newTime === 0 && prev > 0) {
          fetchLotteryData()
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [fetchLotteryData])

  const handleNumbersChange = (numbers: string[]) => {
    setSelectedNumbers(numbers)
  }

  const handleBetTypeChange = (betType: string) => {
    setSelectedBetType(betType)
    setSelectedNumbers([])
    setBetAmount("")
    setSuccessMessage(null)
    setError(null)
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
        description: "Hiện tại không thể đặt cược. Vui lòng chờ phiên tiếp theo.",
        variant: "destructive",
      })
      return
    }

    const amount = Number.parseFloat(betAmount)
    if (isNaN(amount) || amount < currentBetType.min_bet) {
      const minBetDisplay =
        currentBetType.calculation_method === "point"
          ? `${currentBetType.min_bet} điểm`
          : `${currentBetType.min_bet.toLocaleString("vi-VN")}đ`

      toast({
        title: "Lỗi đặt cược",
        description: `Số tiền cược tối thiểu là ${minBetDisplay}.`,
        variant: "destructive",
      })
      return
    }

    // ENHANCED: Use proper validation functions
    const betValidation = validateBetSelection(selectedBetType, selectedNumbers)
    if (!betValidation.isValid) {
      toast({
        title: "Lỗi đặt cược",
        description: betValidation.message,
        variant: "destructive",
      })
      return
    }

    const formatValidation = validateNumberFormat(selectedBetType, selectedNumbers)
    if (!formatValidation.isValid) {
      toast({
        title: "Lỗi định dạng số",
        description: formatValidation.message,
        variant: "destructive",
      })
      return
    }

    const calculation = getCalculationBreakdown(currentBetType, amount, selectedNumbers.length)
    const totalCost = Number.parseInt(calculation.totalCostDisplay.replace(/[^\d]/g, ""))
    const totalWin = Number.parseInt(calculation.totalWinDisplay.replace(/[^\d]/g, ""))

    if (balance === null || totalCost > balance) {
      toast({
        title: "Lỗi đặt cược",
        description: `Số dư không đủ. Cần ${totalCost.toLocaleString("vi-VN")}đ để đặt cược.`,
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch("/api/game/place-bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: currentSession.id,
          bet_type: selectedBetType,
          numbers: selectedNumbers,
          amount: amount,
          potential_win: totalWin,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Lỗi không xác định khi đặt cược.")
      }

      const result = await response.json()
      setSuccessMessage(`Đặt cược thành công! Tiền thắng tối đa: ${result.potential_win.toLocaleString("vi-VN")} VNĐ`)
      setBetAmount("")
      setSelectedNumbers([])
      refreshBalance()

      toast({
        title: "Đặt cược thành công!",
        description: `${currentBetType.name}: ${selectedNumbers.join(", ")} - ${amount.toLocaleString("vi-VN")} VNĐ`,
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

  return (
    <div className="container mx-auto py-8 px-4">
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

      {/* Main Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="game" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Chơi Game
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Hướng Dẫn
          </TabsTrigger>
        </TabsList>

        {/* Game Tab Content */}
        <TabsContent value="game">
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
                      Phiên {currentSession?.date || "N/A"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{formatCountdown(timeUntilDraw)}</div>
                    <p className="text-sm text-gray-500 mb-2">Thời gian đến khi quay số</p>
                    <p className="text-lg font-semibold mb-4">Quay số lúc 18:15</p>
                    <Badge
                      variant={currentSession?.status === "open" ? "default" : "secondary"}
                      className="text-lg px-4 py-2"
                    >
                      {currentSession?.status === "open"
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
                            {result.results_data && (
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-red-600">ĐB:</span>
                                  <Badge className="bg-red-100 text-red-800 font-bold">
                                    {result.results_data.special_prize || "N/A"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">G1:</span>
                                  {renderPrizeNumbers(result.results_data.first_prize, "bg-blue-100 text-blue-800")}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">G2:</span>
                                  {renderPrizeNumbers(result.results_data.second_prize)}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">G3:</span>
                                  {renderPrizeNumbers(result.results_data.third_prize)}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">G4:</span>
                                  {renderPrizeNumbers(result.results_data.fourth_prize)}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">G5:</span>
                                  {renderPrizeNumbers(result.results_data.fifth_prize)}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">G6:</span>
                                  {renderPrizeNumbers(result.results_data.sixth_prize)}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">G7:</span>
                                  {renderPrizeNumbers(result.results_data.seventh_prize)}
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
                <BetTypeSelectorWithCategories
                  betTypes={TRADITIONAL_LOTTERY_BET_TYPES}
                  categories={BET_CATEGORIES}
                  selectedBetType={selectedBetType}
                  onBetTypeChange={handleBetTypeChange}
                  currentBetType={currentBetType}
                />

                {/* Number Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>Chọn số</CardTitle>
                    <CardDescription>
                      {selectedBetType === "xien3"
                        ? "Chọn đúng 3 số khác nhau"
                        : selectedBetType === "xien2"
                          ? "Chọn đúng 2 số khác nhau"
                          : selectedBetType.includes("dau_duoi")
                            ? "Chọn từ 1-10 số khác nhau từ 0-9 để đoán số đầu (thứ 4) hoặc số đuôi (thứ 5) của giải đặc biệt"
                            : "Nhập số bạn muốn cược (tối đa 10 số)"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <NumberInputSelector
                      selectedNumbers={selectedNumbers}
                      onNumbersChange={handleNumbersChange}
                      maxNumbers={getMaxNumbersForBetType(selectedBetType)}
                      numberLength={getNumberLengthForBetType(selectedBetType)}
                      allowDuplicates={false} // Remove lo_kep logic
                      betType={selectedBetType}
                    />
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
                    <DynamicBetAmountInput
                      currentBetType={currentBetType}
                      selectedNumbers={selectedNumbers}
                      betAmount={betAmount}
                      onBetAmountChange={setBetAmount}
                      balance={balance}
                    />

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
        </TabsContent>

        {/* Guide Tab Content */}
        <TabsContent value="guide">
          <TraditionalGameGuide />
        </TabsContent>
      </Tabs>
    </div>
  )
}
