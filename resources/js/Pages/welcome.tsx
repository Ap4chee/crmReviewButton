"use client"

import { useEffect, useState } from "react"
import CrmReviewModal from "@/Components/Review/CrmReviewWindow"
import axios from "axios"

export default function Page() {
  const clientWebsiteUrl = "https://darkorange-sardine-923872.hostingersite.com/"
  const [initialRectangles, setInitialRectangles] = useState([])

  const handleReviewSaved = (data: any) => {
    console.log("Review data saved on parent component:", data)
  }

  useEffect(() => {
    axios
      .get("/api/reviews/latest", {
        params: { pageUrl: clientWebsiteUrl },
      })
      .then((res) => {
        setInitialRectangles(res.data.rectangles || [])
      })
      .catch((err) => {
        console.warn("Błąd podczas ładowania recenzji:", err)
      })
  }, [clientWebsiteUrl])

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div>
        <CrmReviewModal
          clientWebsiteUrl={clientWebsiteUrl}
          onReviewSaved={handleReviewSaved}
          initialRectangles={initialRectangles}
        />
      </div>
    </main>
  )
}
