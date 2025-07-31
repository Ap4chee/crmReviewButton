import { X } from "lucide-react";
import ReviewSidebar from "@/Components/Review/ReviewSidebar";

export default function ReviewModal({
  iframeSrc,
  onClose,
  onIframeLoad,
  initialWidth,
  clientWebsiteUrl,
  onReviewSaved,
  initialRectangles,
}: {
  iframeSrc: string;
  onClose: () => void;
  onIframeLoad?: () => void;
  initialWidth: number;
  clientWebsiteUrl: string;
  onReviewSaved?: (data: any) => void;
  initialRectangles: {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    comment: string;
    index: number;
  }[];
}) {

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-[95vw] h-[90vh] bg-white rounded-lg shadow-2xl flex overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white rounded-full p-1"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex-1 relative bg-gray-100 overflow-x-auto">
                    <div
                        className="h-full"
                        style={{
                            minWidth:
                                initialWidth > 0 ? `${initialWidth}px` : "100%",
                            width: "100%",
                        }}
                    >
                        {iframeSrc ? (
                            <iframe
                                src={iframeSrc}
                                className="w-full h-full border-0"
                                title="Website Review"
                                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
                                onLoad={onIframeLoad}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500">Ładowanie...</p>
                            </div>
                        )}
                    </div>
                </div>

                <ReviewSidebar
                    clientWebsiteUrl={clientWebsiteUrl}
                    onReviewSaved={onReviewSaved}
                    onClose={onClose}
                    initialRectangles={initialRectangles}
                />
            </div>
        </div>
    );
}
