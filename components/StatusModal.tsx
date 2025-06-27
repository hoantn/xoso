"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatusModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type: "success" | "error" | "info"
  details?: {
    label: string
    value: string | number
  }[]
}

export function StatusModal({ isOpen, onClose, title, message, type, details }: StatusModalProps) {
  const Icon = type === "success" ? CheckCircle : type === "error" ? XCircle : Info
  const iconColorClass = type === "success" ? "text-green-500" : type === "error" ? "text-red-500" : "text-blue-500"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-sm sm:max-w-sm rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-300 ease-out">
        <DialogHeader className="flex flex-col items-center text-center pt-4">
          <Icon className={cn("w-16 h-16 mb-4", iconColorClass)} />
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">{message}</DialogDescription>
        </DialogHeader>
        {details && details.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">Thông tin chi tiết:</h3>
            {details.map((item, index) => (
              <div key={index} className="flex justify-between text-sm text-gray-700 py-1 border-b last:border-b-0">
                <span className="font-medium">{item.label}:</span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        )}
        <DialogFooter className="pt-4">
          <Button onClick={onClose} className="w-full">
            Đã hiểu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
