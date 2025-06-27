import { type NextRequest, NextResponse } from "next/server" // Import NextRequest
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth" // Assuming admin check is needed

async function isAdminUser(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const user = await AuthService.verifySessionToken(token)
    return user?.role === "admin" || user?.role === "super_admin"
  }
  return false
}

// GET: List all bank accounts with pagination
export async function GET(request: NextRequest) {
  // Change to NextRequest
  if (!(await isAdminUser(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10") // Default limit to 10

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await supabase
      .from("bank_accounts")
      .select("*", { count: "exact" }) // Lấy tổng số lượng
      .order("created_at", { ascending: false })
      .range(from, to) // Áp dụng phân trang

    if (error) {
      console.error("Error fetching bank accounts:", error)
      return NextResponse.json({ error: "Failed to fetch bank accounts: " + error.message }, { status: 500 })
    }
    return NextResponse.json({
      success: true,
      data: data, // Đổi `data` thành `data` để nhất quán
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (e) {
    console.error("GET /api/admin/bank-accounts error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// POST: Add a new bank account
export async function POST(request: Request) {
  if (!(await isAdminUser(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    // Sử dụng account_name
    const { bank_id, bank_name, account_number, account_name, qr_template = "compact2", is_active = false } = body

    if (!bank_id || !bank_name || !account_number || !account_name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // If this account is being set as active, deactivate all others
    if (is_active) {
      const { error: updateError } = await supabase
        .from("bank_accounts")
        .update({ is_active: false })
        .eq("is_active", true)
      if (updateError) {
        console.error("Error deactivating other bank accounts:", updateError)
        // Continue, but log the error. The new insert will proceed.
      }
    }

    const { data, error: insertError } = await supabase
      .from("bank_accounts")
      .insert({
        bank_id,
        bank_name,
        account_number,
        account_name, // Sử dụng account_name
        qr_template,
        is_active,
      })
      .select()
      .single()

    if (insertError) {
      console.error("Error inserting bank account:", insertError)
      if (insertError.code === "23505") {
        // unique_violation for account_number
        return NextResponse.json({ error: "Số tài khoản đã tồn tại." }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to add bank account: " + insertError.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error("POST /api/admin/bank-accounts error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
