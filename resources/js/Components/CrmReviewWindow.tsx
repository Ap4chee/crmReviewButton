"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/Components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { X, Eye, Pencil, Camera, Undo, Trash2, Edit3 } from "lucide-react";
import axios from "axios";

interface Rectangle {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    comment: string;
    index: number;
}

interface CrmReviewModalProps {
    clientWebsiteUrl?: string;
    onReviewSaved?: (data: any) => void;
}

export default function CrmReviewModal({
    clientWebsiteUrl = "",
    onReviewSaved,
}: CrmReviewModalProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [iframeSrc, setIframeSrc] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [rectangles, setRectangles] = useState<Rectangle[]>([]);
    const [editingRectangle, setEditingRectangle] = useState<string | null>(
        null
    );
    const [loadedInitialReviews, setLoadedInitialReviews] = useState(false);
    const isSavingRef = useRef(false);
    const onReviewSavedRef = useRef(onReviewSaved);
    const clientWebsiteUrlRef = useRef(clientWebsiteUrl);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const initialRectanglesRef = useRef<Rectangle[]>([]);

    useEffect(() => {
        onReviewSavedRef.current = onReviewSaved;
    }, [onReviewSaved]);

    useEffect(() => {
        clientWebsiteUrlRef.current = clientWebsiteUrl;
    }, [clientWebsiteUrl]);

    const resetSavingState = useCallback(() => {
        setIsSaving(false);
        isSavingRef.current = false;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const sendMessageToIframe = useCallback(
        (message: any) => {
            if (iframeRef.current?.contentWindow && clientWebsiteUrl) {
                iframeRef.current.contentWindow.postMessage(message, "*");
            }
        },
        [clientWebsiteUrl]
    );

    const handleMessage = useCallback(
        async (event: MessageEvent) => {
            const currentClientUrl = clientWebsiteUrlRef.current;

            if (!currentClientUrl) return;

            const trustedOrigin = new URL(currentClientUrl).origin;
            if (event.origin !== trustedOrigin) {
                console.warn("Untrusted origin:", event.origin);
                return;
            }

            if (event.data?.type === "reviewData") {
                if (isSavingRef.current === false) {
                    console.warn(
                        "Ignoring reviewData event - not in saving state"
                    );
                    return;
                }

                console.log("Review data received from iframe");

                try {
                    const response = await axios.post(
                        "/api/reviews",
                        event.data.payload
                    );

                    const result = response.data;
                    console.log("Review saved successfully");
                    onReviewSavedRef.current?.(result);
                } catch (error) {
                    console.error("Network or API error saving review:", error);
                } finally {
                    resetSavingState();
                    handleCloseModal();
                }
            } else if (event.data?.type === "rectanglesUpdated") {
                setRectangles(event.data.payload.rectangles || []);
            } else if (event.data?.type === "drawingModeChanged") {
                setIsDrawingMode(event.data.payload.enabled);
            } else if (event.data?.type === "reviewError") {
                console.error("Error from iframe:", event.data.payload);
                resetSavingState();
            } else if (event.data?.type === "reviewModeExited") {
                console.log("Review mode exited on client website.");
                resetSavingState();
                handleCloseModal();
            }
        },
        [resetSavingState]
    );

    useEffect(() => {
        window.addEventListener("message", handleMessage);
        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [handleMessage]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isModalOpen) handleCloseModal();
        };

        if (isModalOpen) {
            document.addEventListener("keydown", handleEscape);
            document.body.style.overflow = "hidden";
        }

        return () => {
            document.removeEventListener("keydown", handleEscape);
            document.body.style.overflow = "unset";
        };
    }, [isModalOpen]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleOpenModal = () => {
        if (!clientWebsiteUrl) return;

        const url = new URL(clientWebsiteUrl);
        url.searchParams.set("review_mode", "true");

        setIframeSrc(url.toString());
        setIsModalOpen(true);
        setIsDrawingMode(false);
        resetSavingState();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setIframeSrc("");
        setRectangles([]);
        setIsDrawingMode(false);
        setEditingRectangle(null);
        setLoadedInitialReviews(false);
        initialRectanglesRef.current = [];
        resetSavingState();
    };

    const handleSwitchDrawingMode = () => {
        sendMessageToIframe({ type: "switchMode" });
    };

    const handleCaptureReview = () => {
        if (!iframeRef.current?.contentWindow || !clientWebsiteUrl) return;

        if (isSavingRef.current || isSaving) {
            console.warn("Capture already in progress, ignoring request");
            return;
        }

        console.log("Requesting review generation from iframe...");

        setIsSaving(true);
        isSavingRef.current = true;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        sendMessageToIframe({ type: "triggerSaveReview" });

        timeoutRef.current = setTimeout(() => {
            if (isSavingRef.current) {
                console.warn("no response from iframe");
                resetSavingState();
            }
        }, 15000);
    };

    const handleDeleteRectangle = (id: string) => {
        sendMessageToIframe({ type: "deleteRectangle", payload: { id } });
    };

    const handleUpdateRectangleComment = (id: string, comment: string) => {
        sendMessageToIframe({
            type: "updateRectangleComment",
            payload: { id, comment },
        });
        setEditingRectangle(null);
    };

    const handleIframeLoad = useCallback(() => {
        console.log("Iframe loaded, sending initial rectangles if available");

        if (!loadedInitialReviews) {
            axios
                .get("/api/reviews/latest", {
                    params: { pageUrl: clientWebsiteUrlRef.current },
                })
                .then((response) => {
                    console.log("📋 Fetched previous reviews:", response.data);
                    const loadedRectangles = response.data.rectangles || [];

                    setRectangles(loadedRectangles);
                    initialRectanglesRef.current = loadedRectangles;
                    setLoadedInitialReviews(true);
                    setTimeout(() => {
                        if (initialRectanglesRef.current.length > 0) {
                            console.log(
                                "📤 Sending",
                                initialRectanglesRef.current.length,
                                "initial rectangles to iframe"
                            );
                            sendMessageToIframe({
                                type: "loadInitialRectangles",
                                payload: { rectangles: initialRectanglesRef.current },
                            });
                        }
                    }, 800);
                })
                .catch((error) => {
                    console.warn("⚠️ Could not load previous reviews:", error);
                });
        }
    }, [clientWebsiteUrlRef, loadedInitialReviews, sendMessageToIframe]);

    return (
        <>
            {/* Przycisk mozna zmienic na cos innego co otwieraloby modal */}
            <Button
                onClick={handleOpenModal}
                disabled={!clientWebsiteUrl}
                className="flex items-center gap-2"
            >
                <Eye className="w-4 h-4" />
                Podgląd
            </Button>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* mozna zmienic wylaczanie przy kliknieciu tla bo ktos moze sobie usunac przypadkiem co zaznaczyl? */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={handleCloseModal}
                    />
                    <div className="relative w-[95vw] h-[90vh] bg-white rounded-lg shadow-2xl flex overflow-hidden">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCloseModal}
                            className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 relative bg-gray-100">
                            {/* nie wiem jak to jest z cookies i innymi tego typu rzeczami w iframe, zakladam ze nie beda dzialac jakies logowania i bedzie wykrywane to ze to jest w iframe */}
                            {iframeSrc ? (
                                <iframe
                                    ref={iframeRef}
                                    src={iframeSrc}
                                    className="w-full h-full border-0"
                                    title="Website Review"
                                    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
                                    onLoad={handleIframeLoad}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-500">Ładowanie...</p>
                                </div>
                            )}
                        </div>
                        <div className="w-80 bg-gray-50 border-l overflow-y-auto">
                            <div className="p-4 space-y-4">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">
                                            Narzędzia
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <Button
                                            onClick={handleSwitchDrawingMode}
                                            variant={
                                                isDrawingMode
                                                    ? "default"
                                                    : "outline"
                                            }
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
                                            onClick={() =>
                                                sendMessageToIframe({
                                                    type: "undoLast",
                                                })
                                            }
                                            variant="outline"
                                            className="w-full justify-start bg-transparent"
                                            disabled={
                                                isSaving ||
                                                rectangles.length === 0
                                            }
                                        >
                                            <Undo className="w-4 h-4 mr-2" />
                                            Cofnij zmianę
                                        </Button>
                                        <Button
                                            onClick={handleCaptureReview}
                                            disabled={isSaving}
                                            className="w-full justify-start"
                                            variant={
                                                isSaving
                                                    ? "secondary"
                                                    : "default"
                                            }
                                        >
                                            <Camera className="w-4 h-4 mr-2" />
                                            {isSaving
                                                ? "Zapisywanie..."
                                                : "Zapisz i wyjdź"}
                                        </Button>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">
                                            Uwagi
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 max-h-100 overflow-y-auto">
                                        {rectangles.length === 0 ? (
                                            <p className="text-sm text-gray-500 text-center py-4">
                                                Brak uwag. Włącz tryb rysowania,
                                                zaznacz co chciałbyś zmienić i
                                                napisz na co.
                                            </p>
                                        ) : (
                                            rectangles.map((rect) => (
                                                <div
                                                    key={rect.id}
                                                    className="border rounded-lg p-3 bg-white"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium">
                                                            #{rect.index}
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() =>
                                                                handleDeleteRectangle(
                                                                    rect.id
                                                                )
                                                            }
                                                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>

                                                    {editingRectangle ===
                                                    rect.id ? (
                                                        <div className="space-y-2">
                                                            <Input
                                                                defaultValue={
                                                                    rect.comment
                                                                }
                                                                placeholder="Dodaj komentarz..."
                                                                className="text-xs"
                                                                onKeyDown={(
                                                                    e
                                                                ) => {
                                                                    if (
                                                                        e.key ===
                                                                        "Enter"
                                                                    ) {
                                                                        handleUpdateRectangleComment(
                                                                            rect.id,
                                                                            e
                                                                                .currentTarget
                                                                                .value
                                                                        );
                                                                    } else if (
                                                                        e.key ===
                                                                        "Escape"
                                                                    ) {
                                                                        setEditingRectangle(
                                                                            null
                                                                        );
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    handleUpdateRectangleComment(
                                                                        rect.id,
                                                                        e.target
                                                                            .value
                                                                    );
                                                                }}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div
                                                            className="text-xs text-gray-600 cursor-pointer hover:bg-gray-50 p-1 rounded min-h-[20px]"
                                                            onClick={() => {
                                                                setEditingRectangle(
                                                                    rect.id
                                                                );
                                                                sendMessageToIframe(
                                                                    {
                                                                        type: "focusRectangle",
                                                                        payload:
                                                                            {
                                                                                id: rect.id,
                                                                            },
                                                                    }
                                                                );
                                                            }}
                                                        >
                                                            {rect.comment || (
                                                                <span className="text-gray-400 italic">
                                                                    Dodaj
                                                                    komentarz...
                                                                </span>
                                                            )}
                                                            <Edit3 className="w-3 h-3 inline ml-1 opacity-50" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
