"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Banknote, CheckCircle, AlertTriangle } from "lucide-react"
import { useAuth } from "@/app/components/AuthProvider"

export default function WithdrawalForm() {
  const { user, balance: authBalance, refreshBalance } = useAuth()
  const [amount, setAmount] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    const withdrawalAmount = Number.parseFloat(amount)
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      setError("Vui lòng nhập số tiền hợp lệ.")
      setIsSubmitting(false)
      return
    }
    if (withdrawalAmount < 50000) {
      // Minimum withdrawal amount
      setError("Số tiền rút tối thiểu là 50,000 VNĐ.")
      setIsSubmitting(false)
      return
    }
    if (!bankName || !accountNumber || !accountName) {
      setError("Vui lòng điền đầy đủ thông tin tài khoản ngân hàng.")
      setIsSubmitting(false)
      return
    }
    if (authBalance !== null && withdrawalAmount > authBalance) {
      setError("Số dư của bạn không đủ để thực hiện giao dịch này.")
      setIsSubmitting(false)
      return
    }

    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch("/api/withdrawals/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: withdrawalAmount,
          bank_name: bankName,
          account_number: accountNumber,
          account_name: accountName,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Tạo yêu cầu rút tiền thất bại.")
      }
      // Cập nhật thông báo thành công
      setSuccess(data.message || "Yêu cầu rút tiền đã được gửi thành công và số dư của bạn đã được trừ!")
      setAmount("")
      // Optionally clear bank details or save them for future use
      // setBankName("");
      // setAccountNumber("");
      // setAccountName("");
      refreshBalance() // Refresh user balance
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định khi rút tiền.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" /> Rút tiền (VNĐ)
        </CardTitle>
        <CardDescription>
          Yêu cầu rút tiền từ số dư của bạn về tài khoản ngân hàng cá nhân. Số dư hiện tại:{" "}
          {authBalance !== null ? (
            `${authBalance.toLocaleString("vi-VN")} VNĐ`
          ) : (
            <Loader2 className="w-4 h-4 animate-spin inline-block" />
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleWithdrawalRequest} className="space-y-4">
          <div>
            <Label htmlFor="withdrawalAmount">Số tiền cần rút (VNĐ)</Label>
            <Input
              id="withdrawalAmount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ví dụ: 100000 (tối thiểu 50,000 VNĐ)"
              min="50000"
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bankName">Tên ngân hàng</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ví dụ: Vietcombank"
                required
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">Số tài khoản</Label>
              <Input
                id="accountNumber"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Nhập số tài khoản của bạn"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="accountName">Tên chủ tài khoản</Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Tên chủ tài khoản (không dấu)"
              required
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={isSubmitting} className="w-full bg-[#229ED9] hover:bg-[#1a7db8]">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Banknote className="w-4 h-4 mr-2" />}
            Gửi yêu cầu rút tiền
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
