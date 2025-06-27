// Script để tạo tài khoản admin mới
// Chạy script này với Node.js để tạo tài khoản admin

import fetch from "node-fetch"

async function createAdminAccount() {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-supabase-url.supabase.co"

    console.log("Creating admin account...")

    const response = await fetch(`${SUPABASE_URL}/api/auth/create-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "admin@test.com",
        password: "admin123456",
        secretKey: "super-secret-admin-key", // Thay thế bằng ADMIN_SECRET_KEY trong production
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Failed to create admin account")
    }

    console.log("Admin account created successfully!")
    console.log("User ID:", data.userId)
    console.log("Email: admin@test.com")
    console.log("Password: admin123456")
  } catch (error) {
    console.error("Error creating admin account:", error)
  }
}

createAdminAccount()
