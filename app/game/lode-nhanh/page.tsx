"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react" // Import useRef
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/app/components/AuthProvider"
import { useToast } from "@/hooks/use-toast"
import { Loader2, History, Clock, DollarSign, CheckCircle, AlertTriangle, Trophy, BookOpen } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Import game components and utilities
import { BetTypeSelectorWithCategories } from "../components/BetTypeSelectorWithCategories"
import { NumberInputSelector } from "../components/NumberInputSelector"
import { DynamicBetAmountInput } from "../components/DynamicBetAmountInput"
import { GameGuide } from "../components/GameGuide"
import type { GameSession, GameResult, LotteryResultData } from "../types"
import { getBetTypesByMode, BET_CATEGORIES, FAST_LOTTERY_MODES } from "../constants"
import { formatCountdown, validateBetSelection, getCalculationBreakdown } from "../utils"
import { getNumberLengthForBetType, getMaxNumbersForBetType, validateNumberFormat } from "../utils/validation"

// Helper component to display full lottery results (all 8 prizes)
interface FullLotteryResultsDisplayProps {
  resultsData: LotteryResultData
}

const FullLotteryResultsDisplay: React.FC<FullLotteryResultsDisplayProps> = ({ resultsData }) => {
  if (!resultsData) return null

  const prizes = [
    { name: "ĐB", key: "special_prize", color: "bg-red-100 text-red-800" },
    { name: "G1", key: "first_prize", color: "bg-blue-100 text-blue-800" },
    { name: "G2", key: "second_prize", color: "bg-green-100 text-green-800" },
    { name: "G3", key: "third_prize", color: "bg-purple-100 text-purple-800" },
    { name: "G4", key: "fourth_prize", color: "bg-yellow-100 text-yellow-800" },
    { name: "G5", key: "fifth_prize", color: "bg-pink-100 text-pink-800" },
    { name: "G6", key: "sixth_prize", color: "bg-indigo-100 text-indigo-800" },
    { name: "G7", key: "seventh_prize", color: "bg-gray-100 text-gray-800" },
  ]

  return (
    <div className="space-y-3">
      {prizes.map((prize) => {
        const prizeNumbers = Array.isArray(resultsData[prize.key]) ? resultsData[prize.key] : [resultsData[prize.key]]

        if (!prizeNumbers || prizeNumbers.length === 0 || prizeNumbers[0] === null) return null

        return (
          <div key={prize.key} className="flex items-start gap-3">
            <div className="w-8 text-sm font-bold text-gray-700">{prize.name}:</div>
            <div className="flex flex-wrap gap-2 flex-grow">
              {prizeNumbers.map((num: string, idx: number) => (
                <span key={idx} className={`px-2 py-1 rounded text-sm font-semibold ${prize.color}`}>
                  {num}
                </span>
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
  const [currentTab, setCurrentTab] = useState<string>("game") // New state for main tabs
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null)
  const [recentResults, setRecentResults] = useState<GameResult[]>([])
  const [selectedBetType, setSelectedBetType] = useState<string>("")
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [betAmount, setBetAmount] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null) // Use useRef for interval ID

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

      console.log("Fetched data:", data)
      console.log("Recent results:", data.recentResults)

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.currentSession) {
        setCurrentSession(data.currentSession)
      } else {
        // If no current session, set to null to indicate waiting for next session
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
  }, [currentMode]) // currentMode is a dependency

  useEffect(() => {
    // Clear any existing interval before setting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    fetchGameData() // Initial fetch when component mounts or currentMode changes

    intervalRef.current = setInterval(() => {
      setCurrentSession((prev) => {
        if (prev) {
          const newCountdown = prev.countdown_seconds - 1
          if (newCountdown <= 0) {
            // When countdown hits 0, clear the interval and fetch new data
            if (intervalRef.current) {
              clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            fetchGameData() // Trigger new fetch for the next session
            return null // Clear current session to show loading state
          }
          return { ...prev, countdown_seconds: newCountdown }
        }
        // If prev is null (e.g., after a fetchGameData() call that hasn't returned yet),
        // we might want to re-fetch if it stays null for too long, or just wait.
        // For now, we'll let fetchGameData() handle the initial load.
        return prev
      })
    }, 1000)

    // Cleanup function: clear interval when component unmounts or dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchGameData]) // fetchGameData is the only dependency that should trigger re-run of effect

  useEffect(() => {
    const betTypes = getBetTypesByMode(currentMode)
    setSelectedBetType(betTypes[0].id) // Chọn bet type đầu tiên của mode
  }, [currentMode])

  const handleNumbersChange = (numbers: string[]) => {
    setSelectedNumbers(numbers)
  }

  const handleBetTypeChange = (betType: string) => {
    setSelectedBetType(betType)
    setSelectedNumbers([]) // Clear numbers when bet type changes
    setBetAmount("") // Clear bet amount when changing bet type
    setSuccessMessage(null) // Clear success message
    setError(null) // Clear error message
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

    // Validate number selection based on bet type
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

    // Sử dụng logic tính toán chính xác
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

      const actualBetAmount = amount

      toast({
        title: "Đặt cược thành công!",
        description: `${currentBetType.name}: ${selectedNumbers.join(", ")} - ${actualBetAmount.toLocaleString("vi-VN")}đ`,
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
    <div className="container mx-auto py-8 px-4">
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
          <Tabs
            value={currentMode}
            onValueChange={(value) => setCurrentMode(value as "1p" | "5p" | "30p")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3">
              {FAST_LOTTERY_MODES.map((mode) => (
                <TabsTrigger key={mode.id} value={mode.id}>
                  {mode.name}
                </TabsTrigger>
              ))}
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
                          Phiên #{currentSession?.session_number || "---"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <div className="text-4xl font-bold text-red-600 mb-2">
                          {currentSession ? formatCountdown(currentSession.countdown_seconds) : "00:00"}
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

                    {/* Latest Full Result */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <History className="w-5 h-5" />
                          Kết quả phiên mới nhất
                          {latestResult && (
                            <span className="text-base text-gray-500 ml-2">
                              #{latestResult.session_number} (
                              {new Date(latestResult.draw_time).toLocaleTimeString("vi-VN")})
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {latestResult && latestResult.results_data ? (
                          <FullLotteryResultsDisplay resultsData={latestResult.results_data} />
                        ) : (
                          <p className="text-gray-500 text-center">Chưa có kết quả mới nhất cho phiên này.</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* Other Recent Results (summarized) */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <History className="w-5 h-5" />
                          Kết quả gần đây (tóm tắt)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {recentResults.length === 0 ? (
                          <p className="text-gray-500 text-center">Chưa có kết quả nào.</p>
                        ) : (
                          <div className="space-y-3">
                            {recentResults.slice(1, 5).map(
                              (
                                result,
                                index, // Show 4 more recent results
                              ) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 border rounded-md bg-gray-50"
                                >
                                  <div>
                                    <p className="font-medium">#{result.session_number}</p>
                                    <p className="text-xs text-gray-600">
                                      {new Date(result.draw_time).toLocaleTimeString("vi-VN")}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    {result.winning_numbers?.map((num, i) => (
                                      <Badge key={i} className="bg-red-100 text-red-800 font-bold">
                                        {num}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column - Betting Area */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Bet Type Selection */}
                    <BetTypeSelectorWithCategories
                      betTypes={currentBetTypes}
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
                          {selectedBetType.includes("xien_4")
                            ? "Chọn đúng 4 số khác nhau"
                            : selectedBetType.includes("xien_3")
                              ? "Chọn đúng 3 số khác nhau"
                              : selectedBetType.includes("xien_2")
                                ? "Chọn đúng 2 số khác nhau"
                                : selectedBetType.includes("dau_duoi")
                                  ? "Chọn từ 1-10 số khác nhau từ 0-9 để đoán số đầu (thứ 4) hoặc số đuôi (thứ 5)"
                                  : "Nhập số bạn muốn cược (tối đa 10 số)"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <NumberInputSelector
                          selectedNumbers={selectedNumbers}
                          onNumbersChange={handleNumbersChange}
                          maxNumbers={getMaxNumbersForBetType(selectedBetType)}
                          numberLength={getNumberLengthForBetType(selectedBetType)}
                          allowDuplicates={false}
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
        </TabsContent>

        {/* Guide Tab Content */}
        <TabsContent value="guide">
          <GameGuide />
        </TabsContent>
      </Tabs>
    </div>
  )
}
