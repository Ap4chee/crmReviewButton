"use client"

import { useState } from "react"
import { Button } from "@/Components/ui/button"
import { Eye } from "lucide-react"
import ReviewModal from "./ReviewModal"

interface Rectangle {
  id: string
  x: number
  y: number
  width: number
  height: number
  comment: string
  index: number
}

interface CrmReviewModalProps {
  clientWebsiteUrl?: string
  onReviewSaved?: (data: any) => void
  initialRectangles?: Rectangle[]
}

export default function CrmReviewWindow({
  clientWebsiteUrl = "",
  onReviewSaved,
  initialRectangles = [],
}: CrmReviewModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [iframeSrc, setIframeSrc] = useState("")
  const [initialWidth, setInitialWidth] = useState<number>(0)

  const handleOpenModal = () => {
    if (!clientWebsiteUrl) return
    const url = new URL(clientWebsiteUrl)
    url.searchParams.set("review_mode", "true")

    setIframeSrc(url.toString())
    setIsModalOpen(true)
    setInitialWidth(window.innerWidth * 0.95 - 320)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setIframeSrc("")
  }

  return (
    <>
      <Button
        onClick={handleOpenModal}
        disabled={!clientWebsiteUrl}
        className="flex items-center gap-2"
      >
        <Eye className="w-4 h-4" />
        Podgląd
      </Button>

      {isModalOpen && (
        <ReviewModal
          iframeSrc={iframeSrc}
          initialWidth={initialWidth}
          onClose={handleCloseModal}
          clientWebsiteUrl={clientWebsiteUrl}
          onReviewSaved={onReviewSaved}
          initialRectangles={initialRectangles}
        />
      )}
    </>
  )
}
