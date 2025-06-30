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
  Play,
  Plus,
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
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [isDrawingAndPayout, setIsDrawingAndPayout] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const currentBetTypes = getBetTypesByMode(currentMode)
  const currentBetType = currentBetTypes.find((bt) => bt.id === selectedBetType) || currentBetTypes[0]
  const currentModeInfo = FAST_LOTTERY_MODES.find((mode) => mode.id === currentMode)

  // Check if user is admin
  const isAdmin = user?.role === "admin"

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

  const handleCreateNewSession = async () => {
    if (!isAdmin) {
      toast({
        title: "Lỗi quyền truy cập",
        description: "Bạn không có quyền thực hiện thao tác này.",
        variant: "destructive",
      })
      return
    }

    // Prevent multiple clicks
    if (isCreatingSession) {
      return
    }

    // Check if there's already an active session
    if (currentSession && currentSession.status === "open") {
      toast({
        title: "Đã có phiên đang hoạt động",
        description: `Phiên #${currentSession.session_number} đang mở cược. Vui lòng chờ phiên này kết thúc.`,
        variant: "destructive",
      })
      return
    }

    setIsCreatingSession(true)
    try {
      const gameType = `lode_nhanh_${currentMode}`
      const response = await fetch("/api/game/create-next-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ gameType }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          // Conflict - already has active session
          toast({
            title: "Không thể tạo phiên mới",
            description: result.details || result.error,
            variant: "destructive",
          })
        } else {
          throw new Error(result.error || "Lỗi không xác định khi tạo phiên mới.")
        }
        return
      }

      toast({
        title: "Tạo phiên thành công!",
        description: `Đã tạo phiên #${result.session?.session_number} cho ${currentModeInfo?.name}.`,
      })
      fetchGameData() // Refresh data after creating session
    } catch (err) {
      toast({
        title: "Lỗi tạo phiên mới",
        description: err instanceof Error ? err.message : "Lỗi không xác định.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingSession(false)
    }
  }

  const handleDrawAndPayout = async () => {
    if (!isAdmin) {
      toast({
        title: "Lỗi quyền truy cập",
        description: "Bạn không có quyền thực hiện thao tác này.",
        variant: "destructive",
      })
      return
    }
    if (!currentSession || currentSession.status !== "open") {
      toast({
        title: "Lỗi",
        description: "Phiên không ở trạng thái 'mở' để quay số.",
        variant: "destructive",
      })
      return
    }

    // Prevent multiple clicks
    if (isDrawingAndPayout) {
      return
    }

    setIsDrawingAndPayout(true)
    try {
      // Step 1: Draw lottery
      const drawResponse = await fetch("/api/game/draw-lottery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          gameType: `lode_nhanh_${currentMode}`,
          forceManual: true,
        }),
      })

      if (!drawResponse.ok) {
        const errorData = await drawResponse.json()
        throw new Error(errorData.error || "Lỗi không xác định khi quay số.")
      }

      const drawResult = await drawResponse.json()

      toast({
        title: "Quay số và trả thưởng thành công!",
        description: `Phiên #${drawResult.session.session_number} đã hoàn thành. ${drawResult.processing_result?.winners || 0} người thắng.`,
      })

      fetchGameData() // Refresh data after draw and payout
    } catch (err) {
      toast({
        title: "Lỗi quay số và trả thưởng",
        description: err instanceof Error ? err.message : "Lỗi không xác định.",
        variant: "destructive",
      })
    } finally {
      setIsDrawingAndPayout(false)
    }
  }

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

  const handleBetAmountChange = (amount: string) => {
    setBetAmount(amount)
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

    // Check if betting is still allowed (more than 5 seconds remaining)
    if (currentSession.countdown_seconds <= 5) {
      toast({
        title: "Lỗi đặt cược",
        description: "Đã hết thời gian đặt cược. Vui lòng chờ phiên tiếp theo.",
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
      // Determine if this is a point-based bet (Lô)
      const isPointBased = selectedBetType.includes("lo") && !selectedBetType.includes("de")

      const potentialWin = totalWin

      const payload: any = {
        sessionId: currentSession.id,
        betType: selectedBetType,
        numbers: selectedNumbers,
        amount: totalCost,
        potentialWin,
      }

      if (isPointBased) {
        payload.points = amount // For Lô, amount is points per number
      }

      const response = await fetch("/api/game/place-bet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Lỗi không xác định khi đặt cược.")
      }

      const result = await response.json()
      setSuccessMessage(`Đặt cược thành công! Chi phí: ${totalCost.toLocaleString("vi-VN")}đ`)
      setBetAmount("")
      setSelectedNumbers([])
      refreshBalance()

      toast({
        title: "Đặt cược thành công!",
        description: `${currentBetType.name}: ${selectedNumbers.join(", ")} - ${totalCost.toLocaleString("vi-VN")}đ`,
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

  // Determine session status for display
  const getSessionStatusInfo = () => {
    if (!currentSession) return { status: "Chưa có phiên", color: "bg-gray-500", canBet: false }

    const countdown = currentSession.countdown_seconds

    if (countdown > 5) {
      return { status: "Đang nhận cược", color: "bg-green-500", canBet: true }
    } else if (countdown > 3) {
      return { status: "Đóng cược", color: "bg-yellow-500", canBet: false }
    } else if (countdown > 0) {
      return { status: "Chuẩn bị quay", color: "bg-orange-500", canBet: false }
    } else {
      return { status: "Đang xử lý", color: "bg-red-500", canBet: false }
    }
  }

  const sessionStatus = getSessionStatusInfo()

  // Check if we can create a new session (no active session exists)
  const canCreateNewSession = !currentSession || currentSession.status !== "open"

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
                {isAdmin && <Badge className="bg-yellow-500 text-black font-bold">ADMIN</Badge>}
              </div>
              <p className="text-orange-100">Siêu tốc 1-30 phút - Kết quả nhanh, thắng liền tay!</p>
              <p className="text-orange-200 text-sm mt-1">
                📋 Quy trình: Còn 5s đóng cược → Còn 3s quay số → Hết giờ tạo phiên mới
              </p>
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
                    <Badge className={`text-lg px-4 py-2 mb-4 ${sessionStatus.color} text-white`}>
                      {sessionStatus.status}
                    </Badge>

                    {/* Admin Controls */}
                    {isAdmin && (
                      <div className="mt-4 space-y-2">
                        {/* Create New Session Button - Only show when no active session */}
                        <Button
                          onClick={handleCreateNewSession}
                          disabled={isCreatingSession || !canCreateNewSession}
                          variant="outline"
                          className={`w-full ${
                            canCreateNewSession
                              ? "bg-green-500 text-white hover:bg-green-600 border-green-500"
                              : "bg-gray-400 text-gray-600 cursor-not-allowed"
                          }`}
                        >
                          {isCreatingSession ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Plus className="w-4 h-4 mr-2" />
                          )}
                          {canCreateNewSession ? "Tạo phiên mới" : "Đã có phiên đang hoạt động"}
                        </Button>

                        {/* Draw and Payout Button - Show when countdown <= 5 seconds */}
                        {currentSession &&
                          currentSession.status === "open" &&
                          currentSession.countdown_seconds <= 5 && (
                            <Button
                              onClick={handleDrawAndPayout}
                              disabled={isDrawingAndPayout}
                              variant="outline"
                              className="w-full bg-orange-500 text-white hover:bg-orange-600 border-orange-500"
                            >
                              {isDrawingAndPayout ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              ) : (
                                <Play className="w-4 h-4 mr-2" />
                              )}
                              Quay số và Trả thưởng
                            </Button>
                          )}
                      </div>
                    )}
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
                    {!sessionStatus.canBet && (
                      <Badge variant="destructive" className="ml-2">
                        Đã đóng cược
                      </Badge>
                    )}
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
                      onBetAmountChange={handleBetAmountChange}
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

                  {/* Betting Status Alert */}
                  {!sessionStatus.canBet && currentSession && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        {currentSession.countdown_seconds > 3
                          ? "Đã hết thời gian đặt cược. Vui lòng chờ quay số."
                          : currentSession.countdown_seconds > 0
                            ? "Đang chuẩn bị quay số..."
                            : "Đang xử lý kết quả và tạo phiên mới..."}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Place Bet Button */}
                  <Button
                    onClick={handlePlaceBet}
                    disabled={
                      isLoading ||
                      !user ||
                      !currentSession ||
                      !sessionStatus.canBet ||
                      selectedNumbers.length === 0 ||
                      Number.parseFloat(betAmount) < currentBetType.min_bet
                    }
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-lg py-6 shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <DollarSign className="w-5 h-5 mr-2" />
                    )}
                    {sessionStatus.canBet ? "Đặt cược ngay" : "Đã đóng cược"}
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
