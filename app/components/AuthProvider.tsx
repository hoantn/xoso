"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import type { UserRole } from "@/lib/database"

export interface AuthUser {
  id: string
  username: string
  role: UserRole
  fullName: string | null
  balance: number
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  isAdmin: boolean
  userRole: UserRole | null
  balance: number | null
  signIn: (username: string, password: string) => Promise<{ error: any }>
  signUp: (username: string, password: string, fullName?: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshBalance: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = user?.role === "admin" || user?.role === "super_admin"
  const userRole = user?.role || null
  const balance = user?.balance ?? null

  const fetchAndSetUser = useCallback(async (token: string) => {
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await response.json()
      if (data.user) {
        // Đảm bảo balance luôn là số
        const userData = {
          ...data.user,
          balance:
            typeof data.user.balance === "number"
              ? data.user.balance
              : data.user.balance !== null && data.user.balance !== undefined
                ? Number(data.user.balance)
                : 0,
        }
        setUser(userData)
        console.log("✅ User restored/updated from token:", userData)
      } else {
        console.log("❌ Invalid token, removing")
        localStorage.removeItem("auth_token")
        setUser(null)
      }
    } catch (err) {
      console.log("❌ Token verification failed:", err)
      localStorage.removeItem("auth_token")
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("auth_token")
    if (token) {
      fetchAndSetUser(token).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fetchAndSetUser])

  const signIn = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        return { error: { message: data.error || "Đăng nhập thất bại" } }
      }
      localStorage.setItem("auth_token", data.token)

      // Đảm bảo balance luôn là số
      const userData = {
        ...data.user,
        balance:
          typeof data.user.balance === "number"
            ? data.user.balance
            : data.user.balance !== null && data.user.balance !== undefined
              ? Number(data.user.balance)
              : 0,
      }
      setUser(userData)
      console.log("✅ Login successful, user set:", userData)
      return { error: null }
    } catch (err) {
      console.error("💥 SignIn error:", err)
      return { error: { message: "Lỗi kết nối server" } }
    }
  }

  const signUp = async (username: string, password: string, fullName?: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, fullName }),
      })
      const data = await response.json()
      if (!response.ok) {
        return { error: { message: data.error || "Đăng ký thất bại" } }
      }
      localStorage.setItem("auth_token", data.token)

      // Đảm bảo balance luôn là số
      const userData = {
        ...data.user,
        balance:
          typeof data.user.balance === "number"
            ? data.user.balance
            : data.user.balance !== null && data.user.balance !== undefined
              ? Number(data.user.balance)
              : 0,
      }
      setUser(userData)
      console.log("✅ Registration successful, user set:", userData)
      return { error: null }
    } catch (err) {
      console.error("💥 SignUp error:", err)
      return { error: { message: "Lỗi kết nối server" } }
    }
  }

  const signOut = async () => {
    console.log("🚪 Signing out")
    localStorage.removeItem("auth_token")
    setUser(null)
  }

  const refreshBalance = useCallback(async () => {
    const token = localStorage.getItem("auth_token")
    if (token && user) {
      console.log("🔄 Refreshing balance for user:", user.username)
      await fetchAndSetUser(token)
    }
  }, [user, fetchAndSetUser])

  const value = {
    user,
    loading,
    isAdmin,
    userRole,
    balance,
    signIn,
    signUp,
    signOut,
    refreshBalance,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
