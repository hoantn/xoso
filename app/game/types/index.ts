export interface BetType {
  id: string
  name: string
  description: string
  category: string
  multiplier: number
  min_bet: number
  calculation_method: "point" | "money"
  point_value?: number
  bet_unit?: string
}

export interface BetCategory {
  id: string
  name: string
  description: string
  color?: string
}

export interface LotterySession {
  id: string
  date: string
  status: "open" | "drawing" | "completed"
  countdown_seconds: number
  results_data?: LotteryResultData
}

export interface GameSession {
  id: string
  game_type: string
  session_number: number
  status: "open" | "drawing" | "completed"
  countdown_seconds: number
  start_time: string
  end_time: string
  draw_time: string
  winning_numbers?: string[]
  results_data?: LotteryResultData
  created_at: string
}

export interface GameResult {
  id: string
  game_type: string
  session_number: number
  status: string
  winning_numbers: string[]
  results_data: LotteryResultData
  draw_time: string
  created_at: string
}

export interface LotteryResultData {
  issue?: string
  opendate?: string
  special_prize: string
  first_prize: string
  second_prize: string[]
  third_prize: string[]
  fourth_prize: string[]
  fifth_prize: string[]
  sixth_prize: string[]
  seventh_prize: string[]
  session_type?: string
  bonus_info?: {
    is_bonus: boolean
    multiplier: number
    description: string
  }
}

export interface GameBet {
  id: string
  user_id: string
  session_id: string
  bet_type: string
  numbers: string[]
  amount: number
  potential_win: number
  status: "pending" | "won" | "lost"
  created_at: string
}
