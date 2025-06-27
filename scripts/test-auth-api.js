// Test API endpoints để kiểm tra lỗi đăng ký/đăng nhập
console.log("🔍 Testing Auth API Endpoints...\n")

// Test 1: Kiểm tra API register
async function testRegisterAPI() {
  console.log("1. Testing Register API...")
  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "testuser_" + Date.now(),
        password: "testpass123",
        fullName: "Test User",
      }),
    })

    const data = await response.json()
    console.log("   Status:", response.status)
    console.log("   Response:", data)

    if (response.ok) {
      console.log("   ✅ Register API works")
      return data
    } else {
      console.log("   ❌ Register API failed:", data.error)
      return null
    }
  } catch (error) {
    console.log("   💥 Register API error:", error.message)
    return null
  }
}

// Test 2: Kiểm tra API login
async function testLoginAPI(username, password) {
  console.log("\n2. Testing Login API...")
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()
    console.log("   Status:", response.status)
    console.log("   Response:", data)

    if (response.ok) {
      console.log("   ✅ Login API works")
      return data
    } else {
      console.log("   ❌ Login API failed:", data.error)
      return null
    }
  } catch (error) {
    console.log("   💥 Login API error:", error.message)
    return null
  }
}

// Test 3: Kiểm tra API verify token
async function testVerifyAPI(token) {
  console.log("\n3. Testing Verify Token API...")
  try {
    const response = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })

    const data = await response.json()
    console.log("   Status:", response.status)
    console.log("   Response:", data)

    if (response.ok) {
      console.log("   ✅ Verify API works")
      return data
    } else {
      console.log("   ❌ Verify API failed:", data.error)
      return null
    }
  } catch (error) {
    console.log("   💥 Verify API error:", error.message)
    return null
  }
}

// Chạy tất cả tests
async function runAllTests() {
  console.log("🚀 Starting Auth System Tests...\n")

  // Test register
  const registerResult = await testRegisterAPI()

  if (registerResult && registerResult.user) {
    // Test login với user vừa tạo
    const loginResult = await testLoginAPI(registerResult.user.username, "testpass123")

    if (loginResult && loginResult.token) {
      // Test verify token
      await testVerifyAPI(loginResult.token)
    }
  } else {
    // Test login với admin account có sẵn
    console.log("\n📝 Testing with existing admin account...")
    await testLoginAPI("admin", "admin123")
  }

  console.log("\n✅ Auth system tests completed!")
}

// Chạy tests
runAllTests()
