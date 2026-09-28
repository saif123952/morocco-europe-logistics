<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Services\AuditLogService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    protected PaymentService $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * Driver confirms cash payment collection on pickup.
     */
    public function driverConfirmPayment(Request $request, int $id): JsonResponse
    {
        $driver = $request->user();
        $note = $request->input('notes');

        $shipment = $this->paymentService->confirmPayment($driver, $id, $note);

        return response()->json([
            'success' => true,
            'message' => "Payment of {$shipment->currency} {$shipment->price} confirmed received by driver.",
            'data' => $shipment,
        ]);
    }

    /**
     * Fetch printable invoice dataset.
     */
    public function getInvoice(Request $request, int $id): JsonResponse
    {
        $shipment = Shipment::findOrFail($id);
        $user = $request->user();

        // Security ownership check
        if ($user->isClient() && $shipment->sender_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized invoice access.'], 403);
        }

        $invoiceData = $this->paymentService->generateInvoiceData($id);

        return response()->json([
            'success' => true,
            'data' => $invoiceData,
        ]);
    }

    /**
     * Admin: Manual payment status update / override.
     */
    public function adminUpdatePaymentStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_status' => 'required|in:unpaid,paid,payment_failed,refunded',
            'notes' => 'nullable|string',
        ]);

        $shipment = Shipment::findOrFail($id);
        $prevStatus = $shipment->payment_status;

        $shipment->update([
            'payment_status' => $validated['payment_status'],
            'paid_at' => $validated['payment_status'] === 'paid' ? now() : null,
            'payment_notes' => $validated['notes'] ?? "Payment status updated to {$validated['payment_status']} by admin.",
        ]);

        AuditLogService::log(
            'payment_status_updated',
            'Shipment',
            $shipment->id,
            ['previous_payment_status' => $prevStatus, 'new_payment_status' => $validated['payment_status']],
            $request
        );

        return response()->json([
            'success' => true,
            'message' => "Payment status updated to {$validated['payment_status']}",
            'data' => $shipment->fresh(['sender', 'driver', 'collector']),
        ]);
    }
}
