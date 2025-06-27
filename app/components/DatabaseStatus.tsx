"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Database, Wifi, WifiOff } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function DatabaseStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from("proxies").select("count").limit(1)
        setIsConnected(!error)
      } catch (err) {
        setIsConnected(false)
      } finally {
        setLoading(false)
      }
    }

    checkConnection()

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Badge variant="outline" className="animate-pulse">
        <Database className="w-3 h-3 mr-1" />
        Checking...
      </Badge>
    )
  }

  return (
    <Badge className={isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3 mr-1" />
          Database Online
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3 mr-1" />
          Database Offline
        </>
      )}
    </Badge>
  )
}
