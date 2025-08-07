"use client"

import { useState } from "react"
import { Button } from "@/Components/ui/button"
import { Eye } from "lucide-react"
import ReviewModal from "./ReviewModal"
import axios from "axios"

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
}

export default function CrmReviewWindow({
  clientWebsiteUrl = "",
  onReviewSaved,
}: CrmReviewModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [iframeSrc, setIframeSrc] = useState("")
  const [initialWidth, setInitialWidth] = useState<number>(0)
  const [initialRectangles, setInitialRectangles] = useState<Rectangle[]>([])

  const handleOpenModal = async () => {
    if (!clientWebsiteUrl) return

    setIsLoading(true)

    try {
      const response = await axios.get("/api/reviews/latest", {
        params: { pageUrl: clientWebsiteUrl },
      })
      setInitialRectangles(response.data.rectangles || [])
      if (response.data.iframeWidth) {
        console.log("Loaded iframe width from database:", response.data.iframeWidth)
        setInitialWidth(response.data.iframeWidth)
      } else {
        const defaultWidth = window.innerWidth * 0.95 - 320
        setInitialWidth(defaultWidth)
      }

      const url = new URL(clientWebsiteUrl)
      url.searchParams.set("review_mode", "true")
      setIframeSrc(url.toString())

      setIsModalOpen(true)
    } catch (err) {
      console.warn("Error loading review data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setIframeSrc("")
  }

  return (
    <>
      <Button
        onClick={handleOpenModal}
        disabled={!clientWebsiteUrl || isLoading}
        className="flex items-center gap-2"
      >
        {isLoading ? "Ładowanie..." : (
          <>
            <Eye className="w-4 h-4" />
            Podgląd
          </>
        )}
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
