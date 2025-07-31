(() => {
    // to sie wrzuca na strone klienta
    // trzeba ustawic domene crma
    const PARENT_CRM_ORIGIN = "*";

    function generateUUID() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const isReviewModeActive =
        urlParams.get("review_mode") === "true" || window.self !== window.top;

    console.log("Enhanced Review mode on");

    let tempRectDiv = null;
    let isDrawingModeEnabled = false;
    let rectangles = [];
    let isDrawing = false;
    let startPoint = null;
    let currentRectangle = null;
    let reviewOverlay;
    let isInitialized = false;
    let isCapturing = false;

    const injectStyles = () => {
        if (document.querySelector("#v0-review-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "v0-review-styles";
        style.innerHTML = `
            .v0-review-overlay { 
                position: fixed; 
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
        `;
        document.head.appendChild(style);
    };

    const createReviewElements = () => {
        if (!document.body) {
            console.warn(
                "Document body not available yet, delaying review element creation"
            );
            setTimeout(createReviewElements, 50);
            return;
        }

        reviewOverlay = document.createElement("div");
        reviewOverlay.className = `v0-review-overlay ${
            isDrawingModeEnabled ? "enabled" : "disabled"
        }`;
        document.body.appendChild(reviewOverlay);
    };

    const handleMouseDown = (e) => {
        if (e.button !== 0) return;

        // Najpierw sprawdź, czy kliknięto na istniejący prostokąt
        const clickedRect = rectangles.find((rect) => {
            return (
                e.pageX >= rect.x &&
                e.pageX <= rect.x + rect.width &&
                e.pageY >= rect.y &&
                e.pageY <= rect.y + rect.height
            );
        });

        if (clickedRect) {
            e.stopPropagation();
            e.preventDefault();
            createCommentBox(clickedRect);
            return;
        }

        // Jeśli nie jest w trybie rysowania, nie rób nic
        if (!isDrawingModeEnabled) return;

        const y = e.pageY;
        const x = e.pageX;
        startPoint = { x, y };
        isDrawing = true;
        currentRectangle = { x, y, width: 0, height: 0 };

        tempRectDiv = document.createElement("div");
        tempRectDiv.className = "v0-review-rectangle";
        tempRectDiv.style.left = `${x}px`;
        tempRectDiv.style.top = `${y}px`;
        reviewOverlay.appendChild(tempRectDiv);
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !startPoint) return;

        const x = Math.min(startPoint.x, e.pageX);
        const y = Math.min(startPoint.y, e.pageY);
        const width = Math.abs(e.pageX - startPoint.x);
        const height = Math.abs(e.pageY - startPoint.y);

        currentRectangle = { x, y, width, height };

        if (tempRectDiv) {
            tempRectDiv.style.left = `${x}px`;
            tempRectDiv.style.top = `${y}px`;
            tempRectDiv.style.width = `${width}px`;
            tempRectDiv.style.height = `${height}px`;
        }
    };

    // Funkcja obliczająca procentowe wartości dla prostokąta
    const calculatePercentages = (rect) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        return {
            ...rect,
            xPercent: (rect.x / viewportWidth) * 100,
            yPercent: (rect.y / viewportHeight) * 100,
            widthPercent: (rect.width / viewportWidth) * 100,
            heightPercent: (rect.height / viewportHeight) * 100
        };
    };

    const handleMouseUp = () => {
        if (!isDrawing || !currentRectangle || !startPoint) return;

        const { x, y, width, height } = currentRectangle;

        if (width > 10 && height > 10) {
            // Twórz prostokąt z wartościami pikseli i procentów
            const newRectangle = calculatePercentages({
                id: generateUUID(),
                x,
                y,
                width,
                height,
                comment: "",
                index: rectangles.length + 1,
            });
            
            rectangles.push(newRectangle);
            renderRectangles();
            notifyParentRectanglesUpdated();
            setTimeout(() => createCommentBox(newRectangle), 100);
        } else if (tempRectDiv) {
            tempRectDiv.remove();
        }

        isDrawing = false;
        startPoint = null;
        currentRectangle = null;
        tempRectDiv = null;
    };

    // Funkcja upewniająca się, że prostokąt ma wartości procentowe
    const ensureRectHasPercentages = (rect) => {
        if (rect.xPercent === undefined) {
            return calculatePercentages(rect);
        }
        return rect;
    };

    const renderRectangles = () => {
        Array.from(
            reviewOverlay.querySelectorAll(
                ".v0-review-rectangle, .v0-review-label"
            )
        ).forEach((el) => el.remove());

        rectangles.forEach((rect) => {
            // Upewnij się, że prostokąt ma wartości procentowe
            const rectWithPercent = ensureRectHasPercentages(rect);
            
            const rectDiv = document.createElement("div");
            rectDiv.className = "v0-review-rectangle";
            rectDiv.dataset.rectangleId = rectWithPercent.id;
            
            // Użyj wartości procentowych do pozycjonowania
            rectDiv.style.left = `${rectWithPercent.xPercent}%`;
            rectDiv.style.top = `${rectWithPercent.yPercent}%`;
            rectDiv.style.width = `${rectWithPercent.widthPercent}%`;
            rectDiv.style.height = `${rectWithPercent.heightPercent}%`;
            
            reviewOverlay.appendChild(rectDiv);
            
            // Etykieta również z wartościami procentowymi
            const label = document.createElement("div");
            label.className = "v0-review-label";
            label.textContent = rectWithPercent.index ?? "";
            label.style.left = `calc(${rectWithPercent.xPercent}% + 3px)`;
            label.style.top = `calc(${rectWithPercent.yPercent}% + 3px)`;
            
            reviewOverlay.appendChild(label);
            
            // Dodaj listener do prostokąta, aby reagował na kliknięcia
            rectDiv.addEventListener("click", (e) => {
                e.stopPropagation();
                e.preventDefault();
                createCommentBox(rectWithPercent);
            });
        });
    };

    const notifyParentRectanglesUpdated = () => {
        window.parent.postMessage(
            {
                type: "rectanglesUpdated",
                payload: { rectangles },
            },
            PARENT_CRM_ORIGIN
        );
    };

    const notifyParentDrawingModeChanged = () => {
        window.parent.postMessage(
            {
                type: "drawingModeChanged",
                payload: { enabled: isDrawingModeEnabled },
            },
            PARENT_CRM_ORIGIN
        );
    };

    const deleteRectangle = (id) => {
        const index = rectangles.findIndex((rect) => rect.id === id);
        if (index !== -1) {
            rectangles.splice(index, 1);
            rectangles.forEach((rect, i) => {
                rect.index = i + 1;
            });
            renderRectangles();
            notifyParentRectanglesUpdated();
            console.log(`🗑️ Rectangle ${id} deleted`);
        }
    };

    const undoLastRectangle = () => {
        if (rectangles.length > 0) {
            const removed = rectangles.pop();
            renderRectangles();
            notifyParentRectanglesUpdated();
            console.log(`↶ Undid rectangle #${removed.index}`);
        }
    };

    const updateRectangleComment = (id, comment) => {
        const rect = rectangles.find((r) => r.id === id);
        if (rect) {
            rect.comment = comment;
            notifyParentRectanglesUpdated();
            console.log(
                `💬 Updated comment for rectangle #${rect.index}:`,
                comment
            );
        }
    };

    const createCommentBox = (rect) => {
        const existingBoxes = reviewOverlay.querySelectorAll(
            "textarea[data-comment-box]"
        );
        existingBoxes.forEach((box) => box.remove());

        const textarea = document.createElement("textarea");
        textarea.placeholder = "Dodaj komentarz...";
        textarea.style.position = "absolute";
        textarea.style.zIndex = "10000";
        textarea.style.fontSize = "12px";
        textarea.style.padding = "4px";
        textarea.style.border = "1px solid #ccc";
        textarea.style.resize = "none";
        textarea.style.width = "200px";
        textarea.style.height = "80px";
        textarea.style.background = "white";
        textarea.style.borderRadius = "4px";
        textarea.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";
        textarea.value = rect.comment || "";
        textarea.dataset.commentBox = "true";
        textarea.dataset.rectId = rect.id;

        // Oblicz pozycję pola komentarza w pikselach na podstawie procentów
        const rect_x = rect.x || (rect.xPercent * window.innerWidth / 100);
        const rect_y = rect.y || (rect.yPercent * window.innerHeight / 100);
        const rect_width = rect.width || (rect.widthPercent * window.innerWidth / 100);
        
        const margin = 5;
        const widthNum = 200;
        const heightNum = 80;

        let left = Math.min(
            rect_x + rect_width + margin,
            window.innerWidth - widthNum - margin
        );
        left = Math.max(margin, left);

        let top = Math.min(
            rect_y + margin,
            window.innerHeight - heightNum - margin
        );
        top = Math.max(margin, top);

        textarea.style.left = `${left}px`;
        textarea.style.top = `${top}px`;

        reviewOverlay.appendChild(textarea);

        const handleBlur = () => {
            if (rect.comment !== textarea.value) {
                rect.comment = textarea.value;
                console.log(
                    `💬 Comment updated for #${rect.index}:`,
                    rect.comment
                );
                notifyParentRectanglesUpdated();
            }
            setTimeout(() => {
                if (textarea && textarea.parentNode) {
                    textarea.remove();
                }
            }, 50);
        };

        const handleKeydown = (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation();
                textarea.blur();
            } else if (e.key === "Escape") {
                textarea.value = rect.comment || "";
                e.preventDefault();
                e.stopPropagation();
                textarea.blur();
            }
        };

        textarea.addEventListener("blur", handleBlur);
        textarea.addEventListener("keydown", handleKeydown);

        setTimeout(() => {
            textarea.focus();
            textarea.select();
        }, 50);
    };

    const inlineExternalStylesheets = async () => {
        try {
            const linkElements = Array.from(
                document.querySelectorAll('link[rel="stylesheet"]')
            );
            const googleFontLinks = linkElements.filter(
                (link) =>
                    link.href && link.href.includes("fonts.googleapis.com")
            );

            if (!googleFontLinks.length) return;

            console.log(
                "Inlining Google Fonts to avoid CORS issues during capture..."
            );

            for (const link of googleFontLinks) {
                try {
                    const response = await fetch(link.href, {
                        mode: "cors",
                        credentials: "omit",
                    });

                    if (!response.ok) continue;

                    const cssText = await response.text();
                    const style = document.createElement("style");
                    style.textContent = cssText;
                    style.setAttribute("data-inlined-font", "true");
                    document.head.appendChild(style);
                    link.setAttribute("data-original-href", link.href);
                    link.removeAttribute("href");
                } catch (err) {
                    console.warn(
                        "Failed to inline stylesheet:",
                        link.href,
                        err
                    );
                }
            }

            return new Promise((resolve) => setTimeout(resolve, 300));
        } catch (err) {
            console.error("Error while inlining stylesheets:", err);
        }
    };

    const captureAndSendReview = async () => {
        if (isCapturing) {
            console.log("Capture already in progress, skipping...");
            return;
        }

        isCapturing = true;
        console.log("Capturing review");

        try {
            const domtoimage = window.domtoimage;
            if (!domtoimage) {
                throw new Error("domtoimage library not found");
            }

            await inlineExternalStylesheets();

            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            const dataUrl = await domtoimage.toPng(document.body, {
                quality: 0.95,
                filter: (node) => {
                    return !(
                        node.tagName === "LINK" &&
                        node.getAttribute("rel") === "stylesheet" &&
                        node
                            .getAttribute("data-original-href")
                            ?.includes("fonts.googleapis.com")
                    );
                },
                imagePlaceholder:
                    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            });

            const reviewData = {
                type: "reviewData",
                payload: {
                    screenshotBase64: dataUrl,
                    rectangles,
                    pageUrl: window.location.href,
                    timestamp: new Date().toISOString(),
                },
            };

            window.parent.postMessage(reviewData, PARENT_CRM_ORIGIN);
            console.log("Review data sent to parent");
        } catch (error) {
            console.error("Screenshot error:", error);
            window.parent.postMessage(
                {
                    type: "reviewError",
                    payload: {
                        message: "Failed to capture screenshot",
                        error: error.message,
                    },
                },
                PARENT_CRM_ORIGIN
            );
        } finally {
            document
                .querySelectorAll("[data-original-href]")
                .forEach((link) => {
                    link.href = link.getAttribute("data-original-href");
                    link.removeAttribute("data-original-href");
                });
            document
                .querySelectorAll("[data-inlined-font]")
                .forEach((style) => style.remove());

            setTimeout(() => {
                isCapturing = false;
            }, 1000);
        }
    };

    const handleMessage = (event) => {
        console.log("Message from parent:", event);

        if (event.data?.type === "triggerSaveReview") {
            captureAndSendReview();
        } else if (event.data?.type === "switchMode") {
            isDrawingModeEnabled = !isDrawingModeEnabled;
            reviewOverlay.className = `v0-review-overlay ${
                isDrawingModeEnabled ? "enabled" : "disabled"
            }`;
            notifyParentDrawingModeChanged();
        } else if (event.data?.type === "deleteRectangle") {
            deleteRectangle(event.data.payload.id);
        } else if (event.data?.type === "undoLast") {
            undoLastRectangle();
        } else if (event.data?.type === "updateRectangleComment") {
            updateRectangleComment(
                event.data.payload.id,
                event.data.payload.comment
            );
        } else if (event.data?.type === "focusRectangle") {
            focusRectangle(event.data.payload.id);
        } else if (event.data?.type === "loadInitialRectangles") {
            console.log(
                "📥 Received initial rectangles:",
                event.data.payload?.rectangles?.length || 0
            );

            if (Array.isArray(event.data.payload?.rectangles)) {
                // Zapewnij, że każdy prostokąt ma wartości procentowe
                rectangles = event.data.payload.rectangles.map((rect, idx) => ({
                    ...ensureRectHasPercentages(rect),
                    id: rect.id || generateUUID(), 
                    index: rect.index || (idx + 1),
                }));

                console.log("📋 Loaded rectangles:", rectangles.length);
                renderRectangles();
                notifyParentRectanglesUpdated();
            }
        }
    };

    const focusRectangle = (id) => {
        const rect = rectangles.find((r) => r.id === id);
        if (!rect) return;

        const existingElement = document.querySelector(
            `[data-rectangle-id="${id}"]`
        );
        if (existingElement) {
            existingElement.style.borderColor = "#3b82f6";
            existingElement.style.backgroundColor = "rgba(59, 130, 246, 0.3)";

            createCommentBox(rect);

            setTimeout(() => {
                if (existingElement) {
                    existingElement.style.borderColor = "#ef4444";
                    existingElement.style.backgroundColor =
                        "rgba(239,68,68,0.2)";
                }
            }, 1500);
        }
    };

    const init = () => {
        if (isInitialized) {
            console.log("Already initialized, skipping...");
            return;
        }

        console.log("Initializing enhanced review mode...");
        isInitialized = true;

        injectStyles();

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                createReviewElements();
                setupEventListeners();
            });
        } else {
            createReviewElements();
            setupEventListeners();
        }
    };

    const setupEventListeners = () => {
        if (!reviewOverlay) {
            console.warn(
                "Review overlay not created yet, delaying event listeners"
            );
            setTimeout(setupEventListeners, 50);
            return;
        }

        reviewOverlay.addEventListener("mousedown", handleMouseDown);
        reviewOverlay.addEventListener("mousemove", handleMouseMove);
        reviewOverlay.addEventListener("mouseup", handleMouseUp);

        window.addEventListener("message", handleMessage);

        notifyParentDrawingModeChanged();
        notifyParentRectanglesUpdated();
    };

    window.cleanupReviewMode = () => {
        if (reviewOverlay) {
            reviewOverlay.remove();
            reviewOverlay = null;
        }
        window.removeEventListener("message", handleMessage);
        const styles = document.querySelector("#v0-review-styles");
        if (styles) {
            styles.remove();
        }
        isInitialized = false;
        isCapturing = false;
        rectangles = [];
    };

    if (isReviewModeActive) {
        init();
    } else {
        window.initReviewMode = init;
    }
})();
