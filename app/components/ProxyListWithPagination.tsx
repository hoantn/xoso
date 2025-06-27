"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Grid, List, ChevronLeft, ChevronRight } from "lucide-react"
import ProxyCard from "./ProxyCard"
import ProxyCompactCard from "./ProxyCompactCard"
import ProxyDetailModal from "./ProxyDetailModal"
import { usePagination } from "../hooks/usePagination"
import type { Proxy } from "../types/proxy"

interface ProxyListWithPaginationProps {
  proxies: Proxy[]
  totalCount: number
  loading: boolean
  onEdit?: (proxy: Proxy) => void
  onDelete?: (id: string) => void
  onPageChange?: (page: number, limit: number) => void
  showActions?: boolean
  title?: string
}

export default function ProxyListWithPagination({
  proxies,
  totalCount,
  loading,
  onEdit,
  onDelete,
  onPageChange,
  showActions = true,
  title = "Danh sách Proxy",
}: ProxyListWithPaginationProps) {
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid")
  const [selectedProxy, setSelectedProxy] = useState<Proxy | null>(null)

  const { currentPage, itemsPerPage, totalPages, goToPage, goToNextPage, goToPrevPage, changeItemsPerPage } =
    usePagination({
      initialPage: 1,
      initialLimit: 10,
      totalItems: totalCount,
    })

  // Notify parent component when pagination changes
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage, itemsPerPage)
    }
  }, [currentPage, itemsPerPage, onPageChange])

  const handleProxyClick = useCallback((proxy: Proxy) => {
    setSelectedProxy(proxy)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedProxy(null)
  }, [])

  const renderPaginationControls = () => (
    <div className="flex items-center justify-between mt-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Hiển thị:</span>
        <Select value={itemsPerPage.toString()} onValueChange={(value) => changeItemsPerPage(Number(value))}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
            <SelectItem value="500">500</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-600">trên tổng {totalCount} proxy</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={currentPage === 1}>
          <ChevronLeft className="w-4 h-4" />
          Trước
        </Button>

        <span className="text-sm text-gray-600 px-3">
          Trang {currentPage} / {totalPages}
        </span>

        <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage === totalPages}>
          Sau
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "grid" | "compact")}>
              <TabsList>
                <TabsTrigger value="grid" className="flex items-center gap-1">
                  <Grid className="w-4 h-4" />
                  Lưới
                </TabsTrigger>
                <TabsTrigger value="compact" className="flex items-center gap-1">
                  <List className="w-4 h-4" />
                  Danh sách
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#229ED9]"></div>
              <span className="ml-3 text-gray-600">Đang tải...</span>
            </div>
          ) : proxies.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Không có proxy nào</p>
            </div>
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {proxies.map((proxy) => (
                    <ProxyCard
                      key={proxy.id}
                      proxy={proxy}
                      onEdit={showActions ? onEdit : undefined}
                      onDelete={showActions ? onDelete : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="space-y-3 w-max min-w-full">
                    {proxies.map((proxy) => (
                      <ProxyCompactCard key={proxy.id} proxy={proxy} onClick={handleProxyClick} />
                    ))}
                  </div>
                </div>
              )}

              {renderPaginationControls()}
            </>
          )}
        </CardContent>
      </Card>

      <ProxyDetailModal proxy={selectedProxy} isOpen={!!selectedProxy} onClose={handleCloseModal} />
    </>
  )
}
