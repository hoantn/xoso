"use client"

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShoppingCart, Check, Users, Zap, Star, AlertTriangle, CheckCircle } from "lucide-react"
import { StatusModal } from "@/components/StatusModal"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ProxyPlan {
  id: string
  name: string
  description: string
  price: number
  duration_days: number
  max_connections: number
  proxy_type: string
  is_active: boolean
}

interface PurchaseResult {
  success: boolean
  message: string
  data?: {
    order_id: string
    proxy_id: string
    expires_at: string
    proxy_type: string
    max_users: number
    proxy_url?: string
    proxy_server?: string
    proxy_port?: number
    plan_name: string
  }
}

// Định nghĩa các nhóm người dùng
type UserTierKey = "single_user" | "small_multi_user" | "large_multi_user"

interface PlanOption {
  plan: ProxyPlan
  label: string // e.g., "30 ngày"
}

interface ProxyTypeOptions {
  [proxyType: string]: PlanOption[] // e.g., { 'mtproto': [{plan: ..., label: '30 ngày'}, {plan: ..., label: '90 ngày'}] }
}

interface TierData {
  label: string // e.g., "1 Người Dùng"
  description: string
  proxyTypes: ProxyTypeOptions
}

interface GroupedPlans {
  [tierKey: string]: TierData
}

