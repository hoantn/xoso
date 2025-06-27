import { NextResponse } from "next/server"
import { AuthService } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

async function getCurrentUser(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    return AuthService.verifySessionToken(token)
  }
  return null
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request)
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 })
  }

  try {
    const { userId, amount, description, type = "test_transaction" } = await request.json()

    if (!userId || !amount || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user info
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("balance, username")
      .eq("id", userId)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const currentBalance = Number(userData.balance) || 0
    const transactionAmount = Number(amount)
    const newBalance = currentBalance + transactionAmount

    console.log("Creating test transaction:", {
      userId,
      amount: transactionAmount,
      currentBalance,
      newBalance,
      description,
    })

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: type,
        amount: transactionAmount,
        balance_before: currentBalance,
        balance_after: newBalance,
        description: description,
        status: "completed",
        created_by: user.id,
        metadata: {
          test: true,
          created_by_username: user.username,
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single()

    if (transactionError) {
      console.error("Error creating transaction:", transactionError)
      return NextResponse.json(
        {
          error: "Failed to create transaction",
          details: transactionError,
        },
        { status: 500 },
      )
    }

    // Update user balance
    const { error: updateError } = await supabase.from("users").update({ balance: newBalance }).eq("id", userId)

    if (updateError) {
      console.error("Error updating balance:", updateError)
      // Try to rollback transaction
      await supabase.from("transactions").update({ status: "failed" }).eq("id", transaction.id)

      return NextResponse.json(
        {
          error: "Failed to update balance",
          details: updateError,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: "Test transaction created successfully",
      transaction,
      old_balance: currentBalance,
      new_balance: newBalance,
    })
  } catch (error) {
    console.error("Test transaction error:", error)
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
