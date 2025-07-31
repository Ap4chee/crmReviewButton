import { useState } from "react"
import { Edit3, Trash2 } from "lucide-react"
import { Button } from "@/Components/ui/button"
import { Input } from "@/Components/ui/input"

interface Rectangle {
  id: string
  index: number
  comment: string
}

export default function RectangleComment({
  rect,
  isEditing,
  onEditStart,
  onEditCancel,
  onEditSubmit,
  onDelete,
  onFocus,
}: {
  rect: Rectangle
  isEditing: boolean
  onEditStart: (id: string) => void
  onEditCancel: () => void
  onEditSubmit: (id: string, comment: string) => void
  onDelete: (id: string) => void
  onFocus: (id: string) => void
}) {
  const [tempComment, setTempComment] = useState(rect.comment || "")

  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">#{rect.index}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(rect.id)}
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {isEditing ? (
        <Input
          value={tempComment}
          onChange={(e) => setTempComment(e.target.value)}
          className="text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onEditSubmit(rect.id, tempComment)
            if (e.key === "Escape") onEditCancel()
          }}
          onBlur={() => onEditSubmit(rect.id, tempComment)}
        />
      ) : (
        <div
          className="text-xs text-gray-600 cursor-pointer hover:bg-gray-50 p-1 rounded min-h-[20px]"
          onClick={() => {
            onEditStart(rect.id)
            onFocus(rect.id)
          }}
        >
          {rect.comment || <span className="text-gray-400 italic">Dodaj komentarz...</span>}
          <Edit3 className="w-3 h-3 inline ml-1 opacity-50" />
        </div>
      )}
    </div>
  )
}
