<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'screenshotBase64' => 'required|string',
            'rectangles' => 'nullable|array',
            'pageUrl' => 'required|string',
            'timestamp' => 'required|date',
            'iframeWidth' => 'nullable|integer',
        ];
    }
}
