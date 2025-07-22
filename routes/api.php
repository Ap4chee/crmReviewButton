<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Models\Review;

Route::post('/reviews', function (Request $request) {
    $validated = $request->validate([
        'screenshotBase64' => 'required|string',
        'rectangles' => 'nullable|array',
        'pageUrl' => 'required|url',
        'timestamp' => 'required|date',
    ]);


    $imageData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $validated['screenshotBase64']));
    $filename = 'reviews/screenshot_'.uniqid().'.png';
    Storage::disk('public')->put($filename, $imageData);

        $review = Review::create([
        'client_website' => $validated['pageUrl'],
        'screenshot_path' => Storage::url($filename),
        'rectangles' => $validated['rectangles'] ?? [],
    ]);

    return response()->json([
        'message' => 'Review saved successfully!',
        'review' => $review
    ]);
});
