"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/app/components/AuthProvider"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  History,
  Clock,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Zap,
  Target,
  Timer,
  Trophy,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Import game components and utilities
import { BetTypeSelectorWithCategories } from "../components/BetTypeSelectorWithCategories"
import { NumberInputSelector } from "../components/NumberInputSelector"
import { DynamicBetAmountInput } from "../components/DynamicBetAmountInput"
import type { GameSession, GameResult, LotteryResultData } from "../types"
import { getBetTypesByMode, BET_CATEGORIES, FAST_LOTTERY_MODES } from "../constants"
import { formatCountdown, validateBetSelection, getCalculationBreakdown } from "../utils"
import { getNumberLengthForBetType, getMaxNumbersForBetType, validateNumberFormat } from "../utils/validation"

// Helper component to display full lottery results
interface FullLotteryResultsDisplayProps {
  resultsData: LotteryResultData
}

const FullLotteryResultsDisplay: React.FC<FullLotteryResultsDisplayProps> = ({ resultsData }) => {
  if (!resultsData) return null

  const prizes = [
    { name: "ĐB", key: "special_prize", color: "bg-red-500 text-white" },
    { name: "G1", key: "first_prize", color: "bg-blue-500 text-white" },
    { name: "G2", key: "second_prize", color: "bg-green-500 text-white" },
    { name: "G3", key: "third_prize", color: "bg-purple-500 text-white" },
    { name: "G4", key: "fourth_prize", color: "bg-yellow-500 text-white" },
    { name: "G5", key: "fifth_prize", color: "bg-pink-500 text-white" },
    { name: "G6", key: "sixth_prize", color: "bg-indigo-500 text-white" },
    { name: "G7", key: "seventh_prize", color: "bg-gray-500 text-white" },
  ]

  return (
    <div className="space-y-3">
      {prizes.map((prize) => {
        const prizeNumbers = Array.isArray(resultsData[prize.key]) ? resultsData[prize.key] : [resultsData[prize.key]]

        if (!prizeNumbers || prizeNumbers.length === 0 || prizeNumbers[0] === null) return null

        return (
          <div key={prize.key} className="flex items-center gap-3">
            <Badge className={`w-8 text-center ${prize.color} font-bold`}>{prize.name}</Badge>
            <div className="flex flex-wrap gap-2 flex-grow">
              {prizeNumbers.map((num: string, idx: number) => (
                <Badge key={idx} variant="outline" className="font-mono font-bold">
                  {num}
                </Badge>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function FastLotteryPage() {
  const { user, balance, refreshBalance } = useAuth()
  const { toast } = useToast()

  const [currentMode, setCurrentMode] = useState<"1p" | "5p" | "30p">("1p")
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null)
  const [recentResults, setRecentResults] = useState<GameResult[]>([])
  const [selectedBetType, setSelectedBetType] = useState<string>("")
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [betAmount, setBetAmount] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const currentBetTypes = getBetTypesByMode(currentMode)
  const currentBetType = currentBetTypes.find((bt) => bt.id === selectedBetType) || currentBetTypes[0]
  const currentModeInfo = FAST_LOTTERY_MODES.find((mode) => mode.id === currentMode)

  // Fetch game data
  const fetchGameData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/game/sessions?gameType=lode_nhanh_${currentMode}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.currentSession) {
        setCurrentSession(data.currentSession)
      } else {
        setCurrentSession(null)
      }

      if (data.recentResults) {
        setRecentResults(data.recentResults)
      }
    } catch (err) {
      setError("Không thể tải dữ liệu game. Vui lòng thử lại.")
      console.error("Error fetching game data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [currentMode])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    fetchGameData()

    intervalRef.current = setInterval(() => {
      setCurrentSession((prev) => {
        if (prev) {
          const newCountdown = prev.countdown_seconds - 1
          if (newCountdown <= 0) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            fetchGameData()
            return null
          }
          return { ...prev, countdown_seconds: newCountdown }
        }
        return prev
      })
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchGameData])

  useEffect(() => {
    const betTypes = getBetTypesByMode(currentMode)
    setSelectedBetType(betTypes[0].id)
  }, [currentMode])

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
        description: "Phiên hiện tại đã đóng hoặc đang quay số.",
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
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
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
      setSuccessMessage(`Đặt cược thành công! Tiền thắng tối đa: ${result.potential_win.toLocaleString("vi-VN")}đ`)
      setBetAmount("")
      setSelectedNumbers([])
      refreshBalance()

      toast({
        title: "Đặt cược thành công!",
        description: `${currentBetType.name}: ${selectedNumbers.join(", ")} - ${amount.toLocaleString("vi-VN")}đ`,
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

  const latestResult = recentResults.length > 0 ? recentResults[0] : null

  return (
    <div className="p-4 space-y-4">
      {/* Game Header */}
      <Card className="bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 border-0 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-6 h-6" />
                <h1 className="text-2xl font-bold">Lô Đề Nhanh</h1>
                <Badge className="bg-white/20 text-white animate-pulse">🔥 HOT</Badge>
              </div>
              <p className="text-orange-100">Siêu tốc 1-30 phút - Kết quả nhanh, thắng liền tay!</p>
            </div>
            <div className="text-5xl opacity-20">
              <Timer />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mode Selection */}
      <Tabs
        value={currentMode}
        onValueChange={(value) => setCurrentMode(value as "1p" | "5p" | "30p")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm">
          {FAST_LOTTERY_MODES.map((mode) => (
            <TabsTrigger
              key={mode.id}
              value={mode.id}
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-400 data-[state=active]:to-red-500 data-[state=active]:text-white"
            >
              {mode.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={currentMode} className="mt-4 space-y-4">
          {isLoading ? (
            <Card className="bg-white/80 backdrop-blur-sm border-0">
              <CardContent className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
                <p className="text-gray-600">Đang tải phiên game...</p>
              </CardContent>
            </Card>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Current Session & Latest Result */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Session */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader className="text-center pb-3">
                    <CardTitle className="flex items-center justify-center gap-2 text-gray-900">
                      <Clock className="h-5 w-5 text-orange-500" />
                      Phiên #{currentSession?.session_number || "---"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="text-4xl font-bold text-red-600 mb-2">
                      {currentSession ? formatCountdown(currentSession.countdown_seconds) : "00:00"}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Thời gian còn lại</p>
                    <Badge
                      className={`text-lg px-4 py-2 ${
                        currentSession?.status === "open" ? "bg-green-500 text-white" : "bg-gray-500 text-white"
                      }`}
                    >
                      {currentSession?.status === "open" ? "Đang mở cược" : "Đang quay số"}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Latest Result */}
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Kết quả mới nhất
                      {latestResult && (
                        <Badge variant="outline" className="text-xs">
                          #{latestResult.session_number}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {latestResult && latestResult.results_data ? (
                      <FullLotteryResultsDisplay resultsData={latestResult.results_data} />
                    ) : (
                      <p className="text-gray-500 text-center py-4">Chưa có kết quả mới nhất</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Betting Area */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Target className="w-5 h-5 text-blue-500" />
                    Đặt cược
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Bet Type Selection */}
                  <BetTypeSelectorWithCategories
                    betTypes={currentBetTypes}
                    categories={BET_CATEGORIES}
                    selectedBetType={selectedBetType}
                    onBetTypeChange={handleBetTypeChange}
                    currentBetType={currentBetType}
                  />

                  {/* Number Selection */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Chọn số</h4>
                    <NumberInputSelector
                      selectedNumbers={selectedNumbers}
                      onNumbersChange={handleNumbersChange}
                      maxNumbers={getMaxNumbersForBetType(selectedBetType)}
                      numberLength={getNumberLengthForBetType(selectedBetType)}
                      allowDuplicates={false}
                      betType={selectedBetType}
                    />
                  </div>

                  {/* Bet Amount */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Số tiền cược</h4>
                    <DynamicBetAmountInput
                      currentBetType={currentBetType}
                      selectedNumbers={selectedNumbers}
                      betAmount={betAmount}
                      onBetAmountChange={setBetAmount}
                      balance={balance}
                    />
                  </div>

                  {/* Success/Error Messages */}
                  {successMessage && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Place Bet Button */}
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
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-lg py-6 shadow-lg"
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

              {/* Recent Results */}
              <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <History className="w-5 h-5 text-purple-500" />
                    Kết quả gần đây
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentResults.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Chưa có kết quả nào.</p>
                  ) : (
                    <div className="space-y-3">
                      {recentResults.slice(1, 5).map((result, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                          <div>
                            <p className="font-medium text-gray-900">#{result.session_number}</p>
                            <p className="text-xs text-gray-600">
                              {new Date(result.draw_time).toLocaleTimeString("vi-VN")}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {result.winning_numbers?.map((num, i) => (
                              <Badge key={i} className="bg-red-500 text-white font-bold">
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
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
