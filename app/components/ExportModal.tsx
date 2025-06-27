"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Copy, Check } from "lucide-react"
import type { Proxy } from "../types/proxy"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  proxies: Proxy[]
}

export default function ExportModal({ isOpen, onClose, proxies }: ExportModalProps) {
  const [copied, setCopied] = useState(false)
  const [format, setFormat] = useState<"csv" | "json" | "text">("csv")

  const generateCSV = () => {
    const header = "server,port,username,password,description,type"
    const rows = proxies.map(
      (p) => `${p.server},${p.port},"${p.username}","${p.password}","${p.description}",${p.type}`,
    )
    return [header, ...rows].join("\n")
  }

  const generateJSON = () => {
    return JSON.stringify(
      proxies.map((p) => ({
        server: p.server,
        port: p.port,
        username: p.username,
        password: p.password,
        description: p.description,
        type: p.type,
      })),
      null,
      2,
    )
  }

  const generateText = () => {
    return proxies.map((p) => `${p.server}:${p.port}:${p.username}:${p.password}:${p.description}`).join("\n")
  }

  const getExportData = () => {
    switch (format) {
      case "csv":
        return generateCSV()
      case "json":
        return generateJSON()
      case "text":
        return generateText()
      default:
        return ""
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getExportData())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleDownload = () => {
    const data = getExportData()
    const blob = new Blob([data], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `proxies.${format}`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Proxy ({proxies.length} proxy)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={format} onValueChange={(value) => setFormat(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="csv">CSV</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">CSV Format:</label>
              <Textarea value={generateCSV()} readOnly rows={10} className="font-mono text-xs" />
            </div>
          </TabsContent>

          <TabsContent value="json" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">JSON Format:</label>
              <Textarea value={generateJSON()} readOnly rows={10} className="font-mono text-xs" />
            </div>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Text Format (server:port:username:password:description):</label>
              <Textarea value={generateText()} readOnly rows={10} className="font-mono text-xs" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3">
          <Button onClick={handleCopy} variant="outline">
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Đã sao chép
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Sao chép
              </>
            )}
          </Button>
          <Button onClick={handleDownload} className="bg-[#229ED9] hover:bg-[#1a7db8]">
            <Download className="w-4 h-4 mr-2" />
            Tải file
          </Button>
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
