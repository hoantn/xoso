"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, XCircle, Clock, Edit3, Search, ChevronLeft, ChevronRight, Copy } from "lucide-react" // Import Copy icon
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast" // Import useToast

interface WithdrawalRequest {
  id: string
  user_id: string
  users: {
    username: string
    full_name: string | null
  }
  amount: number
  transaction_id: string
  status: "pending" | "completed" | "cancelled" | "failed"
  bank_account_details_snapshot: {
    bank_name: string
    account_number: string
    account_name: string
  }
  admin_notes: string | null
  created_at: string
  updated_at: string
}

interface WithdrawalRequestsTableProps {
  token: string
}

// Simple mapping for common Vietnamese banks to VietQR IDs
const VIETQR_BANK_MAP: { [key: string]: string } = {
  Vietcombank: "VCB",
  "Ngân hàng TMCP Ngoại thương Việt Nam": "VCB",
  Techcombank: "TCB",
  "Ngân hàng TMCP Kỹ thương Việt Nam": "TCB",
  MBBank: "MB",
  "Ngân hàng TMCP Quân đội": "MB",
  VPBank: "VPB",
  "Ngân hàng TMCP Việt Nam Thịnh Vượng": "VPB",
  ACB: "ACB",
  "Ngân hàng TMCP Á Châu": "ACB",
  BIDV: "BIDV",
  "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam": "BIDV",
  Agribank: "AGR",
  "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam": "AGR",
  Sacombank: "STB",
  "Ngân hàng TMCP Sài Gòn Thương Tín": "STB",
  VietinBank: "CTG",
  "Ngân hàng TMCP Công thương Việt Nam": "CTG",
  TPBank: "TPB",
  "Ngân hàng TMCP Tiên Phong": "TPB",
  VIB: "VIB",
  "Ngân hàng TMCP Quốc tế Việt Nam": "VIB",
  Eximbank: "EIB",
  "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam": "EIB",
  SHB: "SHB",
  "Ngân hàng TMCP Sài Gòn - Hà Nội": "SHB",
  OCB: "OCB",
  "Ngân hàng TMCP Phương Đông": "OCB",
  MSB: "MSB",
  "Ngân hàng TMCP Hàng Hải Việt Nam": "MSB",
  SeABank: "SSB",
  "Ngân hàng TMCP Đông Nam Á": "SSB",
  HDBank: "HDB",
  "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh": "HDB",
  LPBank: "LPB",
  "Ngân hàng TMCP Bưu điện Liên Việt": "LPB",
  PVcomBank: "PVC",
  "Ngân hàng TMCP Đại Chúng Việt Nam": "PVC",
  "Bac A Bank": "BAB",
  "Ngân hàng TMCP Bắc Á": "BAB",
  "Viet Capital Bank": "BVB",
  "Ngân hàng TMCP Bản Việt": "BVB",
  Kienlongbank: "KLB",
  "Ngân hàng TMCP Kiên Long": "KLB",
  NCB: "NVB",
  "Ngân hàng TMCP Quốc Dân": "NVB",
  GPBank: "GPB",
  "Ngân hàng TMCP Dầu khí Toàn cầu": "GPB",
  OceanBank: "OCB", // Note: OCB is also used for OceanBank, might need more specific mapping if conflict
  "Ngân hàng TMCP Đại Dương": "OCB",
  CBBank: "VNCB",
  "Ngân hàng TNHH MTV Xây dựng Việt Nam": "VNCB",
  VRB: "VRB",
  "Ngân hàng Liên doanh Việt - Nga": "VRB",
  UOB: "UOB",
  "Ngân hàng TNHH Một Thành Viên United Overseas Bank": "UOB",
  HSBC: "HSBC",
  "Ngân hàng TNHH Một Thành Viên HSBC Việt Nam": "HSBC",
  "Shinhan Bank": "SHBVN",
  "Ngân hàng TNHH Một Thành Viên Shinhan Việt Nam": "SHBVN",
  "Standard Chartered": "SCB", // Note: SCB is also used for Sacombank, might need more specific mapping if conflict
  "Ngân hàng TNHH Một Thành Viên Standard Chartered Bank (Việt Nam)": "SCB",
  "Woori Bank": "WVN",
  "Ngân hàng TNHH Một Thành Viên Woori Bank Việt Nam": "WVN",
  "Public Bank": "PBVN",
  "Ngân hàng TNHH Một Thành Viên Public Bank Việt Nam": "PBVN",
  "Indovina Bank": "IVB",
  "Ngân hàng TNHH Indovina": "IVB",
  "Hong Leong Bank": "HLBVN",
  "Ngân hàng TNHH Một Thành Viên Hong Leong Bank Việt Nam": "HLBVN",
  "DBS Bank": "DBS",
  "Ngân hàng TNHH Một Thành Viên DBS Bank Ltd.": "DBS",
  "CIMB Bank": "CIMB",
  "Ngân hàng TNHH Một Thành Viên CIMB Bank Berhad": "CIMB",
  "ANZ Bank": "ANZ",
  "Ngân hàng TNHH Một Thành Viên ANZ (Việt Nam)": "ANZ",
  CitiBank: "CITIBANK",
  "Ngân hàng TNHH Một Thành Viên Citibank N.A.": "CITIBANK",
  SMBC: "SMBC",
  "Ngân hàng TNHH Một Thành Viên Sumitomo Mitsui Banking Corporation": "SMBC",
  "Kookmin Bank": "KBANK",
  "Ngân hàng TNHH Một Thành Viên Kookmin Bank Việt Nam": "KBANK",
  "Industrial Bank of Korea": "IBK",
  "Ngân hàng TNHH Một Thành Viên Industrial Bank of Korea - Chi nhánh Hà Nội": "IBK",
  "Bank of China": "BOC",
  "Ngân hàng TNHH Một Thành Viên Bank of China - Chi nhánh TP.HCM": "BOC",
  "Bank of Communications": "BOCOM",
  "Ngân hàng TNHH Một Thành Viên Bank of Communications - Chi nhánh TP.HCM": "BOCOM",
  "Bank of Tokyo-Mitsubishi UFJ": "BTMU",
  "Ngân hàng TNHH Một Thành Viên Bank of Tokyo-Mitsubishi UFJ - Chi nhánh TP.HCM": "BTMU",
  "BNP Paribas": "BNP",
  "Ngân hàng TNHH Một Thành Viên BNP Paribas - Chi nhánh TP.HCM": "BNP",
  "Deutsche Bank": "DB",
  "Ngân hàng TNHH Một Thành Viên Deutsche Bank - Chi nhánh TP.HCM": "DB",
  "JPMorgan Chase Bank": "JPM",
  "Ngân hàng TNHH Một Thành Viên JPMorgan Chase Bank - Chi nhánh TP.HCM": "JPM",
  "Mizuho Bank": "MHC",
  "Ngân hàng TNHH Một Thành Viên Mizuho Bank - Chi nhánh TP.HCM": "MHC",
  "Sumitomo Mitsui Trust Bank": "SMTB",
  "Ngân hàng TNHH Một Thành Viên Sumitomo Mitsui Trust Bank - Chi nhánh TP.HCM": "SMTB",
  "Woori Bank": "WOORI",
  "Ngân hàng TNHH Một Thành Viên Woori Bank - Chi nhánh TP.HCM": "WOORI",
  "KEB Hana Bank": "KEBHN",
  "Ngân hàng TNHH Một Thành Viên KEB Hana Bank - Chi nhánh Hà Nội": "KEBHN",
  "Far East National Bank": "FENB",
  "Ngân hàng TNHH Một Thành Viên Far East National Bank - Chi nhánh TP.HCM": "FENB",
  "First Commercial Bank": "FCB",
  "Ngân hàng TNHH Một Thành Viên First Commercial Bank - Chi nhánh TP.HCM": "FCB",
  "E.SUN Commercial Bank": "ESUN",
  "Ngân hàng TNHH Một Thành Viên E.SUN Commercial Bank - Chi nhánh TP.HCM": "ESUN",
  "Mega International Commercial Bank": "MICB",
  "Ngân hàng TNHH Một Thành Viên Mega International Commercial Bank - Chi nhánh TP.HCM": "MICB",
  "Cathay United Bank": "CUB",
  "Ngân hàng TNHH Một Thành Viên Cathay United Bank - Chi nhánh TP.HCM": "CUB",
  "Dah Sing Bank": "DSB",
  "Ngân hàng TNHH Một Thành Viên Dah Sing Bank - Chi nhánh TP.HCM": "DSB",
  "Bank of Taiwan": "BOT",
  "Ngân hàng TNHH Một Thành Viên Bank of Taiwan - Chi nhánh TP.HCM": "BOT",
  "Land Bank of Taiwan": "LBT",
  "Ngân hàng TNHH Một Thành Viên Land Bank of Taiwan - Chi nhánh TP.HCM": "LBT",
  "Chang Hwa Commercial Bank": "CHCB",
  "Ngân hàng TNHH Một Thành Viên Chang Hwa Commercial Bank - Chi nhánh TP.HCM": "CHCB",
  "Hua Nan Commercial Bank": "HNCB",
  "Ngân hàng TNHH Một Thành Viên Hua Nan Commercial Bank - Chi nhánh TP.HCM": "HNCB",
  "Taiwan Cooperative Bank": "TCBC",
  "Ngân hàng TNHH Một Thành Viên Taiwan Cooperative Bank - Chi nhánh TP.HCM": "TCBC",
  "The Shanghai Commercial & Savings Bank": "SCSB",
  "Ngân hàng TNHH Một Thành Viên The Shanghai Commercial & Savings Bank - Chi nhánh TP.HCM": "SCSB",
  "CTBC Bank": "CTBC",
  "Ngân hàng TNHH Một Thành Viên CTBC Bank - Chi nhánh TP.HCM": "CTBC",
  "Fubon Bank": "FUBON",
  "Ngân hàng TNHH Một Thành Viên Fubon Bank - Chi nhánh TP.HCM": "FUBON",
  "Bank of India": "BOI",
  "Ngân hàng TNHH Một Thành Viên Bank of India - Chi nhánh TP.HCM": "BOI",
  "State Bank of India": "SBI",
  "Ngân hàng TNHH Một Thành Viên State Bank of India - Chi nhánh TP.HCM": "SBI",
  "Bank of Baroda": "BOB",
  "Ngân hàng TNHH Một Thành Viên Bank of Baroda - Chi nhánh TP.HCM": "BOB",
  "Bank of America": "BOFA",
  "Ngân hàng TNHH Một Thành Viên Bank of America - Chi nhánh TP.HCM": "BOFA",
  "BNP Paribas": "BNP",
  "Ngân hàng TNHH Một Thành Viên BNP Paribas - Chi nhánh TP.HCM": "BNP",
  "Credit Agricole Corporate and Investment Bank": "CACIB",
  "Ngân hàng TNHH Một Thành Viên Credit Agricole Corporate and Investment Bank - Chi nhánh TP.HCM": "CACIB",
  "Societe Generale": "SG",
  "Ngân hàng TNHH Một Thành Viên Societe Generale - Chi nhánh TP.HCM": "SG",
  "DBS Bank": "DBS",
  "Ngân hàng TNHH Một Thành Viên DBS Bank Ltd. - Chi nhánh TP.HCM": "DBS",
  "Oversea-Chinese Banking Corporation": "OCBC",
  "Ngân hàng TNHH Một Thành Viên Oversea-Chinese Banking Corporation - Chi nhánh TP.HCM": "OCBC",
  "United Overseas Bank": "UOB",
  "Ngân hàng TNHH Một Thành Viên United Overseas Bank - Chi nhánh TP.HCM": "UOB",
  Maybank: "MAYBANK",
  "Ngân hàng TNHH Một Thành Viên Maybank - Chi nhánh TP.HCM": "MAYBANK",
  "RHB Bank": "RHB",
  "Ngân hàng TNHH Một Thành Viên RHB Bank - Chi nhánh TP.HCM": "RHB",
  "CIMB Bank": "CIMB",
  "Ngân hàng TNHH Một Thành Viên CIMB Bank Berhad - Chi nhánh TP.HCM": "CIMB",
  "Bangkok Bank": "BBL",
  "Ngân hàng TNHH Một Thành Viên Bangkok Bank - Chi nhánh TP.HCM": "BBL",
  Kasikornbank: "KBNK",
  "Ngân hàng TNHH Một Thành Viên Kasikornbank - Chi nhánh TP.HCM": "KBNK",
  "Siam Commercial Bank": "SCB",
  "Ngân hàng TNHH Một Thành Viên Siam Commercial Bank - Chi nhánh TP.HCM": "SCB",
  "Krungthai Bank": "KTB",
  "Ngân hàng TNHH Một Thành Viên Krungthai Bank - Chi nhánh TP.HCM": "KTB",
  "Bank of Ayudhya": "BAY",
  "Ngân hàng TNHH Một Thành Viên Bank of Ayudhya - Chi nhánh TP.HCM": "BAY",
  "Bank of China": "BOC",
  "Ngân hàng TNHH Một Thành Viên Bank of China - Chi nhánh TP.HCM": "BOC",
  "Industrial and Commercial Bank of China": "ICBC",
  "Ngân hàng TNHH Một Thành Viên Industrial and Commercial Bank of China - Chi nhánh TP.HCM": "ICBC",
  "China Construction Bank": "CCB",
  "Ngân hàng TNHH Một Thành Viên China Construction Bank - Chi nhánh TP.HCM": "CCB",
  "Agricultural Bank of China": "ABC",
  "Ngân hàng TNHH Một Thành Viên Agricultural Bank of China - Chi nhánh TP.HCM": "ABC",
  "Bank of Communications": "BOCOM",
  "Ngân hàng TNHH Một Thành Viên Bank of Communications - Chi nhánh TP.HCM": "BOCOM",
  "China Merchants Bank": "CMB",
  "Ngân hàng TNHH Một Thành Viên China Merchants Bank - Chi nhánh TP.HCM": "CMB",
  "Ping An Bank": "PAB",
  "Ngân hàng TNHH Một Thành Viên Ping An Bank - Chi nhánh TP.HCM": "PAB",
  "Bank of Taiwan": "BOT",
  "Ngân hàng TNHH Một Thành Viên Bank of Taiwan - Chi nhánh TP.HCM": "BOT",
  "Land Bank of Taiwan": "LBT",
  "Ngân hàng TNHH Một Thành Viên Land Bank of Taiwan - Chi nhánh TP.HCM": "LBT",
  "Chang Hwa Commercial Bank": "CHCB",
  "Ngân hàng TNHH Một Thành Viên Chang Hwa Commercial Bank - Chi nhánh TP.HCM": "CHCB",
  "Hua Nan Commercial Bank": "HNCB",
  "Ngân hàng TNHH Một Thành Viên Hua Nan Commercial Bank - Chi nhánh TP.HCM": "HNCB",
  "Taiwan Cooperative Bank": "TCBC",
  "Ngân hàng TNHH Một Thành Viên Taiwan Cooperative Bank - Chi nhánh TP.HCM": "TCBC",
  "The Shanghai Commercial & Savings Bank": "SCSB",
  "Ngân hàng TNHH Một Thành Viên The Shanghai Commercial & Savings Bank - Chi nhánh TP.HCM": "SCSB",
  "CTBC Bank": "CTBC",
  "Ngân hàng TNHH Một Thành Viên CTBC Bank - Chi nhánh TP.HCM": "CTBC",
  "Fubon Bank": "FUBON",
  "Ngân hàng TNHH Một Thành Viên Fubon Bank - Chi nhánh TP.HCM": "FUBON",
  "Bank of India": "BOI",
  "Ngân hàng TNHH Một Thành Viên Bank of India - Chi nhánh TP.HCM": "BOI",
  "State Bank of India": "SBI",
  "Ngân hàng TNHH Một Thành Viên State Bank of India - Chi nhánh TP.HCM": "SBI",
  "Bank of Baroda": "BOB",
  "Ngân hàng TNHH Một Thành Viên Bank of Baroda - Chi nhánh TP.HCM": "BOB",
  "Bank of America": "BOFA",
  "Ngân hàng TNHH Một Thành Viên Bank of America - Chi nhánh TP.HCM": "BOFA",
  "BNP Paribas": "BNP",
  "Ngân hàng TNHH Một Thành Viên BNP Paribas - Chi nhánh TP.HCM": "BNP",
  "Credit Agricole Corporate and Investment Bank": "CACIB",
  "Ngân hàng TNHH Một Thành Viên Credit Agricole Corporate and Investment Bank - Chi nhánh TP.HCM": "CACIB",
  "Societe Generale": "SG",
  "Ngân hàng TNHH Một Thành Viên Societe Generale - Chi nhánh TP.HCM": "SG",
  "DBS Bank": "DBS",
  "Ngân hàng TNHH Một Thành Viên DBS Bank Ltd. - Chi nhánh TP.HCM": "DBS",
  "Oversea-Chinese Banking Corporation": "OCBC",
  "Ngân hàng TNHH Một Thành Viên Oversea-Chinese Banking Corporation - Chi nhánh TP.HCM": "OCBC",
  "United Overseas Bank": "UOB",
  "Ngân hàng TNHH Một Thành Viên United Overseas Bank - Chi nhánh TP.HCM": "UOB",
  Maybank: "MAYBANK",
  "Ngân hàng TNHH Một Thành Viên Maybank - Chi nhánh TP.HCM": "MAYBANK",
  "RHB Bank": "RHB",
  "Ngân hàng TNHH Một Thành Viên RHB Bank - Chi nhánh TP.HCM": "RHB",
  "CIMB Bank": "CIMB",
  "Ngân hàng TNHH Một Thành Viên CIMB Bank Berhad - Chi nhánh TP.HCM": "CIMB",
  "Bangkok Bank": "BBL",
  "Ngân hàng TNHH Một Thành Viên Bangkok Bank - Chi nhánh TP.HCM": "BBL",
  Kasikornbank: "KBNK",
  "Ngân hàng TNHH Một Thành Viên Kasikornbank - Chi nhánh TP.HCM": "KBNK",
  "Siam Commercial Bank": "SCB",
  "Ngân hàng TNHH Một Thành Viên Siam Commercial Bank - Chi nhánh TP.HCM": "SCB",
  "Krungthai Bank": "KTB",
  "Ngân hàng TNHH Một Thành Viên Krungthai Bank - Chi nhánh TP.HCM": "KTB",
  "Bank of Ayudhya": "BAY",
  "Ngân hàng TNHH Một Thành Viên Bank of Ayudhya - Chi nhánh TP.HCM": "BAY",
}

