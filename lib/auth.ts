import bcrypt from "bcryptjs"
import { supabase } from "./supabase"

/* -------------------------------------------------------------------------- */
/*                             Type declarations                              */
/* -------------------------------------------------------------------------- */

export type UserRole = "user" | "admin" | "super_admin"

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  fullName: string | null
  balance?: number
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

/* -------------------------------------------------------------------------- */
/*                                AuthService                                 */
/* -------------------------------------------------------------------------- */

export class AuthService {
  /* ------------------------------ hash / verify --------------------------- */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10
    return bcrypt.hash(password, saltRounds)
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /* -------------------------------- register ----------------------------- */
  static async register(data: RegisterData): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const { username, password, fullName } = data

      if (!username || username.length < 3) return { error: "Username phải có ít nhất 3 ký tự" }
      if (!password || password.length < 6) return { error: "Mật khẩu phải có ít nhất 6 ký tự" }

      /* check duplicates --------------------------------------------------- */
      const { data: duplicate } = await supabase.from("users").select("id").eq("username", username).single()

      if (duplicate) return { error: "Username đã tồn tại" }

      /* create user -------------------------------------------------------- */
      const passwordHash = await this.hashPassword(password)

      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          username,
          password_hash: passwordHash,
          full_name: fullName || null,
          role: "user",
          is_active: true,
          balance: 0,
        })
        .select()
        .single()

      if (insertError) {
        console.error("Insert user error:", insertError)
        return { error: "Lỗi tạo tài khoản" }
      }

      return {
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role as UserRole,
          fullName: newUser.full_name,
          balance: Number(newUser.balance) || 0,
        },
      }
    } catch (err) {
      console.error("Register error:", err)
      return { error: "Lỗi hệ thống khi đăng ký" }
    }
  }

  /* ---------------------------------- login ------------------------------ */
  static async login(data: LoginData): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const { username, password } = data
      if (!username || !password) return { error: "Username và mật khẩu là bắt buộc" }

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("is_active", true)
        .single()

      if (!user) return { error: "Username hoặc mật khẩu không đúng" }

      const isValid = await this.verifyPassword(password, user.password_hash)
      if (!isValid) return { error: "Username hoặc mật khẩu không đúng" }

      return {
        user: {
          id: user.id,
          username: user.username,
          role: user.role as UserRole,
          fullName: user.full_name,
          balance: Number(user.balance) || 0,
        },
      }
    } catch (err) {
      console.error("Login error:", err)
      return { error: "Lỗi hệ thống khi đăng nhập" }
    }
  }

  /* ---------------------------- token helpers ---------------------------- */
  static createSessionToken(user: AuthUser): string {
    const payload = {
      ...user,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    }
    return Buffer.from(JSON.stringify(payload)).toString("base64")
  }

  static verifySessionToken(token: string): AuthUser | null {
    try {
      const payload: AuthUser & { exp: number } = JSON.parse(Buffer.from(token, "base64").toString())
      if (payload.exp < Date.now()) return null
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { exp, ...user } = payload
      return user
    } catch {
      return null
    }
  }

  /* ----------------------------- fetch by ID ----------------------------- */
  static async getUserById(id: string): Promise<{ user?: AuthUser; error?: string }> {
    try {
      const { data: user, error } = await supabase.from("users").select("*").eq("id", id).eq("is_active", true).single()

      if (error || !user) return { error: "Không tìm thấy user" }

      return {
        user: {
          id: user.id,
          username: user.username,
          role: user.role as UserRole,
          fullName: user.full_name,
          balance: Number(user.balance) || 0,
        },
      }
    } catch (err) {
      console.error("getUserById error:", err)
      return { error: "Lỗi hệ thống" }
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                         Helpers used by route handlers                      */
/* -------------------------------------------------------------------------- */

export async function getAuth(request: Request): Promise<{ user?: AuthUser; error?: string }> {
  try {
    const authHeader = request.headers.get("authorization")
    let token: string | null = null

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7)
    } else {
      const cookieHeader = request.headers.get("cookie") || ""
      const match = cookieHeader.split(";").find((c) => c.trim().startsWith("auth_token="))
      if (match) token = match.split("=")[1]
    }

    if (!token) return { error: "No authentication token provided" }

    const user = AuthService.verifySessionToken(token)
    if (!user) return { error: "Invalid or expired token" }

    const { user: freshUser, error } = await AuthService.getUserById(user.id)
    return error ? { error } : { user: freshUser }
  } catch (err) {
    console.error("getAuth error:", err)
    return { error: "Authentication error" }
  }
}

/* ------------------------------- utilities -------------------------------- */

export function verifyAdminToken(token: string): AuthUser | null {
  const user = AuthService.verifySessionToken(token)
  return user && (user.role === "admin" || user.role === "super_admin") ? user : null
}

/* Placeholder to satisfy any stray NextAuth imports ----------------------- */
export const authOptions = {}
