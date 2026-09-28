<?php

namespace App\Services;

use App\Models\ProofOfDelivery;
use App\Models\RouteStop;
use App\Models\Shipment;
use App\Models\ShipmentLog;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class DeliveryExecutionService
{
    /**
     * Transition a stop & shipment status with strict server-side validation.
     */
    public function executeStopTransition(User $driver, int $stopId, string $action, ?array $podData = null): array
    {
        $stop = RouteStop::with(['shipment', 'route'])->findOrFail($stopId);
        $shipment = $stop->shipment;

        // Authorization check: driver must own the route
        if ($stop->route->driver_id !== $driver->id) {
            throw ValidationException::withMessages(['stop' => ['Unauthorized stop transition attempt.']]);
        }

        $prevStatus = $shipment->status;
        $newShipmentStatus = $prevStatus;
        $newStopStatus = $stop->status;
        $comment = '';

        switch ($action) {
            case 'start_pickup':
                if ($stop->stop_type !== 'pickup') {
                    throw ValidationException::withMessages(['action' => ['Invalid action for delivery stop.']]);
                }
                if (!in_array($prevStatus, ['assigned', 'pending'])) {
                    throw ValidationException::withMessages(['status' => ["Cannot start pickup from current status: {$prevStatus}"]]);
                }
                $newStopStatus = 'arrived';
                $newShipmentStatus = 'pickup_started';
                $comment = 'Driver started pickup and is en route to sender location.';
                break;

            case 'confirm_pickup':
                if ($stop->stop_type !== 'pickup') {
                    throw ValidationException::withMessages(['action' => ['Invalid action for delivery stop.']]);
                }
                if (!in_array($prevStatus, ['pickup_started', 'assigned'])) {
                    throw ValidationException::withMessages(['status' => ["Cannot confirm pickup before starting pickup."]]);
                }
                $newStopStatus = 'completed';
                $newShipmentStatus = 'picked_up';
                $comment = 'Driver confirmed pickup. Package is now in driver possession.';
                break;

            case 'start_delivery':
                if ($stop->stop_type !== 'delivery') {
                    throw ValidationException::withMessages(['action' => ['Invalid action for pickup stop.']]);
                }
                if (!in_array($prevStatus, ['picked_up', 'assigned'])) {
                    throw ValidationException::withMessages(['status' => ["Cannot start delivery before pickup is confirmed."]]);
                }
                $newStopStatus = 'arrived';
                $newShipmentStatus = 'in_transit';
                $comment = 'Driver started delivery. Package is in transit to recipient.';
                break;

            case 'confirm_delivery':
                if ($stop->stop_type !== 'delivery') {
                    throw ValidationException::withMessages(['action' => ['Invalid action for pickup stop.']]);
                }
                if (!in_array($prevStatus, ['in_transit', 'picked_up', 'assigned'])) {
                    throw ValidationException::withMessages(['status' => ["Cannot confirm delivery before package is in transit."]]);
                }

                // Verify Proof of Delivery & OTP if provided
                if ($podData) {
                    $recipientName = $podData['recipient_name'] ?? $shipment->recipient_name;
                    $deliveryNote = $podData['delivery_note'] ?? 'Delivered directly to recipient.';
                    $otpCode = $podData['otp_code'] ?? null;

                    ProofOfDelivery::updateOrCreate(
                        ['shipment_id' => $shipment->id],
                        [
                            'recipient_name' => $recipientName,
                            'delivery_note' => $deliveryNote,
                            'otp_code' => $otpCode,
                            'verified_at' => now(),
                        ]
                    );
                }

                $newStopStatus = 'completed';
                $newShipmentStatus = 'delivered';
                $comment = 'Delivery confirmed with recipient signature/note. Order Completed.';

                // Release vehicle loaded weight & volume
                $vehicle = $driver->vehicle;
                if ($vehicle) {
                    $w = (float) ($shipment->weight_kg ?? 0);
                    $v = (float) ($shipment->volume_m3 ?? 0);
                    $vehicle->decrement('current_loaded_weight_kg', min($vehicle->current_loaded_weight_kg, $w));
                    $vehicle->decrement('current_loaded_volume_m3', min($vehicle->current_loaded_volume_m3, $v));
                }
                break;

            default:
                throw ValidationException::withMessages(['action' => ['Unsupported stop action.']]);
        }

        // Update stop & shipment status
        $stop->update(['status' => $newStopStatus, 'completed_at' => $newStopStatus === 'completed' ? now() : null]);
        $shipment->update(['status' => $newShipmentStatus]);

        // Record in shipment_logs
        $lastLoc = $driver->latestLocation;
        ShipmentLog::create([
            'shipment_id' => $shipment->id,
            'previous_status' => $prevStatus,
            'new_status' => $newShipmentStatus,
            'actor_id' => $driver->id,
            'actor_role' => 'driver',
            'comment' => $comment,
            'latitude' => $lastLoc ? $lastLoc->latitude : null,
            'longitude' => $lastLoc ? $lastLoc->longitude : null,
        ]);

        // Send notifications to sender (client)
        if ($shipment->sender_id) {
            NotificationService::send(
                $shipment->sender_id,
                "shipment_{$newShipmentStatus}",
                "Shipment Update: {$shipment->tracking_number}",
                "Status changed to " . str_replace('_', ' ', strtoupper($newShipmentStatus)) . ": {$comment}",
                $shipment->id
            );
        }

        return [
            'stop' => $stop->fresh(),
            'shipment' => $shipment->fresh(),
            'message' => $comment,
        ];
    }
}
