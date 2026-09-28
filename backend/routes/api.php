<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\ExceptionController;
use App\Http\Controllers\Api\GuestShipmentController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ShipmentController;
use App\Http\Controllers\Api\TrackingController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - Logistics Platform (Phases 1, 2, 3, 4 & 5 + Guest Checkout)
|--------------------------------------------------------------------------
*/

// Public Auth routes
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// Public Guest Shipment Creation (Rate-limited: 10 per min)
Route::post('/guest/shipments', [GuestShipmentController::class, 'store'])->middleware('throttle:10,1');

// Upgraded Public Live Tracking route
Route::get('/track/{tracking_number}', [TrackingController::class, 'show']);

// Protected routes (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);

    // Notifications API
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // Shipments API & Invoice
    Route::get('/shipments', [ShipmentController::class, 'index']);
    Route::post('/shipments', [ShipmentController::class, 'store']);
    Route::get('/shipments/{id}', [ShipmentController::class, 'show']);
    Route::patch('/shipments/{id}/status', [ShipmentController::class, 'updateStatus']);
    Route::get('/shipments/{id}/invoice', [PaymentController::class, 'getInvoice']);

    // Drivers list for Admin assignment
    Route::get('/drivers', function (Request $request) {
        return response()->json([
            'drivers' => User::where('role', 'driver')->with('vehicle')->select('id', 'name', 'email', 'phone', 'availability')->get()
        ]);
    });

    // Admin assign driver
    Route::patch('/shipments/{id}/assign-driver', [ShipmentController::class, 'assignDriver']);

    // Driver API Routes
    Route::prefix('driver')->group(function () {
        Route::get('/profile', [DriverController::class, 'getProfile']);
        Route::post('/vehicle', [DriverController::class, 'updateVehicle']);
        Route::patch('/availability', [DriverController::class, 'updateAvailability']);
        
        Route::post('/location', [DriverController::class, 'updateLocation']);
        Route::get('/location', [DriverController::class, 'getLocation']);

        Route::get('/shipments/nearby', [DriverController::class, 'getNearbyShipments']);
        Route::get('/shipments/recommended', [DriverController::class, 'getRecommendedShipments']);
        Route::post('/shipments/{id}/accept', [DriverController::class, 'acceptShipment']);
        Route::post('/shipments/{id}/reject', [DriverController::class, 'rejectShipment']);

        Route::get('/route', [DriverController::class, 'getRoute']);
        Route::post('/route/generate', [DriverController::class, 'generateRoute']);
        Route::patch('/route/stops/{id}/status', [DriverController::class, 'updateStopStatus']);

        // Cash Payment Collection on Pickup
        Route::post('/shipments/{id}/confirm-payment', [PaymentController::class, 'driverConfirmPayment']);

        // Issue Exception Reporting
        Route::post('/exceptions', [ExceptionController::class, 'reportIssue']);
    });

    // Admin Operations Suite & Payments
    Route::prefix('admin')->group(function () {
        Route::get('/drivers', [DriverController::class, 'getAdminDrivers']);
        Route::get('/map', [DriverController::class, 'getAdminMap']);
        Route::get('/analytics', [AnalyticsController::class, 'index']);
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/exceptions', [ExceptionController::class, 'index']);
        Route::patch('/exceptions/{id}/resolve', [ExceptionController::class, 'resolve']);
        Route::patch('/shipments/{id}/payment-status', [PaymentController::class, 'adminUpdatePaymentStatus']);
    });
});
