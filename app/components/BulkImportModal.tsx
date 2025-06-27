"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, Clipboard, AlertCircle, CheckCircle, Key, Globe, TextIcon as Telegram } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { ProxyInsert } from "../types/proxy"

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (proxies: Omit<ProxyInsert, "user_id">[]) => void
}

interface ParsedProxy {
  server: string
  port: number
  username: string
  password: string
  description: string
  type: "http" | "socks5" | "mtproto"
  is_active: boolean
  visibility: "public" | "private" // Thêm visibility
  max_users: number // Thêm max_users
  isValid: boolean
  error?: string
}

export default function BulkImportModal({ isOpen, onClose, onImport }: BulkImportModalProps) {
  const [textInput, setTextInput] = useState("")
  const [parsedProxies, setParsedProxies] = useState<ParsedProxy[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [defaultType, setDefaultType] = useState<"http" | "socks5" | "mtproto">("http") // Default type
  const [defaultMaxUsers, setDefaultMaxUsers] = useState("1") // Default max_users
  const [defaultVisibility, setDefaultVisibility] = useState<"public" | "private">("public") // Default visibility

  const parseTextInput = (text: string): ParsedProxy[] => {
    const lines = text
      .trim()
      .split("\n")
      .filter((line) => line.trim())

    return lines.map((line, index) => {
      try {
        // Support multiple formats:
        // 1. server:port:username:password:description (HTTP/SOCKS)
        // 2. server:port:secret:password:description (MTProto)
        // 3. server:port:username:password (auto description)
        // NEW: server:port:username:password:description:type:max_users:visibility

        let parts: string[]

        if (line.includes(",")) {
          parts = line.split(",").map((p) => p.trim())
        } else if (line.includes(":")) {
          parts = line.split(":").map((p) => p.trim())
        } else {
          throw new Error("Format không hợp lệ")
        }

        if (parts.length < 4) {
          throw new Error("Thiếu thông tin (cần ít nhất server:port:username:password)")
        }

        const [server, portStr, username, password, descriptionPart, typePart, maxUsersPart, visibilityPart] = parts
        const port = Number.parseInt(portStr)

        // Validate server (IP or domain)
        if (!server) {
          throw new Error("Server không được để trống")
        }

        const isValidIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(server)
        const isValidDomain =
          /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(server)

        if (!isValidIP && !isValidDomain) {
          throw new Error("Server phải là IP hoặc domain hợp lệ")
        }

        if (isNaN(port) || port < 1 || port > 65535) {
          throw new Error("Port không hợp lệ")
        }

        if (!username) {
          throw new Error("Username/Secret không được để trống")
        }

        if (!password) {
          throw new Error("Password không được để trống")
        }

        // Determine proxy type based on username/secret length and format, or from input
        let type: "http" | "socks5" | "mtproto" = defaultType // Use default if not provided in line
        if (typePart && ["http", "socks5", "mtproto"].includes(typePart.toLowerCase())) {
          type = typePart.toLowerCase() as "http" | "socks5" | "mtproto"
        } else if (username.length >= 32 && /^[a-fA-F0-9]+$/.test(username)) {
          type = "mtproto"
        } else if (username.includes("session") || server.includes("proxy")) {
          type = "http"
        } else {
          type = "socks5"
        }

        // Additional validation for MTProto
        if (type === "mtproto" && username.length < 32) {
          throw new Error("Secret MTProto phải có ít nhất 32 ký tự")
        }

        const description = descriptionPart || `Proxy ${index + 1}`
        const maxUsers = maxUsersPart ? Number.parseInt(maxUsersPart) : Number.parseInt(defaultMaxUsers) // Use default if not provided
        const visibility =
          visibilityPart && ["public", "private"].includes(visibilityPart.toLowerCase())
            ? (visibilityPart.toLowerCase() as "public" | "private")
            : defaultVisibility // Use default if not provided

        if (isNaN(maxUsers) || maxUsers < 1) {
          throw new Error("Số người dùng tối đa không hợp lệ")
        }

        return {
          server,
          port,
          username,
          password,
          description,
          type,
          is_active: true,
          visibility,
          max_users: maxUsers,
          isValid: true,
        }
      } catch (error) {
        return {
          server: "",
          port: 0,
          username: "",
          password: "",
          description: "",
          type: "http" as const,
          is_active: false,
          visibility: "public" as const,
          max_users: 1,
          isValid: false,
          error: error instanceof Error ? error.message : "Lỗi không xác định",
        }
      }
    })
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string

      try {
        if (file.name.endsWith(".json")) {
          // Parse JSON
          const jsonData = JSON.parse(content)
          if (Array.isArray(jsonData)) {
            const jsonText = jsonData
              .map((item) => {
                const parts = [
                  item.server,
                  item.port,
                  item.username,
                  item.password,
                  item.description,
                  item.type,
                  item.max_users,
                  item.visibility,
                ]
                return parts.filter(Boolean).join(",") // Filter out undefined/null parts
              })
              .join("\n")
            setTextInput(jsonText)
          }
        } else {
          // Parse as text/CSV
          setTextInput(content)
        }
      } catch (error) {
        alert("Lỗi đọc file: " + (error instanceof Error ? error.message : "Unknown error"))
      }
    }
    reader.readAsText(file)
  }

  const handlePreview = () => {
    if (!textInput.trim()) return

    const parsed = parseTextInput(textInput)
    setParsedProxies(parsed)
    setShowPreview(true)
  }

  const handleImport = () => {
    const validProxies = parsedProxies.filter((p) => p.isValid)
    if (validProxies.length === 0) {
      alert("Không có proxy hợp lệ nào để import!")
      return
    }

    onImport(
      validProxies.map((p) => ({
        server: p.server,
        port: p.port,
        username: p.username,
        password: p.password,
        description: p.description,
        type: p.type,
        is_active: p.is_active,
        visibility: p.visibility,
        max_users: p.max_users,
      })),
    )

    // Reset
    setTextInput("")
    setParsedProxies([])
    setShowPreview(false)
  }

  const handleClose = () => {
    setTextInput("")
    setParsedProxies([])
    setShowPreview(false)
    onClose()
  }

  const validCount = parsedProxies.filter((p) => p.isValid).length
  const invalidCount = parsedProxies.length - validCount

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "mtproto":
        return <Telegram className="w-3 h-3 text-blue-600" />
      case "http":
        return <Globe className="w-3 h-3 text-green-600" />
      case "socks5":
        return <Key className="w-3 h-3 text-purple-600" />
      default:
        return <Globe className="w-3 h-3 text-gray-600" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Proxy Hàng Loạt
          </DialogTitle>
        </DialogHeader>

        {!showPreview ? (
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <Clipboard className="w-4 h-4" />
                Dán Text
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Upload File
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="textInput">Dán danh sách proxy:</Label>
                <Textarea
                  id="textInput"
                  placeholder={`Nhập proxy theo format:
server:port:username:password:description:type:max_users:visibility

Ví dụ:
dc.us-pr.plainproxies.com:1338:duongvanquaaiKrM-session-iwyw27i1-ttl-864000:Qu0Z3sBQoRkBqGO:US Proxy:mtproto:5:private
proxy.example.com:8080:user123:pass456:EU Proxy:http:10:public`}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="file" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fileInput">Chọn file (TXT, CSV, JSON):</Label>
                  <input
                    id="fileInput"
                    type="file"
                    accept=".txt,.csv,.json"
                    onChange={handleFileUpload}
                    className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Format hỗ trợ:</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <strong>TXT/CSV:</strong> server,port,username,password,description,type,max\_users,visibility
                      </div>
                      <div>
                        <strong>JSON:</strong> Array of objects với các field: server, port, username, password,
                        description, type, max\_users, visibility
                      </div>
                      <div className="text-xs text-blue-600">
                        <Globe className="w-3 h-3 inline mr-1" />
                        Hỗ trợ cả IP và domain name
                      </div>
                      <div className="text-xs text-green-600">
                        <Key className="w-3 h-3 inline mr-1" />
                        Tự động phát hiện loại proxy (HTTP/SOCKS5/MTProto) nếu không chỉ định
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {textInput && (
                  <div className="space-y-2">
                    <Label>Nội dung file:</Label>
                    <Textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Default settings for imported proxies */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t mt-4">
              <div className="space-y-2">
                <Label htmlFor="defaultType">Loại Proxy Mặc định</Label>
                <Select value={defaultType} onValueChange={(value) => setDefaultType(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại proxy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="http">HTTP Proxy</SelectItem>
                    <SelectItem value="socks5">SOCKS5 Proxy</SelectItem>
                    <SelectItem value="mtproto">MTProto (Telegram)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultMaxUsers">Số người dùng tối đa Mặc định</Label>
                <Input
                  id="defaultMaxUsers"
                  type="number"
                  placeholder="1"
                  value={defaultMaxUsers}
                  onChange={(e) => setDefaultMaxUsers(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultVisibility">Phân loại Mặc định</Label>
                <Select value={defaultVisibility} onValueChange={(value) => setDefaultVisibility(value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phân loại proxy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Công khai (Miễn phí)</SelectItem>
                    <SelectItem value="private">Private (Để bán)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handlePreview} disabled={!textInput.trim()} className="bg-[#229ED9] hover:bg-[#1a7db8]">
                Xem trước
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Hủy
              </Button>
            </div>
          </Tabs>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex gap-4">
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                {validCount} hợp lệ
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {invalidCount} lỗi
                </Badge>
              )}
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Server</th>
                      <th className="px-3 py-2 text-left">Port</th>
                      <th className="px-3 py-2 text-left">Username</th>
                      <th className="px-3 py-2 text-left">Password</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-left">Max Users</th>
                      <th className="px-3 py-2 text-left">Visibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedProxies.map((proxy, index) => (
                      <tr key={index} className={`border-t ${proxy.isValid ? "bg-green-50" : "bg-red-50"}`}>
                        <td className="px-3 py-2">
                          {proxy.isValid ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="text-xs text-red-600">{proxy.error}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {getTypeIcon(proxy.type)}
                            <span className="text-xs">{proxy.type.toUpperCase()}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{proxy.server || "-"}</td>
                        <td className="px-3 py-2 font-mono">{proxy.port || "-"}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {proxy.username ? `${proxy.username.substring(0, 15)}...` : "-"}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {proxy.password ? "•".repeat(Math.min(proxy.password.length, 8)) : "-"}
                        </td>
                        <td className="px-3 py-2">{proxy.description || "-"}</td>
                        <td className="px-3 py-2">{proxy.max_users || "-"}</td>
                        <td className="px-3 py-2">{proxy.visibility || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleImport} disabled={validCount === 0} className="bg-[#229ED9] hover:bg-[#1a7db8]">
                Import {validCount} Proxy
              </Button>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Quay lại
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Hủy
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
