"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Eye,
  Trophy,
  Target,
  TrendingUp,
  Hash,
  Star,
  GamepadIcon,
  ChevronLeft,
  ChevronRight,
  Coins,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface BettingTransaction {
  id: string
  type: string
  amount: number
  balance_before: number
  balance_after: number
  description: string
  enhanced_description: string // Added from API response
  formatted_amount: string // Added from API response
  formatted_balance_before: string // Added from API response
  formatted_balance_after: string // Added from API response
  is_win: boolean // Added from API response
  is_bet: boolean // Added from API response
  created_at: string
  game_bet_id?: string
  metadata?: {
    bet_type?: string
    numbers?: number[]
    session_number?: number
    win_amount?: number
    actual_winning_numbers?: { [key: string]: number }
  }
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

interface BettingDetail {
  id: string
  session_number: string
  game_mode: string
  bet_type: string
  numbers: string[]
  bet_amount: number
  points: number
  potential_win: number
  actual_win?: number
  status: string
  created_at: string
  processed_at?: string
  winning_numbers: string[]
  hit_count: { [key: string]: number }
  total_hits: number
  player_winning_numbers: string[]
  session_info: any
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

  // Detail modal state
  const [selectedTransaction, setSelectedTransaction] = useState<BettingTransaction | null>(null)
  const [bettingDetail, setBettingDetail] = useState<BettingDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const { toast } = useToast()

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

      // FIX: Read from result.data instead of result.transactions
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

  const fetchBettingDetail = async (transaction: BettingTransaction) => {
    setDetailLoading(true)
    setBettingDetail(null)

    try {
      const params = new URLSearchParams({
        transaction_id: transaction.id,
      })

      if (transaction.game_bet_id) {
        params.append("game_bet_id", transaction.game_bet_id)
      }

      const response = await fetch(`/api/game/betting-details?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.betting_details) {
          setBettingDetail(result.betting_details)
        }
      }
    } catch (error) {
      console.error("[BettingHistory] Detail fetch error:", error)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleShowDetail = async (transaction: BettingTransaction) => {
    setSelectedTransaction(transaction)
    setShowDetailModal(true)
    await fetchBettingDetail(transaction)
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

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("vi-VN")
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

  const getBetTypeDisplay = (betType: string) => {
    const typeMap: { [key: string]: string } = {
      lo_2_so: "Lô 2 Số",
      lo_3_so: "Lô 3 Số",
      de: "Đề",
      xien: "Xiên",
      lo_2_so_30p: "Lô 2 Số 30p",
      lo_2_so_1p: "Lô 2 Số 1p",
      lo_2_so_5p: "Lô 2 Số 5p",
    }
    return typeMap[betType] || betType
  }

  const parseWinningDescription = (description: string) => {
    console.log("[BettingHistory] Parsing winning description:", description)

    const result: any = { isWinning: true }

    // Extract bet type from winning description
    const betTypeMatch = description.match(/🏆 Thắng cược ([^:]+):/)
    if (betTypeMatch) {
      result.betType = betTypeMatch[1].trim()
    }

    // Extract ONLY the player's actual winning numbers: "Số trúng [34[1], 31[2], 27[2]]"
    const winningNumbersMatch = description.match(/Số trúng \[([^\]]+)\]/)
    if (winningNumbersMatch) {
      const winningNumbersStr = winningNumbersMatch[1]
      result.winningNumbers = []
      result.hitCounts = {}

      // Parse individual winning numbers: "34[1], 31[2], 27[2]"
      const numberMatches = winningNumbersStr.match(/(\d+)\[(\d+)\]/g)
      if (numberMatches) {
        numberMatches.forEach((match) => {
          const [, number, count] = match.match(/(\d+)\[(\d+)\]/) || []
          if (number && count) {
            result.winningNumbers.push(number)
            result.hitCounts[number] = Number.parseInt(count)
          }
        })
      }
    }

    // Extract points per number
    const pointsMatch = description.match(/(\d+)\.00\s*điểm\/số/)
    if (pointsMatch) {
      result.pointsPerNumber = Number.parseInt(pointsMatch[1])
    }

    // Extract total hits
    const totalHitsMatch = description.match(/Tổng\s*(\d+)\s*lần trúng/)
    if (totalHitsMatch) {
      result.totalHits = Number.parseInt(totalHitsMatch[1])
    }

    // Extract session number
    const sessionMatch = description.match(/Phiên\s*([^|]+)/)
    if (sessionMatch) {
      result.sessionNumber = sessionMatch[1].trim()
    }

    // Extract total winnings
    const winningsMatch = description.match(/Thưởng:\s*([0-9.,]+)đ/)
    if (winningsMatch) {
      result.totalWinnings = winningsMatch[1] + "đ"
    }

    return result
  }

  const parseBettingDescription = (description: string) => {
    console.log("[BettingHistory] Parsing betting description:", description)

    const result: any = {}

    // Extract numbers from betting description
    const numbersMatch = description.match(/🎯[^:]+:\s*([0-9, ]+)/)
    if (numbersMatch) {
      result.numbers = numbersMatch[1].split(", ").map((n) => n.trim())
    }

    // Parse different parts separated by " | "
    const parts = description.split(" | ")

    parts.forEach((part) => {
      // Match pattern: "10 điểm/số (290.000đ/số)"
      const pointsCostMatch = part.match(/(\d+)\s*điểm\/số\s*$$([^)]+)\/số$$/)
      if (pointsCostMatch) {
        result.pointsPerNumber = Number.parseInt(pointsCostMatch[1])
        result.costPerNumber = pointsCostMatch[2]
      }

      // Match pattern: "10 số"
      const numbersCountMatch = part.match(/(\d+)\s*số/)
      if (numbersCountMatch) {
        result.numbersCount = Number.parseInt(numbersCountMatch[1])
      }

      // Match pattern: "Tổng: 2.900.000đ"
      const totalCostMatch = part.match(/Tổng:\s*([0-9.,]+đ)/)
      if (totalCostMatch) {
        result.totalCost = totalCostMatch[1].trim()
      }

      // Match pattern: "Phiên: 1388"
      const sessionMatch = part.match(/Phiên:\s*(.+)/)
      if (sessionMatch) {
        result.sessionNumber = sessionMatch[1].trim()
      }
    })

    // Calculate total points if we have the data
    if (result.pointsPerNumber && result.numbersCount) {
      result.totalPoints = result.pointsPerNumber * result.numbersCount
    }

    return result
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
                // Parse description based on transaction type
                const parsedDetails = transaction.is_win
                  ? parseWinningDescription(transaction.enhanced_description || transaction.description)
                  : parseBettingDescription(transaction.description)

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
                            {/* Display enhanced description for winning transactions */}
                            {transaction.is_win ? (
                              <div>
                                <p className="font-medium text-gray-900 leading-relaxed mb-2">
                                  {transaction.enhanced_description || transaction.description}
                                </p>

                                {/* Enhanced details for winning transactions - show ONLY player's winning numbers */}
                                {parsedDetails.winningNumbers && parsedDetails.winningNumbers.length > 0 && (
                                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-l-4 border-green-400">
                                    <div className="flex items-center gap-2 mb-3">
                                      <Trophy className="w-5 h-5 text-green-600" />
                                      <span className="text-sm font-bold text-green-800">
                                        🎉 Số bạn đã trúng thưởng ({parsedDetails.winningNumbers.length} số)
                                      </span>
                                    </div>
                                    <div className="space-y-3">
                                      <div className="flex flex-wrap gap-2">
                                        {parsedDetails.winningNumbers.map((number: string, index: number) => (
                                          <div
                                            key={index}
                                            className="flex items-center bg-white rounded-lg px-3 py-2 border border-green-200 shadow-sm"
                                          >
                                            <span className="text-lg font-bold text-green-700 mr-2">{number}</span>
                                            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full font-medium">
                                              {parsedDetails.hitCounts[number]} lần
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-green-200">
                                        <div className="text-center">
                                          <div className="text-xs text-green-600 font-medium">Tổng lần trúng</div>
                                          <div className="text-lg font-bold text-green-700">
                                            {parsedDetails.totalHits} lần
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-xs text-green-600 font-medium">Điểm cược</div>
                                          <div className="text-lg font-bold text-green-700">
                                            {parsedDetails.pointsPerNumber} điểm/số
                                          </div>
                                        </div>
                                      </div>
                                      <div className="text-center pt-2 border-t border-green-200">
                                        <div className="text-xs text-green-600 font-medium mb-1">Tổng tiền thắng</div>
                                        <div className="text-xl font-bold text-green-600 bg-green-100 px-4 py-2 rounded-lg">
                                          💰 {parsedDetails.totalWinnings}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium text-gray-900 leading-relaxed mb-2">
                                  {transaction.description}
                                </p>

                                {/* Enhanced details for betting transactions */}
                                {parsedDetails.numbers && (
                                  <div className="p-2 bg-gray-50 rounded-lg">
                                    <div className="flex flex-wrap gap-1 mb-1">
                                      <span className="text-xs text-gray-600">Số cược:</span>
                                      {parsedDetails.numbers.map((number: string, index: number) => (
                                        <Badge key={index} variant="outline" className="text-xs">
                                          {number}
                                        </Badge>
                                      ))}
                                    </div>
                                    {(parsedDetails.pointsPerNumber ||
                                      parsedDetails.costPerNumber ||
                                      parsedDetails.totalPoints) && (
                                      <div className="text-xs text-gray-600 space-y-1">
                                        <div>
                                          {parsedDetails.pointsPerNumber || "?"} điểm/số • {parsedDetails.numbersCount}{" "}
                                          số
                                          {parsedDetails.costPerNumber && ` • ${parsedDetails.costPerNumber}/số`}
                                        </div>
                                        <div className="font-medium">
                                          Tổng: {parsedDetails.totalPoints || "?"} điểm ={" "}
                                          {parsedDetails.totalCost || "N/A"}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>
                              Số dư: {transaction.formatted_balance_before}đ → {transaction.formatted_balance_after}đ
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => handleShowDetail(transaction)}>
                              <Eye className="w-4 h-4 mr-1" />
                              Chi tiết
                            </Button>
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

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết giao dịch</DialogTitle>
            <DialogDescription>Thông tin chi tiết về giao dịch cược</DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-6">
              {/* Basic Transaction Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Loại giao dịch</label>
                  <div className="mt-1">{getStatusBadge(selectedTransaction)}</div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Mô tả</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedTransaction.enhanced_description || selectedTransaction.description}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Số tiền</label>
                  <p
                    className={`mt-1 text-lg font-bold ${selectedTransaction.is_win ? "text-green-600" : "text-red-600"}`}
                  >
                    {selectedTransaction.is_win ? "+" : ""}
                    {selectedTransaction.formatted_amount}đ
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Số dư trước</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.formatted_balance_before}đ</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Số dư sau</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedTransaction.formatted_balance_after}đ</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Thời gian</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedTransaction.created_at)}</p>
                </div>
              </div>

              {/* Detailed Betting Information from API */}
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  <span className="ml-2 text-sm text-gray-600">Đang tải chi tiết cược...</span>
                </div>
              ) : bettingDetail ? (
                <div className="border-t pt-6 space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Hash className="w-5 h-5 mr-2" />
                    Chi tiết cược từ Database
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Phiên</label>
                      <p className="mt-1 text-sm text-gray-900 font-mono">#{bettingDetail.session_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Loại cược</label>
                      <p className="mt-1 text-sm text-gray-900">{getBetTypeDisplay(bettingDetail.bet_type)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Số điểm cược</label>
                      <p className="mt-1 text-sm text-gray-900">{bettingDetail.points} điểm</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Số tiền cược</label>
                      <p className="mt-1 text-sm text-gray-900">{formatCurrency(bettingDetail.bet_amount)}đ</p>
                    </div>
                  </div>

                  {/* Numbers bet on */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block flex items-center">
                      <Hash className="w-4 h-4 mr-1" />
                      Số đã cược ({bettingDetail.numbers.length} số)
                    </label>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex flex-wrap gap-2">
                        {bettingDetail.numbers.map((number: string, index: number) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className={`px-3 py-2 text-sm font-mono ${
                              bettingDetail.player_winning_numbers &&
                              bettingDetail.player_winning_numbers.includes(number)
                                ? "bg-green-100 text-green-800 border-green-300"
                                : "bg-white text-gray-700 border-gray-300"
                            }`}
                          >
                            {number}
                            {bettingDetail.hit_count && bettingDetail.hit_count[number] && (
                              <span className="ml-1 text-xs">({bettingDetail.hit_count[number]} lần)</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        <span className="inline-flex items-center">
                          <div className="w-2 h-2 bg-green-100 border border-green-300 rounded mr-1"></div>
                          Số bạn đã trúng
                        </span>
                        <span className="inline-flex items-center ml-4">
                          <div className="w-2 h-2 bg-white border border-gray-300 rounded mr-1"></div>
                          Số không trúng
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Player's Winning Numbers (for win transactions) */}
                  {selectedTransaction.is_win &&
                    bettingDetail.player_winning_numbers &&
                    bettingDetail.player_winning_numbers.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                          <Trophy className="w-4 h-4 mr-2" />
                          Số bạn đã trúng thưởng
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-green-700 block mb-2">
                              Số trúng giải ({bettingDetail.player_winning_numbers.length} số)
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {bettingDetail.player_winning_numbers.map((number: string) => (
                                <Badge key={number} className="bg-green-100 text-green-800 px-3 py-1 text-sm font-mono">
                                  {number} ({bettingDetail.hit_count[number]} lần)
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-green-700">Loại cược</label>
                              <p className="text-sm font-bold text-green-900">
                                {getBetTypeDisplay(bettingDetail.bet_type)}
                              </p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-green-700">Tổng lần trúng</label>
                              <p className="text-sm font-bold text-green-900">{bettingDetail.total_hits} lần</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-green-700">Điểm/số</label>
                              <p className="text-sm font-bold text-green-900">{bettingDetail.points} điểm</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-green-700">Tiền thắng thực tế</label>
                              <p className="text-sm font-bold text-green-900">
                                {bettingDetail.actual_win ? formatCurrency(bettingDetail.actual_win) : 0}đ
                              </p>
                            </div>
                          </div>

                          {bettingDetail.actual_win && (
                            <div className="pt-3 border-t border-green-200">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-green-700">Tổng tiền thắng:</span>
                                <span className="text-xl font-bold text-green-600">
                                  +{formatCurrency(bettingDetail.actual_win)}đ
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  {/* All Winning Numbers from the session */}
                  {bettingDetail.winning_numbers && bettingDetail.winning_numbers.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-3 block">
                        Kết quả phiên ({bettingDetail.winning_numbers.length} số)
                      </label>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex flex-wrap gap-1">
                          {bettingDetail.winning_numbers.map((number, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className={`px-2 py-1 text-xs font-mono ${
                                bettingDetail.numbers.includes(number)
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {number}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="inline-flex items-center">
                            <div className="w-2 h-2 bg-green-100 border border-green-200 rounded mr-1"></div>
                            Số bạn đã cược
                          </span>
                          <span className="inline-flex items-center ml-4">
                            <div className="w-2 h-2 bg-gray-100 border border-gray-200 rounded mr-1"></div>
                            Số khác
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Session Information */}
                  {bettingDetail.session_info && (
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold text-purple-900 mb-3 flex items-center">
                        <Star className="w-4 h-4 mr-2" />
                        Thông tin phiên
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="text-xs font-medium text-purple-700">Trạng thái</label>
                          <p className="font-bold text-purple-900">{bettingDetail.session_info.status}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-purple-700">Thời gian bắt đầu</label>
                          <p className="font-bold text-purple-900">
                            {formatDate(bettingDetail.session_info.start_time)}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-purple-700">Thời gian kết thúc</label>
                          <p className="font-bold text-purple-900">{formatDate(bettingDetail.session_info.end_time)}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-purple-700">Thời gian xử lý</label>
                          <p className="font-bold text-purple-900">
                            {bettingDetail.processed_at ? formatDate(bettingDetail.processed_at) : "Chưa xử lý"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : selectedTransaction.game_bet_id ? (
                <div className="border-t pt-6">
                  <p className="text-sm text-gray-500 text-center py-4">
                    Không tìm thấy chi tiết cược cho giao dịch này.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
