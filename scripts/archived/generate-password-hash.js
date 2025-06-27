// Script để tạo password hash cho admin accounts
import bcrypt from "bcryptjs"

async function generatePasswordHash() {
  const password = "admin123456"

  console.log("Generating password hash for:", password)

  const hash = await bcrypt.hash(password, 10)

  console.log("Password hash:", hash)
  console.log("\nCopy this hash to use in ADMIN_ACCOUNTS array in lib/auth.ts")

  // Test verification
  const isValid = await bcrypt.compare(password, hash)
  console.log("Verification test:", isValid ? "✅ PASS" : "❌ FAIL")
}

generatePasswordHash()
