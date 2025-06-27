"use client"

import { useState, useCallback } from "react"

interface PaginationState {
  currentPage: number
  itemsPerPage: number
  totalItems: number
  totalPages: number
}

interface UsePaginationProps {
  initialPage?: number
  initialLimit?: number
  totalItems?: number
}

export function usePagination({ initialPage = 1, initialLimit = 10, totalItems = 0 }: UsePaginationProps = {}) {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [itemsPerPage, setItemsPerPage] = useState(initialLimit)

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page)
      }
    },
    [totalPages],
  )

  const goToNextPage = useCallback(() => {
    goToPage(currentPage + 1)
  }, [currentPage, goToPage])

  const goToPrevPage = useCallback(() => {
    goToPage(currentPage - 1)
  }, [currentPage, goToPage])

  const changeItemsPerPage = useCallback((newLimit: number) => {
    setItemsPerPage(newLimit)
    setCurrentPage(1) // Reset to first page when changing limit
  }, [])

  const paginationState: PaginationState = {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
  }

  return {
    ...paginationState,
    goToPage,
    goToNextPage,
    goToPrevPage,
    changeItemsPerPage,
    setCurrentPage,
    setItemsPerPage,
  }
}
