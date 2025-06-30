"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/app/components/AuthProvider"
import { useToast } from "@/hooks/use-toast"
import {
  Loader2,
  History,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  Trophy,
  Calendar,
  Target,
  Clock,
  Star,
  Play,
  Award,
  Plus,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Import game components and utilities
import { BetTypeSelectorWithCategories } from "../components/BetTypeSelectorWithCategories"
import { NumberInputSelector } from "../components/NumberInputSelector"
import { DynamicBetAmountInput } from "../components/DynamicBetAmountInput"
import type { LotterySession } from "../types"
import { TRADITIONAL_LOTTERY_BET_TYPES, BET_CATEGORIES } from "../constants"
import { formatCountdown } from "../utils"
import { getCalculationBreakdown, validateBetSelection } from "../utils"
import { getNumberLengthForBetType, getMaxNumbersForBetType, validateNumberFormat } from "../utils/validation"

// Helper function to safely render prize numbers
const renderPrizeNumbers = (prizes: any, className = "bg-gray-100 text-gray-800") => {
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

  const [isDrawingManual, setIsDrawingManual] = useState(false)
  const [isProcessingPayout, setIsProcessingPayout] = useState(false)
  const [isCreatingSession, setIsCreatingSession] = useState(false)

  // Check if user is admin
  const isAdmin = user?.role === "admin"

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

  const handleCreateNewSession = async () => {
    if (!isAdmin) {
      toast({
        title: "Lỗi quyền truy cập",
        description: "Bạn không có quyền thực hiện thao tác này.",
        variant: "destructive",
      })
      return
    }

    setIsCreatingSession(true)
    try {
      const gameType = "lode_mien_bac"
      const response = await fetch("/api/admin/lottery/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ gameType }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Lỗi không xác định khi tạo phiên mới.")
      }

      const result = await response.json()
      toast({
        title: "Tạo phiên thành công!",
        description: `Đã tạo phiên #${result.session?.session_number} cho Lô Đề Miền Bắc.`,
      })
      fetchLotteryData() // Refresh data after creating session
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

  const handleManualDraw = async () => {
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

    setIsDrawingManual(true)
    try {
      const response = await fetch("/api/game/draw-lottery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          sessionId: currentSession.id,
          gameType: "lode_mien_bac",
          forceManual: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Lỗi không xác định khi quay số thủ công.")
      }

      const result = await response.json()
      toast({
        title: "Quay số thành công!",
        description: `Phiên #${result.session.session_number} đã được quay. ${result.processing_result?.winners || 0} người thắng.`,
      })
      fetchLotteryData() // Refresh data after draw
    } catch (err) {
      toast({
        title: "Lỗi quay số thủ công",
        description: err instanceof Error ? err.message : "Lỗi không xác định.",
        variant: "destructive",
      })
    } finally {
      setIsDrawingManual(false)
    }
  }

  const handleProcessPayout = async () => {
    if (!isAdmin) {
      toast({
        title: "Lỗi quyền truy cập",
        description: "Bạn không có quyền thực hiện thao tác này.",
        variant: "destructive",
      })
      return
    }
    if (!currentSession || currentSession.status !== "completed" || !currentSession.winning_numbers) {
      toast({
        title: "Lỗi",
        description: "Phiên không ở trạng thái 'hoàn thành' hoặc chưa có kết quả để trả thưởng.",
        variant: "destructive",
      })
      return
    }

    setIsProcessingPayout(true)
    try {
      const response = await fetch("/api/admin/lottery/process-payout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ sessionId: currentSession.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Lỗi không xác định khi xử lý trả thưởng.")
      }

      const result = await response.json()
      toast({
        title: "Xử lý trả thưởng thành công!",
        description: `Đã xử lý ${result.processed_bets} cược, ${result.winners} người thắng, tổng thưởng ${result.total_payout.toLocaleString("vi-VN")}đ.`,
      })
      fetchLotteryData() // Refresh data after payout
    } catch (err) {
      toast({
        title: "Lỗi xử lý trả thưởng",
        description: err instanceof Error ? err.message : "Lỗi không xác định.",
        variant: "destructive",
      })
    } finally {
      setIsProcessingPayout(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Game Header */}
      <Card className="bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 border-0 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-6 h-6" />
                <h1 className="text-2xl font-bold">Lô Đề Miền Bắc</h1>
                <Badge className="bg-white/20 text-white">
                  <Star className="w-3 h-3 mr-1" />
                  Chính thức
                </Badge>
                {isAdmin && <Badge className="bg-yellow-500 text-black font-bold">ADMIN</Badge>}
              </div>
              <p className="text-blue-100">Theo kết quả XSMB chính thức - Quay số 18:15 hàng ngày</p>
            </div>
            <div className="text-5xl opacity-20">
              <Calendar />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="bg-white/80 backdrop-blur-sm border-0">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Đang tải dữ liệu xổ số...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Current Session & Recent Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Session */}
            <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="text-center pb-3">
                <CardTitle className="flex items-center justify-center gap-2 text-gray-900">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  Phiên {currentSession?.date || "N/A"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{formatCountdown(timeUntilDraw)}</div>
                <p className="text-sm text-gray-500 mb-2">Thời gian đến khi quay số</p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <p className="text-lg font-semibold text-gray-700">Quay số lúc 18:15</p>
                </div>
                <Badge
                  className={`text-lg px-4 py-2 mb-4 ${
                    currentSession?.status === "open"
                      ? "bg-green-500 text-white"
                      : currentSession?.status === "drawing"
                        ? "bg-yellow-500 text-white"
                        : "bg-gray-500 text-white"
                  }`}
                >
                  {currentSession?.status === "open"
                    ? "Đang nhận cược"
                    : currentSession?.status === "drawing"
                      ? "Đang quay số"
                      : "Đã có kết quả"}
                </Badge>

                {/* Admin Controls */}
                {isAdmin && (
                  <div className="mt-4 space-y-2">
                    {/* Create New Session Button - Always visible for admin */}
                    <Button
                      onClick={handleCreateNewSession}
                      disabled={isCreatingSession}
                      variant="outline"
                      className="w-full bg-green-500 text-white hover:bg-green-600 border-green-500"
                    >
                      {isCreatingSession ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Tạo phiên mới
                    </Button>

                    {/* Manual Draw Button - Show when session is open */}
                    {currentSession && currentSession.status === "open" && (
                      <Button
                        onClick={handleManualDraw}
                        disabled={isDrawingManual}
                        variant="outline"
                        className="w-full bg-blue-500 text-white hover:bg-blue-600 border-blue-500"
                      >
                        {isDrawingManual ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Quay số thủ công
                      </Button>
                    )}

                    {/* Process Payout Button - Show when session is completed */}
                    {currentSession && currentSession.status === "completed" && currentSession.winning_numbers && (
                      <Button
                        onClick={handleProcessPayout}
                        disabled={isProcessingPayout}
                        variant="outline"
                        className="w-full bg-purple-500 text-white hover:bg-purple-600 border-purple-500"
                      >
                        {isProcessingPayout ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Award className="w-4 h-4 mr-2" />
                        )}
                        Xử lý trả thưởng
                      </Button>
                    )}
                  </div>
                )}
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
                  <div className="space-y-4">
                    {recentResults.map((result, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-gray-900">Ngày {result.date}</p>
                          <Badge className="bg-green-100 text-green-800">Hoàn thành</Badge>
                        </div>
                        {result.results_data && (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-red-600">ĐB:</span>
                              <Badge className="bg-red-500 text-white font-bold">
                                {result.results_data.special_prize || "N/A"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">G1:</span>
                              {renderPrizeNumbers(result.results_data.first_prize, "bg-blue-500 text-white")}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">G2:</span>
                              {renderPrizeNumbers(result.results_data.second_prize)}
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
                betTypes={TRADITIONAL_LOTTERY_BET_TYPES}
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
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white text-lg py-6 shadow-lg"
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
        </>
      )}
    </div>
  )
}
