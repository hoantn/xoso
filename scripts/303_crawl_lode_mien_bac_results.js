const { createClient } = require("@supabase/supabase-js")

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

console.log("Supabase URL:", supabaseUrl)
console.log("Service Role Key exists:", !!supabaseKey)

const supabase = createClient(supabaseUrl, supabaseKey)

async function crawlAndInitializeLodeMienBacResults() {
  const API_URL = "https://vip.manycai.com/K2685086065b921/hnc.json"

  console.log("Bắt đầu crawl dữ liệu xổ số miền Bắc...")

  try {
    // Use fetch directly (available in Node.js 18+)
    const response = await fetch(API_URL)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()

    console.log("Dữ liệu nhận được từ API:", data?.length ? `${data.length} kết quả` : "Không có dữ liệu")

    if (data && data.length > 0) {
      const latestResult = data[0] // Lấy kết quả gần nhất
      console.log("Kết quả gần nhất:", latestResult)

      const gameType = "lode_mien_bac"
      const sessionDate = latestResult.date // e.g., "2024-01-16"
      const sessionNumber = Number.parseInt(sessionDate.replace(/-/g, "")) // e.g., 20240116

      console.log("Session date:", sessionDate)
      console.log("Session number:", sessionNumber)

      // Define draw time for Lode Mien Bac (18:15 UTC+7)
      const drawTimeLocal = new Date(`${sessionDate}T18:15:00+07:00`)
      const drawTimeUTC = new Date(drawTimeLocal.getTime())

      const winningNumbers = [latestResult.special_prize.slice(-2)] // Lấy 2 số cuối của giải đặc biệt cho 'đề'

      const resultsData = {
        special_prize: latestResult.special_prize,
        first_prize: latestResult.first_prize,
        second_prize: latestResult.second_prize,
        third_prize: latestResult.third_prize,
        fourth_prize: latestResult.fourth_prize,
        fifth_prize: latestResult.fifth_prize,
        sixth_prize: latestResult.sixth_prize,
        seventh_prize: latestResult.seventh_prize,
      }

      console.log("Winning numbers:", winningNumbers)
      console.log("Results data:", resultsData)

      // Check if session already exists to avoid duplicates
      const { data: existingSession, error: fetchError } = await supabase
        .from("game_sessions")
        .select("id, results_data")
        .eq("game_type", gameType)
        .eq("session_number", sessionNumber)
        .single()

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 means no rows found
        console.error("Lỗi khi kiểm tra phiên game hiện có:", fetchError.message)
        return
      }

      if (existingSession) {
        console.log(`Phiên game ${gameType} số ${sessionNumber} đã tồn tại.`)
        // Update if results_data is null or incomplete
        if (!existingSession.results_data) {
          console.log("Cập nhật kết quả cho phiên đã tồn tại...")
          const { error: updateError } = await supabase
            .from("game_sessions")
            .update({
              winning_numbers: winningNumbers,
              results_data: resultsData,
              status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingSession.id)

          if (updateError) {
            console.error("Lỗi khi cập nhật kết quả phiên game:", updateError.message)
          } else {
            console.log(`✅ Đã cập nhật kết quả cho phiên game ${gameType} số ${sessionNumber}.`)
          }
        } else {
          console.log("Phiên game đã có kết quả đầy đủ.")
        }
        return
      }

      // Insert new session
      console.log("Chèn phiên game mới...")
      const { data: insertedData, error: insertError } = await supabase
        .from("game_sessions")
        .insert({
          game_type: gameType,
          session_number: sessionNumber,
          start_time: new Date(`${sessionDate}T00:00:00Z`).toISOString(),
          end_time: drawTimeUTC.toISOString(),
          draw_time: drawTimeUTC.toISOString(),
          status: "completed",
          winning_numbers: winningNumbers,
          results_data: resultsData,
        })
        .select()

      if (insertError) {
        console.error("Lỗi khi chèn dữ liệu vào game_sessions:", insertError.message)
        console.error("Chi tiết lỗi:", insertError)
      } else {
        console.log("✅ Đã chèn thành công kết quả xổ số miền Bắc gần nhất vào database:")
        console.log(JSON.stringify(insertedData, null, 2))
      }
    } else {
      console.log("❌ Không tìm thấy dữ liệu xổ số từ API.")
    }
  } catch (error) {
    console.error("❌ Lỗi trong quá trình crawl và khởi tạo dữ liệu:", error.message)
    console.error("Stack trace:", error.stack)
  }
}

// Run the function
crawlAndInitializeLodeMienBacResults()
