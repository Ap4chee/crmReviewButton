;(() => {
  // to sie wrzuca na strone klienta
  // trzeba ustawic domene crma
  const PARENT_CRM_ORIGIN = "*"

  function generateUUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  const urlParams = new URLSearchParams(window.location.search)
  const isReviewModeActive = urlParams.get("review_mode") === "true" || window.self !== window.top

  console.log("Enhanced Review mode on")

  let tempRectDiv = null
  let isDrawingModeEnabled = false
  let rectangles = []
  let isDrawing = false
  let startPoint = null
  let currentRectangle = null
  let reviewOverlay
  let isInitialized = false
  let isCapturing = false

  const injectStyles = () => {
    if (document.querySelector("#v0-review-styles")) {
      return
    }

    const style = document.createElement("style")
    style.id = "v0-review-styles"
    style.innerHTML = `
            .v0-review-overlay { 
                position: absolute; 
                top: 0; 
                left: 0; 
                width: 100%; 
                height: 100%; 
                z-index: 9999; 
                cursor: crosshair; 
            }
            .v0-review-rectangle { 
                position: absolute; 
                border: 2px solid #ef4444; 
                background-color: rgba(239,68,68,0.2); 
                cursor: pointer;
            }
            .v0-review-rectangle:hover {
                border-color: #dc2626;
                background-color: rgba(220,38,38,0.3);
            }
            .v0-review-overlay.disabled { 
                pointer-events: none; 
                cursor: default; 
            }
            .v0-review-overlay.enabled { 
                pointer-events: auto; 
                cursor: crosshair; 
            }
            .v0-review-label {
                position: absolute;
                font-size: 12px;
                background: white;
                color: black;
                border: 1px solid #ccc;
                border-radius: 3px;
                padding: 1px 3px;
                pointer-events: none;
                font-weight: bold;
            }
        `
    document.head.appendChild(style)
  }

  const createCommentBox = (rect) => {
    const textarea = document.createElement("textarea")
    textarea.placeholder = "Add comment..."
    textarea.style.position = "absolute"
    textarea.style.zIndex = "10000"
    textarea.style.fontSize = "12px"
    textarea.style.padding = "4px"
    textarea.style.border = "1px solid #ccc"
    textarea.style.resize = "none"
    textarea.style.width = "120px"
    textarea.style.height = "60px"
    textarea.style.background = "white"
    textarea.style.borderRadius = "4px"
    textarea.value = rect.comment || ""

    const margin = 15
    const widthNum = 120
    const heightNum = 60
    textarea.style.left = `${rect.x + rect.width - widthNum - margin}px`
    textarea.style.top = `${rect.y + rect.height - heightNum - margin}px`

    reviewOverlay.appendChild(textarea)

    const handleBlur = () => {
      rect.comment = textarea.value
      console.log(`💬 Comment updated for #${rect.index}:`, rect.comment)
      textarea.remove()
      renderRectangles()
      notifyParentRectanglesUpdated()
    }

    const handleKeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        textarea.blur()
      } else if (e.key === "Escape") {
        textarea.value = rect.comment || ""
        textarea.blur()
      }
    }

    textarea.addEventListener("blur", handleBlur)
    textarea.addEventListener("keydown", handleKeydown)
    textarea.focus()
    textarea.select()
  }

  const createReviewElements = () => {
    if (reviewOverlay) {
      return
    }

    reviewOverlay = document.createElement("div")
    reviewOverlay.className = "v0-review-overlay disabled"
    reviewOverlay.style.height = `${document.documentElement.scrollHeight}px`
    document.body.appendChild(reviewOverlay)
  }

  const handleMouseDown = (e) => {
    if (e.button !== 0) return
    if (!isDrawingModeEnabled) return

    const clickedRect = rectangles.find((rect) => {
      return e.pageX >= rect.x && e.pageX <= rect.x + rect.width && e.pageY >= rect.y && e.pageY <= rect.y + rect.height
    })

    if (clickedRect) {
      createCommentBox(clickedRect)
      return
    }

    const y = e.pageY
    const x = e.pageX
    startPoint = { x, y }
    isDrawing = true
    currentRectangle = { x, y, width: 0, height: 0 }

    tempRectDiv = document.createElement("div")
    tempRectDiv.className = "v0-review-rectangle"
    tempRectDiv.style.left = `${x}px`
    tempRectDiv.style.top = `${y}px`
    reviewOverlay.appendChild(tempRectDiv)
  }

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPoint) return

    const x = Math.min(startPoint.x, e.pageX)
    const y = Math.min(startPoint.y, e.pageY)
    const width = Math.abs(e.pageX - startPoint.x)
    const height = Math.abs(e.pageY - startPoint.y)

    currentRectangle = { x, y, width, height }

    if (tempRectDiv) {
      tempRectDiv.style.left = `${x}px`
      tempRectDiv.style.top = `${y}px`
      tempRectDiv.style.width = `${width}px`
      tempRectDiv.style.height = `${height}px`
    }
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentRectangle || !startPoint) return

    const { x, y, width, height } = currentRectangle

    if (width > 10 && height > 10) {
      const newRectangle = {
        id: generateUUID(),
        x,
        y,
        width,
        height,
        comment: "",
        index: rectangles.length + 1,
      }
      rectangles.push(newRectangle)
      renderRectangles()
      notifyParentRectanglesUpdated()

      setTimeout(() => createCommentBox(newRectangle), 100)
      notifyParent()
    } else if (tempRectDiv) {
      tempRectDiv.remove()
    }

    isDrawing = false
    startPoint = null
    currentRectangle = null
    tempRectDiv = null
  }

  const renderRectangles = () => {
    Array.from(reviewOverlay.querySelectorAll(".v0-review-rectangle, .v0-review-label")).forEach((el) => el.remove())

    rectangles.forEach((rect) => {
      const rectDiv = document.createElement("div")
      rectDiv.className = "v0-review-rectangle"
      rectDiv.style.left = `${rect.x}px`
      rectDiv.style.top = `${rect.y}px`
      rectDiv.style.width = `${rect.width}px`
      rectDiv.style.height = `${rect.height}px`
      rectDiv.dataset.rectId = rect.id
      reviewOverlay.appendChild(rectDiv)

      const label = document.createElement("div")
      label.className = "v0-review-label"
      label.textContent = rect.index ?? ""
      label.style.left = `${rect.x + 3}px`
      label.style.top = `${rect.y + 3}px`
      reviewOverlay.appendChild(label)

      rectDiv.addEventListener("click", (e) => {
        if (isDrawingModeEnabled) {
          e.stopPropagation()
          createCommentBox(rect)
        }
      })
    })
  }

  const notifyParentRectanglesUpdated = () => {
    window.parent.postMessage(
      {
        type: "rectanglesUpdated",
        payload: { rectangles },
      },
      PARENT_CRM_ORIGIN,
    )
  }

  const notifyParentDrawingModeChanged = () => {
    window.parent.postMessage(
      {
        type: "drawingModeChanged",
        payload: { enabled: isDrawingModeEnabled },
      },
      PARENT_CRM_ORIGIN,
    )
  }

  const deleteRectangle = (id) => {
    const index = rectangles.findIndex((rect) => rect.id === id)
    if (index !== -1) {
      rectangles.splice(index, 1)
      rectangles.forEach((rect, i) => {
        rect.index = i + 1
      })
      renderRectangles()
      notifyParentRectanglesUpdated()
      console.log(`🗑️ Rectangle ${id} deleted`)
    }
  }

  const undoLastRectangle = () => {
    if (rectangles.length > 0) {
      const removed = rectangles.pop()
      renderRectangles()
      notifyParentRectanglesUpdated()
      console.log(`↶ Undid rectangle #${removed.index}`)
    }
  }

  const updateRectangleComment = (id, comment) => {
    const rect = rectangles.find((r) => r.id === id)
    if (rect) {
      rect.comment = comment
      notifyParentRectanglesUpdated()
      console.log(`💬 Updated comment for rectangle #${rect.index}:`, comment)
    }
  }

  const captureAndSendReview = async () => {
    if (isCapturing) {
      console.log("Capture already in progress, skipping...")
      return
    }

    isCapturing = true
    console.log("Capturing review")

    try {
      const domtoimage = window.domtoimage
      if (!domtoimage) {
        throw new Error("domtoimage library not found")
      }

      const dataUrl = await domtoimage.toPng(document.body, {
        quality: 0.95,
      })

      const reviewData = {
        type: "reviewData",
        payload: {
          screenshotBase64: dataUrl,
          rectangles,
          pageUrl: window.location.href,
          timestamp: new Date().toISOString(),
        },
      }

      window.parent.postMessage(reviewData, PARENT_CRM_ORIGIN)
      console.log("Review data sent to parent:", reviewData)
    } catch (error) {
      console.error("Screenshot error:", error)
    } finally {
      setTimeout(() => {
        isCapturing = false
      }, 1000)
    }
  }

  const handleMessage = (event) => {
    console.log("Message from parent:", event)

    if (event.data?.type === "triggerSaveReview") {
      captureAndSendReview()
    } else if (event.data?.type === "switchMode") {
      isDrawingModeEnabled = !isDrawingModeEnabled
      if (isDrawingModeEnabled) {
        reviewOverlay.classList.remove("disabled")
        reviewOverlay.classList.add("enabled")
      } else {
        reviewOverlay.classList.remove("enabled")
        reviewOverlay.classList.add("disabled")
      }
      notifyParentDrawingModeChanged()
      console.log(`🎨 Drawing mode: ${isDrawingModeEnabled ? "ON" : "OFF"}`)
      notifyParent()
    } else if (event.data?.type === "undoLast") {
      if (rectangles.length > 0) {
        rectangles.pop()
        renderRectangles()
        notifyParent()
      }
    } else if (event.data?.type === "deleteRectangle") {
      rectangles = rectangles.filter((r) => r.id !== event.data.payload.id)
      rectangles.forEach((rect, i) => (rect.index = i + 1))
      renderRectangles()
      notifyParent()
    } else if (event.data?.type === "updateRectangleComment") {
      updateRectangleComment(event.data.payload.id, event.data.payload.comment)
    }
  }

  const init = () => {
    if (isInitialized) {
      console.log("Already initialized, skipping...")
      return
    }

    console.log("Initializing enhanced review mode...")
    isInitialized = true

    injectStyles()
    createReviewElements()

    reviewOverlay.addEventListener("mousedown", handleMouseDown)
    reviewOverlay.addEventListener("mousemove", handleMouseMove)
    reviewOverlay.addEventListener("mouseup", handleMouseUp)

    window.addEventListener("message", handleMessage)

    notifyParentDrawingModeChanged()
    notifyParentRectanglesUpdated()
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }

  window.cleanupReviewMode = () => {
    if (reviewOverlay) {
      reviewOverlay.remove()
      reviewOverlay = null
    }
    window.removeEventListener("message", handleMessage)
    const styles = document.querySelector("#v0-review-styles")
    if (styles) {
      styles.remove()
    }
    isInitialized = false
    isCapturing = false
    rectangles = []
  }

  const notifyParent = () => {
    window.parent.postMessage(
      {
        type: "rectanglesUpdated",
        payload: { rectangles },
      },
      PARENT_CRM_ORIGIN,
    )

    window.parent.postMessage(
      {
        type: "drawingModeChanged",
        payload: { enabled: isDrawingModeEnabled },
      },
      PARENT_CRM_ORIGIN,
    )
  }
})()
