import { NextResponse, type NextRequest } from "next/server"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth"

async function isAdminUser(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    const user = await AuthService.verifySessionToken(token)
    return user?.role === "admin" || user?.role === "super_admin"
  }
  return false
}

interface RouteContext {
  params: {
    accountId: string
  }
}

// PUT: Update an existing bank account
export async function PUT(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdminUser(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { accountId } = params
  if (!accountId) {
    return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
  }

  try {
    const body = await request.json()
    // Sử dụng account_name
    const { bank_id, bank_name, account_number, account_name, qr_template, is_active } = body

    // Fields that can be updated
    const updateData: Partial<typeof body & { updated_at: string }> = {}
    if (bank_id !== undefined) updateData.bank_id = bank_id
    if (bank_name !== undefined) updateData.bank_name = bank_name
    if (account_number !== undefined) updateData.account_number = account_number
    // Cập nhật trường account_name
    if (account_name !== undefined) updateData.account_name = account_name
    if (qr_template !== undefined) updateData.qr_template = qr_template
    if (is_active !== undefined) updateData.is_active = is_active

    if (Object.keys(updateData).length === 0 && is_active === undefined) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // If this account is being set as active, deactivate all others
    if (is_active === true) {
      const { error: deactivateError } = await supabase
        .from("bank_accounts")
        .update({ is_active: false })
        .eq("is_active", true)
        .neq("id", accountId) // Don't deactivate the current one if it's already active and being updated
      if (deactivateError) {
        console.error("Error deactivating other bank accounts:", deactivateError)
        // Log and continue
      }
    }

    updateData.updated_at = new Date().toISOString()

    const { data, error: updateError } = await supabase
      .from("bank_accounts")
      .update(updateData)
      .eq("id", accountId)
      .select()
      .single()

    if (updateError) {
      console.error(`Error updating bank account ${accountId}:`, updateError)
      if (updateError.code === "23505") {
        // unique_violation for account_number
        return NextResponse.json({ error: "Số tài khoản đã tồn tại ở một tài khoản khác." }, { status: 409 })
      }
      return NextResponse.json({ error: "Failed to update bank account: " + updateError.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Bank account not found" }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error("PUT /api/admin/bank-accounts/[accountId] error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// DELETE: Delete a bank account
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  if (!(await isAdminUser(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { accountId } = params
  if (!accountId) {
    return NextResponse.json({ error: "Account ID is required" }, { status: 400 })
  }

  try {
    // Optional: Check if the account is active and prevent deletion or handle accordingly
    // For now, we allow deletion.
    const { error: deleteError } = await supabase.from("bank_accounts").delete().eq("id", accountId)

    if (deleteError) {
      console.error(`Error deleting bank account ${accountId}:`, deleteError)
      return NextResponse.json({ error: "Failed to delete bank account: " + deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ message: "Bank account deleted successfully" }, { status: 200 })
  } catch (e) {
    console.error("DELETE /api/admin/bank-accounts/[accountId] error:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
