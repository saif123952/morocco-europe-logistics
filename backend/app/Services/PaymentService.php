<?php

namespace App\Services;

use App\Models\Shipment;
use App\Models\ShipmentLog;
use App\Models\User;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    /**
     * Driver confirms cash payment collection on pickup.
     */
    public function confirmPayment(User $driver, int $shipmentId, ?string $note = null): Shipment
    {
        $shipment = Shipment::findOrFail($shipmentId);

        // Security check: only assigned driver can confirm payment
        if ($shipment->driver_id !== $driver->id) {
            throw ValidationException::withMessages([
                'payment' => ['Only the assigned driver can confirm cash payment collection.'],
            ]);
        }

        if ($shipment->payment_status === 'paid') {
            return $shipment;
        }

        $shipment->update([
            'payment_status' => 'paid',
            'paid_at' => now(),
            'collected_by_driver_id' => $driver->id,
            'payment_notes' => $note ?? 'Cash collected on pickup by driver.',
        ]);

        // Record timeline log
        ShipmentLog::create([
            'shipment_id' => $shipment->id,
            'previous_status' => $shipment->status,
            'new_status' => $shipment->status,
            'actor_id' => $driver->id,
            'actor_role' => 'driver',
            'comment' => "Cash payment of {$shipment->currency} {$shipment->price} confirmed received by driver {$driver->name}.",
        ]);

        // Notify Client
        if ($shipment->sender_id) {
            NotificationService::send(
                $shipment->sender_id,
                'payment_received',
                'Payment Received',
                "Driver {$driver->name} confirmed receipt of {$shipment->currency} {$shipment->price} cash payment for shipment {$shipment->tracking_number}.",
                $shipment->id
            );
        }

        return $shipment->fresh(['sender', 'driver', 'collector']);
    }

    /**
     * Compile structured invoice dataset for printable rendering.
     */
    public function generateInvoiceData(int $shipmentId): array
    {
        $shipment = Shipment::with(['sender', 'driver', 'collector'])->findOrFail($shipmentId);

        $weight = (float)$shipment->weight_kg;
        $packages = (int)$shipment->number_of_packages;
        $isFragile = (bool)$shipment->is_fragile;

        $basePrice = 15.0;
        $weightFee = round($weight * 3.5, 2);
        $packageFee = round(($packages - 1) * 5.0, 2);
        $fragileFee = $isFragile ? 12.0 : 0.0;
        $total = (float)$shipment->price;

        return [
            'invoice_number' => 'INV-' . date('Ymd', strtotime($shipment->created_at)) . '-' . $shipment->id,
            'created_at' => $shipment->created_at->format('Y-m-d H:i:s'),
            'shipment' => [
                'tracking_number' => $shipment->tracking_number,
                'package_type' => strtoupper($shipment->package_type),
                'number_of_packages' => $shipment->number_of_packages,
                'weight_kg' => $shipment->weight_kg,
                'description' => $shipment->description,
                'is_fragile' => $shipment->is_fragile,
            ],
            'sender' => [
                'name' => $shipment->sender_name,
                'phone' => $shipment->sender_phone,
                'country' => $shipment->sender_country,
                'city' => $shipment->sender_city,
                'address' => $shipment->sender_address,
            ],
            'recipient' => [
                'name' => $shipment->recipient_name,
                'phone' => $shipment->recipient_phone,
                'country' => $shipment->recipient_country,
                'city' => $shipment->recipient_city,
                'address' => $shipment->recipient_address,
            ],
            'payment' => [
                'method' => 'Pay on Pickup',
                'status' => strtoupper($shipment->payment_status),
                'is_paid' => $shipment->payment_status === 'paid',
                'currency' => $shipment->currency ?? 'EUR',
                'paid_at' => $shipment->paid_at ? $shipment->paid_at->format('Y-m-d H:i:s') : null,
                'collector' => $shipment->collector ? $shipment->collector->name : ($shipment->driver ? $shipment->driver->name : null),
                'notes' => $shipment->payment_notes,
            ],
            'breakdown' => [
                'base_transport_fee' => $basePrice,
                'weight_payload_fee' => $weightFee,
                'additional_packages_fee' => $packageFee,
                'fragile_handling_surcharge' => $fragileFee,
                'total_amount' => $total,
            ],
        ];
    }
}
