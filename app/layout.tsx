import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { RealtimeNotificationProvider } from "../components/RealtimeNotificationProvider"
import { AuthProvider } from "./components/AuthProvider" // Assuming AuthProvider exists
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Telegram Proxy Manager",
  description: "Quản lý proxy Telegram với giao diện đơn giản",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <RealtimeNotificationProvider>{children}</RealtimeNotificationProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
