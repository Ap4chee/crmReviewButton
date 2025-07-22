<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_website',
        'screenshot_path',
        'rectangles',
    ];

    protected $casts = [
        'rectangles' => 'array', 
    ];
}
