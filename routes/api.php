<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Models\Review;
use App\Http\Controllers\Api\ReviewController;

Route::post('/reviews', [ReviewController::class, 'store']);
Route::get('/reviews/latest', [ReviewController::class, 'latest']);
