<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Models\Review;

Route::post('/reviews', function (Request $request) {
    $validated = $request->validate([
        'screenshotBase64' => 'required|string',
        'rectangles' => 'nullable|array',
        'pageUrl' => 'required|string',
        'timestamp' => 'required|date',
        'iframeWidth' => 'nullable|integer',
    ]);


    $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $validated['screenshotBase64']));
    $filename = 'reviews/screenshot_'.uniqid().'.png';
    Storage::disk('public')->put($filename, $imageData);

        $review = Review::create([
        'client_website' => $validated['pageUrl'],
        'screenshot_path' => Storage::url($filename),
        'rectangles' => $validated['rectangles'] ?? [],
        'iframe_width' => $validated['iframeWidth'] ?? null, 
    ]);

    return response()->json([
        'message' => 'Review saved successfully!',
        'review' => $review
    ]);
});

Route::get('/reviews/latest', function (Request $request) {
    $validated = $request->validate([
        'pageUrl' => 'required|url',
    ]);

    $searchUrl = $validated['pageUrl'];
    
    $parsedSearchUrl = parse_url($searchUrl);
    $baseSearchUrl = $parsedSearchUrl['scheme'] . '://' . $parsedSearchUrl['host'];
    if (!empty($parsedSearchUrl['path'])) {
        $baseSearchUrl .= $parsedSearchUrl['path'];
    }
    
    \Log::info('Searching for reviews with base URL: ' . $baseSearchUrl);
    
    $allReviews = Review::all();
    
    $matchingReviews = $allReviews->filter(function($review) use ($baseSearchUrl) {
        $parsedReviewUrl = parse_url($review->client_website);
        $baseReviewUrl = $parsedReviewUrl['scheme'] . '://' . $parsedReviewUrl['host'];
        if (!empty($parsedReviewUrl['path'])) {
            $baseReviewUrl .= $parsedReviewUrl['path'];
        }
        
        return $baseReviewUrl === $baseSearchUrl;
    });
    
    \Log::info('Found ' . $matchingReviews->count() . ' matching reviews');
    
    $review = $matchingReviews->sortByDesc('created_at')->first();
    
    if (!$review) {
        return response()->json([
            'message' => 'No reviews found for this URL',
            'rectangles' => []
        ]);
    }
    
    \Log::info('Found review with ' . count($review->rectangles) . ' rectangles');
    
    return response()->json([
        'message' => 'Latest review found',
        'id' => $review->id,
        'rectangles' => $review->rectangles,
        'screenshot_path' => $review->screenshot_path,
        'iframeWidth' => $review->iframe_width, 
    ]);
});
