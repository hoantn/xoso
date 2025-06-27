"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, type LucideIcon } from "lucide-react"

interface GameBannerProps {
  title: string
  description: string
  href: string
  icon: LucideIcon
  gradient: string
  textColor: string
  buttonText?: string
  disabled?: boolean
}

export function GameBanner({
  title,
  description,
  href,
  icon: Icon,
  gradient,
  textColor,
  buttonText = "Chơi Ngay",
  disabled = false,
}: GameBannerProps) {
  return (
    <Card className={`w-full ${gradient} text-white shadow-lg overflow-hidden`}>
      <CardHeader className="relative p-6">
        <div className="absolute inset-0 bg-pattern opacity-10" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="w-10 h-10 text-white" />
            <div>
              <CardTitle className="text-3xl font-bold">{title}</CardTitle>
              <CardDescription className={textColor}>{description}</CardDescription>
            </div>
          </div>
          {disabled ? (
            <Button variant="secondary" className="bg-white text-gray-700 hover:bg-gray-100" disabled>
              Sắp ra mắt
            </Button>
          ) : (
            <Link href={href} passHref>
              <Button variant="secondary" className="bg-white text-gray-700 hover:bg-gray-100">
                {buttonText} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <p className={`${textColor} text-sm`}>
          {disabled ? "Đang trong quá trình phát triển, sẽ ra mắt sớm!" : "Tham gia ngay để trải nghiệm!"}
        </p>
      </CardContent>
    </Card>
  )
}
