<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;

class AnalyticsController extends Controller
{
    protected AnalyticsService $analyticsService;

    public function __construct(AnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Admin Analytics Endpoint.
     */
    public function index(): JsonResponse
    {
        $metrics = $this->analyticsService->getAdminMetrics();

        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }
}
