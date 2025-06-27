// Script để tạo password hash cho admin accounts
const bcrypt = require("bcryptjs")

async function hashPasswords() {
  const password = "admin123456"
  const saltRounds = 10

  console.log("Hashing password:", password)

  const hash = await bcrypt.hash(password, saltRounds)

  console.log("Password hash:", hash)
  console.log("\nSQL để update admin accounts:")
  console.log(`UPDATE users SET password_hash = '${hash}' WHERE username IN ('admin', 'superadmin');`)

  // Test verification
  const isValid = await bcrypt.compare(password, hash)
  console.log("Verification test:", isValid ? "✅ PASS" : "❌ FAIL")
}

hashPasswords().catch(console.error)