function getVietQRBankId(bankName: string): string {
  // Normalize bank name for better matching
  const normalizedBankName = bankName
    .toLowerCase()
    .replace(/ngân hàng tmcp |ngân hàng tnhh một thành viên |ngân hàng |chi nhánh |việt nam|tnhh|mtv/g, "")
    .trim()
  for (const key in VIETQR_BANK_MAP) {
    if (key.toLowerCase().includes(normalizedBankName) || normalizedBankName.includes(key.toLowerCase())) {
      return VIETQR_BANK_MAP[key]
    }
  }
  return "OTHER" // Fallback for unknown banks
}

export default function WithdrawalRequestsTable({ token }: WithdrawalRequestsTableProps) {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalRequests, setTotalRequests] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState<string>("")

  const [editingRequest, setEditingRequest] = useState<WithdrawalRequest | null>(null)
  const [newStatus, setNewStatus] = useState<"completed" | "cancelled" | "failed" | "">("")
  const [adminNotes, setAdminNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { toast } = useToast() // Initialize useToast

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    if (!token) {
      setError("Authentication token is missing. Please log in again.")
      setLoading(false)
      return
    }
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      if (statusFilter) {
        params.append("status", statusFilter)
      }
      if (searchTerm) {
        params.append("searchTerm", searchTerm)
      }

      const response = await fetch(`/api/admin/withdrawals?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || "Không thể tải danh sách yêu cầu rút tiền.")
      }
      const data = await response.json()
      setRequests(data.data || [])
      setTotalRequests(data.pagination?.total || 0)
      setPage(data.pagination?.page || 1)
      setLimit(data.pagination?.limit || 10)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định.")
    } finally {
      setLoading(false)
    }
  }, [token, page, limit, statusFilter, searchTerm])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchRequests()
    }, 300)
    return () => clearTimeout(debounceTimer)
  }, [fetchRequests])

  const handleUpdateStatus = async () => {
    if (!editingRequest || !newStatus) return
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/admin/withdrawals/${editingRequest.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus, admin_notes: adminNotes }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Cập nhật thất bại.")
      }
      setSuccess(data.message || "Cập nhật thành công!")
      setEditingRequest(null)
      setNewStatus("")
      setAdminNotes("")
      fetchRequests() // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi không xác định khi cập nhật.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditModal = (request: WithdrawalRequest) => {
    setEditingRequest(request)
    setNewStatus(request.status === "pending" ? "" : request.status)
    setAdminNotes(request.admin_notes || "")
    setError(null)
    setSuccess(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <Clock className="w-3 h-3 mr-1" />
            Chờ xử lý
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Hoàn thành
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
            <XCircle className="w-3 h-3 mr-1" />
            Đã hủy
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Thất bại
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const totalPages = Math.ceil(totalRequests / limit)

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }

  const handleLimitChange = (newLimit: string) => {
    const limit = Number.parseInt(newLimit)
    setLimit(limit)
    setPage(1)
  }

  const getBorderClassForRequest = (status: string) => {
    switch (status) {
      case "pending":
        return "border-l-4 border-yellow-500"
      case "completed":
        return "border-l-4 border-green-500"
      case "cancelled":
        return "border-l-4 border-gray-400"
      case "failed":
        return "border-l-4 border-red-500"
      default:
        return "border-l-4 border-gray-400"
    }
  }

  const formatAmount = (amount: number) => {
    return <span className="font-semibold text-red-600">-{amount.toLocaleString("vi-VN")} VNĐ</span>
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "HH:mm:ss dd/MM/yyyy")
    } catch (e) {
      return dateString
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Đã sao chép!",
          description: `${label} đã được sao chép vào clipboard.`,
        })
      })
      .catch((err) => {
        console.error("Failed to copy: ", err)
        toast({
          title: "Lỗi sao chép",
          description: `Không thể sao chép ${label}.`,
          variant: "destructive",
        })
      })
  }

  const generateWithdrawalQR = (request: WithdrawalRequest) => {
    const { bank_account_details_snapshot, amount } = request
    if (!bank_account_details_snapshot || !amount) return null

    const bankId = getVietQRBankId(bank_account_details_snapshot.bank_name)
    const accountNumber = bank_account_details_snapshot.account_number
    const accountName = bank_account_details_snapshot.account_name
    const addInfo = `RUTTIEN_${request.transaction_id}` // Unique info for admin to track

    // Use a negative amount for withdrawal from user's perspective, but for QR generation, it's the amount to be sent.
    // So, use the absolute amount.
    const qrAmount = Math.abs(amount)

    // Construct the VietQR URL
    // Example: https://img.vietqr.io/image/VCB-0123456789-compact2.png?amount=100000&addInfo=RUTTIEN_REQID123&accountName=NGUYEN%20VAN%20A
    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${qrAmount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`
    return qrUrl
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-700">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Tìm theo Mã GD hoặc Username..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
            }}
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value === "all" ? "" : value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ xử lý</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
            <SelectItem value="failed">Thất bại</SelectItem>
          </SelectContent>
        </Select>
        <Select value={limit.toString()} onValueChange={handleLimitChange}>
          <SelectTrigger className="w-full md:w-[120px]">
            <SelectValue placeholder="Số mục/trang" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / trang</SelectItem>
            <SelectItem value="20">20 / trang</SelectItem>
            <SelectItem value="50">50 / trang</SelectItem>
            <SelectItem value="100">100 / trang</SelectItem>
            <SelectItem value="500">500 / trang</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setPage(1)} variant="outline" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Làm mới / Tìm
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="ml-2">Đang tải dữ liệu...</p>
        </div>
      )}

      {!loading && requests.length === 0 && (
        <p className="text-center text-gray-500 py-8">Không có yêu cầu rút tiền nào.</p>
      )}

      {!loading && requests.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Mã GD</TableHead>
                  <TableHead className="text-right">Số tiền (VNĐ)</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Thông tin TK nhận</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className={getBorderClassForRequest(req.status)}>
                    <TableCell>
                      <div>{req.users?.full_name || req.users?.username}</div>
                      <div className="text-xs text-gray-500">@{req.users?.username}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{req.transaction_id}</TableCell>
                    <TableCell className="text-right font-semibold">{formatAmount(req.amount)}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell>{formatDate(req.created_at)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            Xem
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-full max-w-md sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Chi tiết tài khoản nhận (Mã GD: {req.transaction_id})</DialogTitle>
                          </DialogHeader>
                          {req.status === "completed" && (
                            <Alert className="bg-green-100 border-green-300 text-green-800">
                              <CheckCircle className="h-4 w-4" />
                              <AlertDescription className="font-semibold">
                                Giao dịch này đã được HOÀN THÀNH. Vui lòng KHÔNG chuyển khoản lại.
                              </AlertDescription>
                            </Alert>
                          )}
                          {req.status === "cancelled" && (
                            <Alert className="bg-gray-100 border-gray-300 text-gray-800">
                              <XCircle className="h-4 w-4" />
                              <AlertDescription className="font-semibold">
                                Giao dịch này đã bị HỦY. Vui lòng kiểm tra lại.
                              </AlertDescription>
                            </Alert>
                          )}
                          {req.status === "failed" && (
                            <Alert variant="destructive">
                              <XCircle className="h-4 w-4" />
                              <AlertDescription className="font-semibold">
                                Giao dịch này đã THẤT BẠI. Vui lòng kiểm tra lại.
                              </AlertDescription>
                            </Alert>
                          )}
                          {req.bank_account_details_snapshot && (
                            <div className="space-y-2 mt-2 text-sm">
                              <div className="flex items-center justify-between">
                                <p>
                                  <strong>Ngân hàng:</strong> {req.bank_account_details_snapshot.bank_name}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(req.bank_account_details_snapshot.bank_name, "Tên ngân hàng")
                                  }
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <p>
                                  <strong>Chủ TK:</strong> {req.bank_account_details_snapshot.account_name}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(req.bank_account_details_snapshot.account_name, "Tên chủ tài khoản")
                                  }
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <p>
                                  <strong>Số TK:</strong> {req.bank_account_details_snapshot.account_number}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(req.bank_account_details_snapshot.account_number, "Số tài khoản")
                                  }
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <p>
                                  <strong>Số tiền:</strong> {req.amount.toLocaleString("vi-VN")} VNĐ
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(req.amount.toString(), "Số tiền")}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                              <div className="flex items-center justify-between">
                                <p>
                                  <strong>Nội dung:</strong> RUTTIEN_{req.transaction_id}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    copyToClipboard(`RUTTIEN_${req.transaction_id}`, "Nội dung chuyển khoản")
                                  }
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                          <Separator className="my-4" />
                          <div className="flex flex-col items-center">
                            <p className="text-sm font-medium mb-2">Quét mã QR để chuyển khoản</p>
                            {generateWithdrawalQR(req) ? (
                              <img
                                src={generateWithdrawalQR(req) || ""}
                                alt="QR Code"
                                className="w-48 h-48 object-contain"
                              />
                            ) : (
                              <p className="text-red-500 text-sm">Không thể tạo mã QR cho ngân hàng này.</p>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditModal(req)}
                        disabled={req.status === "completed" || req.status === "cancelled" || req.status === "failed"}
                      >
                        <Edit3 className="w-4 h-4 mr-1" /> Cập nhật
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Hiển thị {requests.length} trên tổng số {totalRequests} yêu cầu.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Trước
              </Button>
              <span className="text-sm">
                Trang {page} / {totalPages > 0 ? totalPages : 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || loading}
              >
                Sau <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingRequest && (
        <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cập nhật yêu cầu rút tiền: {editingRequest.transaction_id}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p>
                <strong>Người dùng:</strong> {editingRequest.users.full_name || editingRequest.users.username} (@
                {editingRequest.users.username})
              </p>
              <p>
                <strong>Số tiền:</strong> {editingRequest.amount.toLocaleString("vi-VN")} VNĐ
              </p>
              <p>
                <strong>Thông tin TK nhận:</strong> {editingRequest.bank_account_details_snapshot.bank_name} -{" "}
                {editingRequest.bank_account_details_snapshot.account_number} (
                {editingRequest.bank_account_details_snapshot.account_name})
              </p>
              <p>
                <strong>Trạng thái hiện tại:</strong> {getStatusBadge(editingRequest.status)}
              </p>
              <Separator />
              <div>
                <Label htmlFor="newStatus">Trạng thái mới</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as any)}>
                  <SelectTrigger id="newStatus">
                    <SelectValue placeholder="Chọn trạng thái mới" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Hoàn thành (Sẽ trừ tiền khỏi tài khoản người dùng)</SelectItem>
                    <SelectItem value="cancelled">Đã hủy</SelectItem>
                    <SelectItem value="failed">Thất bại</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="adminNotes">Ghi chú của Admin</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Nhập ghi chú (nếu có)"
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={() => setEditingRequest(null)}>
                  Hủy
                </Button>
              </DialogClose>
              <Button onClick={handleUpdateStatus} disabled={isSubmitting || !newStatus}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Xác nhận
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
