<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReviewRequest;
use App\Http\Requests\LatestReviewRequest;
use App\Models\Review;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ReviewController extends Controller
{
    public function store(StoreReviewRequest $request)
    {
        $validated = $request->validated();

        $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $validated['screenshotBase64']));
        $filename = 'reviews/screenshot_' . uniqid() . '.png';
        Storage::disk('public')->put($filename, $imageData);

        $review = Review::create([
            'client_website' => $validated['pageUrl'],
            'screenshot_path' => Storage::url($filename),
            'rectangles' => $validated['rectangles'] ?? [],
            'iframe_width' => $validated['iframeWidth'] ?? null,
        ]);

        return response()->json([
            'message' => 'Review saved successfully!',
            'review' => $review,
        ]);
    }

    public function latest(LatestReviewRequest $request)
    {
        $searchUrl = $request->validated()['pageUrl'];
        $baseSearchUrl = $this->canonicalUrl($searchUrl);

        Log::info('Searching for reviews with base URL: ' . $baseSearchUrl);

        $review = Review::all()
            ->filter(function ($review) use ($baseSearchUrl) {
                return $this->canonicalUrl($review->client_website) === $baseSearchUrl;
            })
            ->sortByDesc('created_at')
            ->first();

        if (!$review) {
            return response()->json([
                'message' => 'No reviews found for this URL',
                'rectangles' => [],
            ]);
        }

        Log::info('Found review with ' . count($review->rectangles) . ' rectangles');

        return response()->json([
            'message' => 'Latest review found',
            'id' => $review->id,
            'rectangles' => $review->rectangles,
            'screenshot_path' => $review->screenshot_path,
            'iframeWidth' => $review->iframe_width,
        ]);
    }

    private function canonicalUrl(string $url): string
    {
        $p = parse_url($url);
        $base = ($p['scheme'] ?? 'http') . '://' . ($p['host'] ?? '');
        if (!empty($p['path'])) {
            $base .= $p['path'];
        }
        return rtrim($base, '/');
    }
}
