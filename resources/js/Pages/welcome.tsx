"use client"

import CrmReviewModal from "@/Components/Review/CrmReviewWindow"

export default function Page() {
  const clientWebsiteUrl = "https://darkorange-sardine-923872.hostingersite.com/"
  
  const handleReviewSaved = (data: any) => {
    console.log("Review data saved on parent component:", data)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div>
        <CrmReviewModal
          clientWebsiteUrl={clientWebsiteUrl}
          onReviewSaved={handleReviewSaved}
        />
      </div>
    </main>
  )
}
