import { supabase } from "./supabase"
import bcrypt from "bcryptjs"

export type UserRole = "user" | "admin" | "super_admin"

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  fullName: string | null
  balance?: number // Thêm balance vào interface
}

export interface RegisterData {
  username: string
  password: string
  fullName?: string
}

export interface LoginData {
  username: string
  password: string
}

export class AuthService {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10
    return await bcrypt.hash(password, saltRounds)
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }

  // Register new user
  static async register(data: RegisterData): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const { username, password, fullName } = data

      // Validate input
      if (!username || username.length < 3) {
        return { error: "Username phải có ít nhất 3 ký tự" }
      }

      if (!password || password.length < 6) {
        return { error: "Mật khẩu phải có ít nhất 6 ký tự" }
      }

      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 = no rows returned (which is what we want)
        console.error("Error checking existing user:", checkError)
        return { error: "Lỗi kiểm tra username" }
      }

      if (existingUser) {
        return { error: "Username đã tồn tại" }
      }

      // Hash password
      const passwordHash = await this.hashPassword(password)

      // Create user
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          username,
          password_hash: passwordHash,
          full_name: fullName || null,
          role: "user",
          is_active: true,
          balance: 0, // Đảm bảo người dùng mới có balance = 0
        })
        .select()
        .single()

      if (insertError) {
        console.error("Error creating user:", insertError)
        return { error: "Lỗi tạo tài khoản" }
      }

      // Return user data
      const user: AuthUser = {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role as UserRole,
        fullName: newUser.full_name,
        balance: newUser.balance ? Number(newUser.balance) : 0, // Đảm bảo balance là số
      }

      return { user }
    } catch (error) {
      console.error("Register error:", error)
      return { error: "Lỗi hệ thống khi đăng ký" }
    }
  }

  // Login user
  static async login(data: LoginData): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const { username, password } = data

      if (!username || !password) {
        return { error: "Username và mật khẩu là bắt buộc" }
      }

      // Find user by username
      const { data: user, error: findError } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("is_active", true)
        .single()

      if (findError || !user) {
        return { error: "Username hoặc mật khẩu không đúng" }
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password_hash)

      if (!isValidPassword) {
        return { error: "Username hoặc mật khẩu không đúng" }
      }

      // Return user data
      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        role: user.role as UserRole,
        fullName: user.full_name,
        balance: user.balance ? Number(user.balance) : 0, // Đảm bảo balance là số
      }

      return { user: authUser }
    } catch (error) {
      console.error("Login error:", error)
      return { error: "Lỗi hệ thống khi đăng nhập" }
    }
  }

  // Create session token
  static createSessionToken(user: AuthUser): string {
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      balance: user.balance || 0, // Đảm bảo balance được lưu trong token
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    }

    return Buffer.from(JSON.stringify(payload)).toString("base64")
  }

  // Verify session token
  static verifySessionToken(token: string): AuthUser | null {
    try {
      const payload = JSON.parse(Buffer.from(token, "base64").toString())

      if (payload.exp < Date.now()) {
        return null // Token expired
      }

      return {
        id: payload.id,
        username: payload.username,
        role: payload.role,
        fullName: payload.fullName,
        balance: typeof payload.balance === "number" ? payload.balance : 0, // Đảm bảo balance là số
      }
    } catch {
      return null
    }
  }

  // Get user by ID
  static async getUserById(id: string): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const { data: user, error } = await supabase.from("users").select("*").eq("id", id).eq("is_active", true).single()

      if (error || !user) {
        return { error: "Không tìm thấy user" }
      }

      const authUser: AuthUser = {
        id: user.id,
        username: user.username,
        role: user.role as UserRole,
        fullName: user.full_name,
        balance: user.balance ? Number(user.balance) : 0, // Đảm bảo balance là số
      }

      return { user: authUser }
    } catch (error) {
      console.error("Get user error:", error)
      return { error: "Lỗi hệ thống" }
    }
  }
}

// Get authenticated user from request
export async function getAuth(request: Request): Promise<{ user?: AuthUser; error?: string }> {
  try {
    // Get token from Authorization header or cookie
    const authHeader = request.headers.get("authorization")
    console.log("Auth header:", authHeader) // Add logging

    let token = null
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "")
    } else {
      // Fallback to cookie
      const cookieHeader = request.headers.get("cookie")
      if (cookieHeader) {
        const authCookie = cookieHeader.split(";").find((c) => c.trim().startsWith("auth_token="))
        if (authCookie) {
          token = authCookie.split("=")[1]
        }
      }
    }

    console.log("Extracted token:", token ? "Token found" : "No token") // Add logging

    if (!token) {
      return { error: "No authentication token provided" }
    }

    // Verify the session token
    const user = AuthService.verifySessionToken(token)

    if (!user) {
      return { error: "Invalid or expired token" }
    }

    // Get fresh user data from database to ensure balance is up to date
    const { user: freshUser, error } = await AuthService.getUserById(user.id)

    if (error || !freshUser) {
      return { error: error || "User not found" }
    }

    return { user: freshUser }
  } catch (error) {
    console.error("getAuth error:", error)
    return { error: "Authentication error" }
  }
}

// Thêm export authOptions vào cuối file lib/auth.ts
// Đây là một placeholder để khắc phục lỗi triển khai.
// Dự án của bạn đang sử dụng AuthService tùy chỉnh cho xác thực, không phải NextAuth.js.
// Nếu bạn có ý định sử dụng NextAuth.js, bạn cần cấu hình nó đúng cách.
// Nếu không, bạn nên xóa bất kỳ import nào của 'authOptions' khỏi mã của mình.
export const authOptions = {} // Placeholder tối thiểu
