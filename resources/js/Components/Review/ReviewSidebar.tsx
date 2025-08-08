import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Camera, Pencil, Undo } from "lucide-react";
import RectangleComment from "./RectangleComment";

interface Rectangle {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    comment: string;
    index: number;
}

export default function ReviewSidebar({
    clientWebsiteUrl,
    onReviewSaved,
    onClose,
    initialRectangles = [],
    iframeWidth,
}: {
    clientWebsiteUrl: string;
    onReviewSaved?: (data: any) => void;
    onClose: () => void;
    initialRectangles: Rectangle[];
    iframeWidth: number;
}) {
    const [rectangles, setRectangles] = useState<Rectangle[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [editingRectangleId, setEditingRectangleId] = useState<string | null>(
        null
    );

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const sendMessageToIframe = useCallback((message: any) => {
        const iframe = document.querySelector("iframe");
        if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage(message, "*");
        }
    }, []);

    const handleCaptureReview = () => {
        if (isSaving) return;
        setIsSaving(true);

        sendMessageToIframe({
            type: "triggerSaveReview",
            payload: { iframeWidth }, // Include the current iframe width
        });

        timeoutRef.current = setTimeout(() => {
            console.warn("Timeout during review capture");
            setIsSaving(false);
        }, 15000);
    };

    const handleSwitchDrawingMode = () => {
        sendMessageToIframe({ type: "switchMode" });
        setIsDrawingMode(!isDrawingMode);
    };

    const handleUndo = () => {
        sendMessageToIframe({ type: "undoLast" });
    };

    const handleEditStart = (id: string) => {
        setEditingRectangleId(id);
    };

    const handleEditCancel = () => {
        setEditingRectangleId(null);
    };

    const handleEditSubmit = (id: string, comment: string) => {
        sendMessageToIframe({
            type: "updateRectangleComment",
            payload: { id, comment },
        });
        setEditingRectangleId(null);
    };

    const handleFocus = (id: string) => {
        sendMessageToIframe({
            type: "focusRectangle",
            payload: { id },
        });
    };

    const handleDelete = (id: string) => {
        sendMessageToIframe({
            type: "deleteRectangle",
            payload: { id },
        });
    };

    const handleMessage = useCallback(
        async (event: MessageEvent) => {
            const trustedOrigin = new URL(clientWebsiteUrl).origin;
            if (event.origin !== trustedOrigin) return;

            const { type, payload } = event.data || {};

            switch (type) {
                case "reviewData":
                    if (!isSaving) return;
                    try {
                        const reviewPayload = {
                            ...payload,
                            iframeWidth: iframeWidth, 
                        };

                        const res = await fetch("/api/reviews", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(reviewPayload),
                        });
                        const result = await res.json();
                        onReviewSaved?.(result);
                        onClose();
                    } catch (e) {
                        console.error("Error saving review:", e);
                    } finally {
                        setIsSaving(false);
                    }
                    break;
                case "rectanglesUpdated":
                    setRectangles(payload.rectangles || []);
                    break;
                case "drawingModeChanged":
                    setIsDrawingMode(payload.enabled);
                    break;
                case "reviewError":
                    console.error("Error from iframe:", payload);
                    setIsSaving(false);
                    break;
                case "reviewModeExited":
                    setIsSaving(false);
                    onClose();
                    break;
            }
        },
        [clientWebsiteUrl, isSaving, onReviewSaved, onClose, iframeWidth]
    );

    useEffect(() => {
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [handleMessage]);

    useEffect(() => {
        if (initialRectangles.length > 0) {
            setRectangles(initialRectangles);

            setTimeout(() => {
                sendMessageToIframe({
                    type: "loadInitialRectangles",
                    payload: { rectangles: initialRectangles },
                });
            }, 800);
        }
    }, [initialRectangles, sendMessageToIframe]);

    return (
        <div className="w-80 bg-gray-50 border-l overflow-y-auto">
            <div className="p-4 space-y-4">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Narzędzia</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            onClick={handleSwitchDrawingMode}
                            variant={isDrawingMode ? "default" : "outline"}
                            className={`w-full justify-start ${
                                isDrawingMode
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "bg-transparent"
                            }`}
                            disabled={isSaving}
                        >
                            <Pencil className="w-4 h-4 mr-2" />
                            {isDrawingMode
                                ? "Zaznaczanie WŁĄCZONE"
                                : "Włącz/Wyłącz zaznaczanie"}
                        </Button>

                        <Button
                            onClick={handleUndo}
                            variant="outline"
                            className="w-full justify-start bg-transparent"
                            disabled={isSaving || rectangles.length === 0}
                        >
                            <Undo className="w-4 h-4 mr-2" />
                            Cofnij zmianę
                        </Button>

                        <Button
                            onClick={handleCaptureReview}
                            disabled={isSaving}
                            className="w-full justify-start"
                            variant={isSaving ? "secondary" : "default"}
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            {isSaving ? "Zapisywanie..." : "Zapisz i wyjdź"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Uwagi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-100 overflow-y-auto">
                        {rectangles.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                                Brak uwag. Włącz tryb rysowania, zaznacz co
                                chciałbyś zmienić i napisz na co.
                            </p>
                        ) : (
                            rectangles.map((r) => (
                                <RectangleComment
                                    key={r.id}
                                    rect={r}
                                    isEditing={editingRectangleId === r.id}
                                    onEditStart={handleEditStart}
                                    onEditCancel={handleEditCancel}
                                    onEditSubmit={handleEditSubmit}
                                    onDelete={handleDelete}
                                    onFocus={handleFocus}
                                />
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
