<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShipmentException;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExceptionController extends Controller
{
    /**
     * Driver reports a shipment exception/issue.
     */
    public function reportIssue(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shipment_id' => 'required|exists:shipments,id',
            'issue_type' => 'required|in:driver_unavailable,capacity_exceeded,pickup_failed,recipient_unavailable,route_problem,shipment_damaged,delivery_failed',
            'description' => 'required|string|min:5|max:1000',
        ]);

        $driver = $request->user();

        $exception = ShipmentException::create([
            'shipment_id' => $validated['shipment_id'],
            'driver_id' => $driver->id,
            'issue_type' => $validated['issue_type'],
            'description' => $validated['description'],
            'status' => 'reported',
        ]);

        // Notify Admins
        NotificationService::notifyAdmins(
            'issue_reported',
            '⚠️ Driver Issue Reported',
            "Driver {$driver->name} reported an issue: {$validated['issue_type']} - {$validated['description']}",
            $validated['shipment_id']
        );

        AuditLogService::log(
            'issue_reported',
            'ShipmentException',
            $exception->id,
            ['issue_type' => $validated['issue_type'], 'shipment_id' => $validated['shipment_id']],
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'Issue reported to operations admin.',
            'data' => $exception,
        ]);
    }

    /**
     * Admin: List all reported shipment exceptions.
     */
    public function index(Request $request): JsonResponse
    {
        $exceptions = ShipmentException::with(['shipment', 'driver', 'resolver'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $exceptions,
        ]);
    }

    /**
     * Admin: Resolve a shipment exception.
     */
    public function resolve(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'resolution_note' => 'required|string|min:5|max:1000',
        ]);

        $exception = ShipmentException::findOrFail($id);
        $admin = $request->user();

        $exception->update([
            'status' => 'resolved',
            'resolved_by' => $admin->id,
            'resolution_note' => $validated['resolution_note'],
        ]);

        AuditLogService::log(
            'issue_resolved',
            'ShipmentException',
            $exception->id,
            ['resolution_note' => $validated['resolution_note']],
            $request
        );

        return response()->json([
            'success' => true,
            'message' => 'Issue marked as resolved.',
            'data' => $exception->fresh(['shipment', 'driver', 'resolver']),
        ]);
    }
}