// Component con để hiển thị từng nhóm proxy
function ProxyTierCard({
  tierKey,
  tierData,
  handlePurchase,
  purchasing,
  setModalContent,
  setIsModalOpen,
}: {
  tierKey: UserTierKey
  tierData: TierData
  handlePurchase: (planId: string) => Promise<void>
  purchasing: string | null
  setModalContent: React.Dispatch<React.SetStateAction<any>>
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const router = useRouter()
  const [selectedProxyType, setSelectedProxyType] = useState<string>(Object.keys(tierData.proxyTypes)[0] || "")
  const [selectedDuration, setSelectedDuration] = useState<string>("")

  // Lấy các tùy chọn thời hạn cho loại proxy đã chọn
  const durationOptions = useMemo(() => {
    if (selectedProxyType && tierData.proxyTypes[selectedProxyType]) {
      const options = tierData.proxyTypes[selectedProxyType].map((option) => ({
        value: option.plan.duration_days.toString(),
        label: option.label,
      }))
      // Sắp xếp theo thời hạn tăng dần
      options.sort((a, b) => Number.parseInt(a.value) - Number.parseInt(b.value))
      return options
    }
    return []
  }, [selectedProxyType, tierData.proxyTypes])

  // Đặt giá trị mặc định cho thời hạn khi loại proxy thay đổi
  useEffect(() => {
    if (durationOptions.length > 0) {
      // Luôn chọn thời hạn nhỏ nhất làm mặc định
      setSelectedDuration(durationOptions[0].value)
    } else {
      setSelectedDuration("")
    }
  }, [durationOptions, selectedProxyType]) // Thêm selectedProxyType vào dependency array

  // Lấy plan hiện tại dựa trên lựa chọn
  const currentPlan = useMemo(() => {
    if (selectedProxyType && selectedDuration) {
      return tierData.proxyTypes[selectedProxyType]?.find(
        (option) => option.plan.duration_days.toString() === selectedDuration,
      )?.plan
    }
    return null
  }, [selectedProxyType, selectedDuration, tierData.proxyTypes])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price)
  }

  const getPlanIcon = (planName: string) => {
    if (planName.includes("Premium") || planName.includes("Nhiều")) return <Star className="w-5 h-5 text-yellow-500" />
    if (planName.includes("Tiêu Chuẩn") || planName.includes("2-3")) return <Zap className="w-5 h-5 text-blue-500" />
    return <CheckCircle className="w-5 h-5 text-green-500" />
  }

  // Hàm để lấy văn bản số lượng người dùng
  const getUserCountText = (maxConnections: number) => {
    if (maxConnections === 1) return "1 Người"
    if (maxConnections >= 2 && maxConnections <= 3) return "2-3 Người"
    if (maxConnections >= 4 || maxConnections === 999) return "Nhiều người"
    return `${maxConnections} người` // Fallback
  }

  return (
    <Card className="relative hover:shadow-lg transition-shadow duration-300 border-2 hover:border-blue-200">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          {getPlanIcon(tierData.label)}
          <CardTitle className="text-xl">{tierData.label}</CardTitle>
        </div>
        <p className="text-gray-600 text-center text-sm">{tierData.description}</p>

        <div className="text-center mt-4">
          <span className="text-4xl font-bold text-blue-600">
            {currentPlan ? formatPrice(currentPlan.price) : "N/A"}
          </span>
          {currentPlan && (
            <div className="text-sm text-gray-500 mt-1">
              {currentPlan.duration_days} ngày •{" "}
              {Math.round(currentPlan.price / currentPlan.duration_days).toLocaleString("vi-VN")} VNĐ/ngày
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {/* Lựa chọn loại Proxy */}
          <div>
            <label htmlFor={`proxy-type-${tierKey}`} className="block text-sm font-medium text-gray-700 mb-1">
              Loại Proxy
            </label>
            <Select value={selectedProxyType} onValueChange={setSelectedProxyType}>
              <SelectTrigger id={`proxy-type-${tierKey}`}>
                <SelectValue placeholder="Chọn loại Proxy" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(tierData.proxyTypes).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lựa chọn thời hạn */}
          <div>
            <label htmlFor={`duration-${tierKey}`} className="block text-sm font-medium text-gray-700 mb-1">
              Thời hạn
            </label>
            <Select value={selectedDuration} onValueChange={setSelectedDuration}>
              <SelectTrigger id={`duration-${tierKey}`}>
                <SelectValue placeholder="Chọn thời hạn" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Thông tin chi tiết của gói được chọn */}
          {currentPlan && (
            <>
              <div className="flex items-center">
                <Users className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-sm">
                  Số lượng người sử dụng: <strong>{getUserCountText(currentPlan.max_connections)}</strong>
                </span>
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-sm">Proxy {currentPlan.proxy_type.toUpperCase()} chất lượng cao</span>
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-sm">Tốc độ ổn định, độ trễ thấp</span>
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-sm">Hỗ trợ 24/7</span>
              </div>
              <div className="flex items-center">
                <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                <span className="text-sm">Kích hoạt ngay lập tức</span>
              </div>
            </>
          )}
        </div>

        <Button
          className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3"
          onClick={() => currentPlan && handlePurchase(currentPlan.id)}
          disabled={!currentPlan || purchasing === currentPlan?.id}
          size="lg"
        >
          {purchasing === currentPlan?.id ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Đang xử lý...
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Mua Ngay
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function ProxyShop() {
  const [plans, setPlans] = useState<ProxyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalContent, setModalContent] = useState<{
    title: string
    message: string
    type: "success" | "error" | "info"
    details?: { label: string; value: string | number }[]
  } | null>(null)

  const router = useRouter()

  const fetchPlans = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/proxy-plans")
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      if (Array.isArray(data)) {
        setPlans(data.filter((plan) => plan.is_active))
      } else {
        throw new Error("Dữ liệu không hợp lệ từ server")
      }
    } catch (error) {
      console.error("Error fetching plans:", error)
      setError(error instanceof Error ? error.message : "Lỗi không xác định khi tải gói proxy")
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (planId: string) => {
    setPurchasing(planId)
    setError(null)

    try {
      const token = localStorage.getItem("auth_token")
      if (!token) {
        throw new Error("Vui lòng đăng nhập để mua proxy")
      }

      const response = await fetch("/api/proxy-plans/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: planId }),
      })

      const result: PurchaseResult = await response.json()

      if (result.success && result.data) {
        const details = [
          { label: "Gói đã mua", value: result.data.plan_name },
          { label: "Loại Proxy", value: result.data.proxy_type.toUpperCase() },
          { label: "Số kết nối", value: result.data.max_users === 999 ? "Không giới hạn" : result.data.max_users },
          {
            label: "Ngày hết hạn",
            value: new Date(result.data.expires_at).toLocaleString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
          { label: "Mã đơn hàng", value: result.data.order_id.substring(0, 8) + "..." },
        ]

        if (result.data.proxy_server && result.data.proxy_port) {
          details.push({ label: "Server", value: `${result.data.proxy_server}:${result.data.proxy_port}` })
        }

        setModalContent({
          title: "🎉 Mua Proxy Thành Công!",
          message:
            "Proxy của bạn đã được kích hoạt và sẵn sàng sử dụng. Vui lòng kiểm tra tab 'Proxy của tôi' để xem chi tiết và hướng dẫn sử dụng.",
          type: "success",
          details: details,
        })
        setIsModalOpen(true)

        router.refresh() // Làm mới dữ liệu trên trang hiện tại
      } else {
        setModalContent({
          title: "❌ Mua Proxy Thất Bại!",
          message: result.message || "Đã xảy ra lỗi không xác định khi mua proxy.",
          type: "error",
        })
        setIsModalOpen(true)
      }
    } catch (error) {
      console.error("Error purchasing:", error)
      const errorMessage = error instanceof Error ? error.message : "Không thể kết nối đến máy chủ"

      setModalContent({
        title: "🔌 Lỗi Kết Nối!",
        message: `${errorMessage}. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.`,
        type: "error",
      })
      setIsModalOpen(true)
    } finally {
      setPurchasing(null)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setModalContent(null)
  }

  // Nhóm các gói proxy theo số lượng người dùng và loại proxy
  const groupedPlans = useMemo(() => {
    const groups: GroupedPlans = {
      single_user: {
        label: "1 Người Dùng",
        description: "Proxy mạnh mẽ chỉ 1 người sử dụng.", // Cập nhật mô tả
        proxyTypes: {},
      },
      small_multi_user: {
        label: "2-3 Người Dùng",
        description: "Proxy tối ưu cho 2-3 người sử dụng.", // Cập nhật mô tả
        proxyTypes: {},
      },
      large_multi_user: {
        label: "Nhiều Người Dùng",
        description: "Proxy nhiều người sử dụng.", // Cập nhật mô tả
        proxyTypes: {},
      },
    }

    plans.forEach((plan) => {
      let tier: UserTierKey | null = null
      if (plan.max_connections === 1) {
        tier = "single_user"
      } else if (plan.max_connections >= 2 && plan.max_connections <= 3) {
        tier = "small_multi_user"
      } else if (plan.max_connections >= 4 || plan.max_connections === 999) {
        tier = "large_multi_user"
      }

      if (tier) {
        if (!groups[tier].proxyTypes[plan.proxy_type]) {
          groups[tier].proxyTypes[plan.proxy_type] = []
        }
        groups[tier].proxyTypes[plan.proxy_type].push({
          plan: plan,
          label: `${plan.duration_days} ngày`,
        })
      }
    })

    // Sắp xếp các tùy chọn thời hạn trong mỗi loại proxy
    for (const tierKey in groups) {
      for (const proxyType in groups[tierKey as UserTierKey].proxyTypes) {
        groups[tierKey as UserTierKey].proxyTypes[proxyType].sort((a, b) => a.plan.duration_days - b.plan.duration_days)
      }
    }

    return groups
  }, [plans])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải gói proxy...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" onClick={fetchPlans} className="ml-2">
            Thử lại
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Chưa có gói proxy nào</h3>
        <p className="text-gray-500">Hiện tại chưa có gói proxy nào khả dụng. Vui lòng quay lại sau.</p>
      </div>
    )
  }

  // Lấy key của tier đầu tiên có dữ liệu để đặt làm giá trị mặc định cho Tabs
  const defaultTabValue =
    Object.keys(groupedPlans).find((key) => Object.keys(groupedPlans[key as UserTierKey].proxyTypes).length > 0) ||
    "single_user"

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2">🛒 Cửa Hàng Proxy</h2>
        <p className="text-gray-600">Chọn gói proxy chất lượng cao phù hợp với nhu cầu của bạn</p> {/* Tiêu đề chung */}
      </div>

      <Tabs defaultValue={defaultTabValue} className="w-full">
        <TabsList className="flex w-full flex-wrap gap-2 h-auto p-1 mb-8 overflow-x-auto">
          {Object.keys(groupedPlans).map((tierKey) => {
            const tier = groupedPlans[tierKey as UserTierKey]
            // Chỉ hiển thị tab nếu có ít nhất một loại proxy trong tier đó
            if (Object.keys(tier.proxyTypes).length > 0) {
              return (
                <TabsTrigger key={tierKey} value={tierKey}>
                  {tier.label}
                </TabsTrigger>
              )
            }
            return null
          })}
        </TabsList>

        {Object.keys(groupedPlans).map((tierKey) => {
          const tier = groupedPlans[tierKey as UserTierKey]
          if (Object.keys(tier.proxyTypes).length > 0) {
            return (
              <TabsContent key={tierKey} value={tierKey} className="mt-6">
                <ProxyTierCard
                  tierKey={tierKey as UserTierKey}
                  tierData={tier}
                  handlePurchase={handlePurchase}
                  purchasing={purchasing}
                  setModalContent={setModalContent}
                  setIsModalOpen={setIsModalOpen}
                />
              </TabsContent>
            )
          }
          return null
        })}
      </Tabs>

      {modalContent && (
        <StatusModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={modalContent.title}
          message={modalContent.message}
          type={modalContent.type}
          details={modalContent.details}
        />
      )}
    </div>
  )
}
