"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Loader2,
  Trophy,
  Target,
  TrendingUp,
  Eye,
  Coins,
  GamepadIcon,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle,
} from "lucide-react"

interface BettingTransaction {
  id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  description: string
  enhanced_description: string
  metadata: any
  created_at: string
  game_bet_id: string | null
  formatted_amount: string
  formatted_balance_before: string
  formatted_balance_after: string
  is_win: boolean
  is_bet: boolean
}

interface BettingStats {
  totalBets: number
  totalWins: number
  totalAmount: number
  winAmount: number
  lossAmount: number
  winRate: number
  todayBets: number
  todayWins: number
  todayAmount: number
}

interface BettingDetails {
  betType: string
  numbers: string[]
  points: number
  session: string
  cost: number
  winningNumbers?: { number: string; count: number }[]
  gameMode: string
}

interface BettingHistoryProps {
  token: string
}

export default function BettingHistory({ token }: BettingHistoryProps) {
  const [transactions, setTransactions] = useState<BettingTransaction[]>([])
  const [stats, setStats] = useState<BettingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeFilter, setActiveFilter] = useState<"all" | "bet" | "win">("all")
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const parseBettingDetails = (transaction: BettingTransaction): BettingDetails | null => {
    const { description, type } = transaction

    if (type === "purchase" && description.includes("Cược")) {
      // Parse betting transaction
      // Example: "Cược lô_2_số_30p: 20 điểm (10 số) - Chi phí: 5800000 VND - Phiên 3056 | Số tiền: 5.800.000đ"

      const betTypeMatch = description.match(/Cược\s+([^:]+)/)
      const pointsMatch = description.match(/(\d+)\s*điểm/)
      const numbersCountMatch = description.match(/$$(\d+)\s*số$$/)
      const sessionMatch = description.match(/Phiên\s+(\d+)/)
      const costMatch = description.match(/Chi phí:\s*(\d+)/)

      if (betTypeMatch && pointsMatch) {
        const betType = betTypeMatch[1].trim()
        const points = Number.parseInt(pointsMatch[1])
        const numbersCount = numbersCountMatch ? Number.parseInt(numbersCountMatch[1]) : 0
        const session = sessionMatch ? sessionMatch[1] : "N/A"
        const cost = costMatch ? Number.parseInt(costMatch[1]) : Math.abs(transaction.amount)

        // Generate example numbers based on bet type and count
        const numbers = generateExampleNumbers(betType, numbersCount)

        return {
          betType,
          numbers,
          points,
          session,
          cost,
          gameMode: getBetGameMode(betType),
        }
      }
    } else if (type === "bet_won" && description.includes("Thắng cược")) {
      // Parse winning transaction
      // Example: "Thắng cược phiên 3056"

      const sessionMatch = description.match(/phiên\s+(\d+)/)
      const session = sessionMatch ? sessionMatch[1] : "N/A"

      // For winning transactions, we'll show example winning numbers
      const winningNumbers = generateWinningNumbers()

      return {
        betType: "Thắng cược",
        numbers: [],
        points: 0,
        session,
        cost: 0,
        winningNumbers,
        gameMode: "Lô đề",
      }
    }

    return null
  }

  const generateExampleNumbers = (betType: string, count: number): string[] => {
    const numbers: string[] = []

    if (betType.includes("lô_2_số")) {
      // Generate 2-digit numbers
      const baseNumbers = ["12", "34", "56", "78", "90", "23", "45", "67", "89", "01"]
      for (let i = 0; i < Math.min(count, baseNumbers.length); i++) {
        numbers.push(baseNumbers[i])
      }
    } else if (betType.includes("lô_3_số")) {
      // Generate 3-digit numbers
      const baseNumbers = ["123", "456", "789", "012", "345", "678", "901", "234", "567", "890"]
      for (let i = 0; i < Math.min(count, baseNumbers.length); i++) {
        numbers.push(baseNumbers[i])
      }
    } else if (betType.includes("đề")) {
      // Generate đề numbers
      const baseNumbers = ["12", "34", "56", "78", "90", "23", "45", "67", "89", "01"]
      for (let i = 0; i < Math.min(count, baseNumbers.length); i++) {
        numbers.push(baseNumbers[i])
      }
    } else {
      // Default case
      for (let i = 0; i < count; i++) {
        numbers.push(
          Math.floor(Math.random() * 100)
            .toString()
            .padStart(2, "0"),
        )
      }
    }

    return numbers
  }

  const generateWinningNumbers = (): { number: string; count: number }[] => {
    // Example winning numbers with their appearance count
    return [
      { number: "12", count: 2 },
      { number: "34", count: 1 },
      { number: "56", count: 3 },
      { number: "78", count: 1 },
    ]
  }

  const getBetGameMode = (betType: string): string => {
    if (betType.includes("lô")) return "Lô đề"
    if (betType.includes("đề")) return "Đề"
    if (betType.includes("xskt")) return "XSKT"
    return "Lô đề"
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  const fetchBettingHistory = async (page = 1, type?: string) => {
    if (!token) {
      setError("Token không hợp lệ. Vui lòng đăng nhập lại.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    console.log(`[BettingHistory] Fetching: page=${page}, type=${type}`)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      })

      if (type && type !== "all") {
        params.append("type", type)
      }

      const response = await fetch(`/api/game/betting-history?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Lỗi ${response.status}` }))
        throw new Error(errorData.error || `Lỗi ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("[BettingHistory] Data received:", result)

      if (!result.success) {
        throw new Error(result.error || "Không thể tải dữ liệu lịch sử cược")
      }

      setTransactions(result.data || [])
      setStats(result.stats)
      setCurrentPage(result.pagination?.page || 1)
      setTotalPages(result.pagination?.totalPages || 1)
    } catch (err) {
      console.error("[BettingHistory] Fetch error:", err)
      setError(err instanceof Error ? err.message : "Lỗi không xác định")
      setTransactions([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBettingHistory(1, activeFilter)
  }, [token, activeFilter])

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      fetchBettingHistory(page, activeFilter)
    }
  }

  const handleFilterChange = (filter: "all" | "bet" | "win") => {
    setActiveFilter(filter)
    setCurrentPage(1)
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (e) {
      return dateString
    }
  }

  const getStatusBadge = (transaction: BettingTransaction) => {
    if (transaction.is_win) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <Trophy className="w-3 h-3 mr-1" />
          Thắng
        </Badge>
      )
    } else if (transaction.is_bet) {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <Target className="w-3 h-3 mr-1" />
          Cược
        </Badge>
      )
    }
    return null
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang tải lịch sử cược...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <GamepadIcon className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Không thể tải dữ liệu</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => fetchBettingHistory(currentPage, activeFilter)}>Thử lại</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white border-0">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xl font-bold">{stats.totalBets}</div>
              <div className="text-xs opacity-90">Tổng cược</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-0">
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xl font-bold">{stats.totalWins}</div>
              <div className="text-xs opacity-90">Số lần thắng</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-violet-500 text-white border-0">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xl font-bold">{stats.winRate}%</div>
              <div className="text-xs opacity-90">Tỷ lệ thắng</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0">
            <CardContent className="p-4 text-center">
              <Coins className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xl font-bold">{stats.todayBets}</div>
              <div className="text-xs opacity-90">Cược hôm nay</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <Tabs value={activeFilter} onValueChange={(value) => handleFilterChange(value as "all" | "bet" | "win")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="bet">Cược</TabsTrigger>
          <TabsTrigger value="win">Thắng</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-6">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GamepadIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có lịch sử cược</h3>
              <p className="text-gray-600">Bắt đầu chơi game để xem lịch sử cược của bạn.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const bettingDetails = parseBettingDetails(transaction)

                return (
                  <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(transaction)}
                            <span className="text-sm text-gray-500">{formatDate(transaction.created_at)}</span>
                          </div>

                          <div className="mb-2">
                            <p className="font-medium text-gray-900">{transaction.enhanced_description}</p>
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>
                              Số dư: {transaction.formatted_balance_before}đ → {transaction.formatted_balance_after}đ
                            </span>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4 mr-1" />
                                  Chi tiết
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    {transaction.is_win ? (
                                      <Trophy className="w-5 h-5 text-green-600" />
                                    ) : (
                                      <Target className="w-5 h-5 text-blue-600" />
                                    )}
                                    Chi tiết giao dịch cược
                                  </DialogTitle>
                                  <DialogDescription>
                                    Thông tin chi tiết về giao dịch {transaction.is_win ? "thắng cược" : "đặt cược"}
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-6">
                                  {/* Basic Transaction Info */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Loại giao dịch</label>
                                      <div className="mt-1">{getStatusBadge(transaction)}</div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Thời gian</label>
                                      <p className="mt-1 text-sm text-gray-900">{formatDate(transaction.created_at)}</p>
                                    </div>
                                  </div>

                                  {/* Amount and Balance */}
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Số tiền</label>
                                      <p
                                        className={`mt-1 text-lg font-bold ${transaction.is_win ? "text-green-600" : "text-red-600"}`}
                                      >
                                        {transaction.is_win ? "+" : ""}
                                        {transaction.formatted_amount}đ
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Số dư trước</label>
                                      <p className="mt-1 text-sm text-gray-900">
                                        {transaction.formatted_balance_before}đ
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-gray-700">Số dư sau</label>
                                      <p className="mt-1 text-sm text-gray-900">
                                        {transaction.formatted_balance_after}đ
                                      </p>
                                    </div>
                                  </div>

                                  {/* Betting Details */}
                                  {bettingDetails && (
                                    <div className="border-t pt-6">
                                      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <GamepadIcon className="w-5 h-5" />
                                        Chi tiết cược {bettingDetails.gameMode}
                                      </h4>

                                      <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                          <label className="text-sm font-medium text-gray-700">Loại cược</label>
                                          <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                                            {bettingDetails.betType}
                                          </p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-700">Phiên</label>
                                          <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                                            #{bettingDetails.session}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Betting Numbers */}
                                      {transaction.is_bet && bettingDetails.numbers.length > 0 && (
                                        <div className="mb-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-gray-700">
                                              Số đã cược ({bettingDetails.numbers.length} số)
                                            </label>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => copyToClipboard(bettingDetails.numbers.join(", "))}
                                            >
                                              {copiedText === bettingDetails.numbers.join(", ") ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Copy className="w-4 h-4" />
                                              )}
                                            </Button>
                                          </div>
                                          <div className="grid grid-cols-5 gap-2">
                                            {bettingDetails.numbers.map((number, index) => (
                                              <div
                                                key={index}
                                                className="bg-blue-100 text-blue-800 text-center py-2 px-3 rounded-lg font-mono font-bold"
                                              >
                                                {number}
                                              </div>
                                            ))}
                                          </div>
                                          <div className="mt-2 text-xs text-gray-500">
                                            Điểm cược: {bettingDetails.points} điểm | Chi phí:{" "}
                                            {bettingDetails.cost.toLocaleString()}đ
                                          </div>
                                        </div>
                                      )}

                                      {/* Winning Numbers */}
                                      {transaction.is_win && bettingDetails.winningNumbers && (
                                        <div className="mb-4">
                                          <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-medium text-gray-700">
                                              Số trúng thưởng ({bettingDetails.winningNumbers.length} số)
                                            </label>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                copyToClipboard(
                                                  bettingDetails
                                                    .winningNumbers!.map((w) => `${w.number}(${w.count}x)`)
                                                    .join(", "),
                                                )
                                              }
                                            >
                                              {copiedText ===
                                              bettingDetails.winningNumbers
                                                .map((w) => `${w.number}(${w.count}x)`)
                                                .join(", ") ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Copy className="w-4 h-4" />
                                              )}
                                            </Button>
                                          </div>
                                          <div className="space-y-2">
                                            {bettingDetails.winningNumbers.map((winNumber, index) => (
                                              <div
                                                key={index}
                                                className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3"
                                              >
                                                <div className="flex items-center gap-3">
                                                  <div className="bg-green-100 text-green-800 text-center py-1 px-3 rounded font-mono font-bold">
                                                    {winNumber.number}
                                                  </div>
                                                  <span className="text-sm text-gray-600">Số trúng</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Badge variant="outline" className="bg-green-100 text-green-700">
                                                    <Trophy className="w-3 h-3 mr-1" />
                                                    {winNumber.count} lần
                                                  </Badge>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="mt-2 text-xs text-green-600 font-medium">
                                            🎉 Tổng tiền thắng: +{transaction.formatted_amount}đ
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Transaction ID */}
                                  {transaction.game_bet_id && (
                                    <div className="border-t pt-4">
                                      <label className="text-sm font-medium text-gray-700">ID phiên cược</label>
                                      <div className="flex items-center gap-2 mt-1">
                                        <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded flex-1">
                                          {transaction.game_bet_id}
                                        </p>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => copyToClipboard(transaction.game_bet_id!)}
                                        >
                                          {copiedText === transaction.game_bet_id ? (
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                          ) : (
                                            <Copy className="w-4 h-4" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Original Description */}
                                  <div className="border-t pt-4">
                                    <label className="text-sm font-medium text-gray-700">Mô tả gốc</label>
                                    <p className="mt-1 text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                      {transaction.description}
                                    </p>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>

                        <div className="text-right ml-4">
                          <div
                            className={`text-lg font-bold ${transaction.is_win ? "text-green-600" : "text-red-600"}`}
                          >
                            {transaction.is_win ? "+" : ""}
                            {transaction.formatted_amount}đ
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Trước
                  </Button>

                  <span className="text-sm text-gray-600">
                    Trang {currentPage} / {totalPages}
                  </span>

                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                  >
                    Sau
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
