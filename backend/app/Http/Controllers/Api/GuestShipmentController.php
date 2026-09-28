<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GuestShipmentController extends Controller
{
    /**
     * Handle unauthenticated guest shipment creation.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'sender_name' => 'required|string|max:255',
            'sender_phone' => 'required|string|max:50',
            'sender_email' => 'nullable|email|max:255',
            'sender_country' => 'required|string|max:100',
            'sender_city' => 'required|string|max:100',
            'sender_address' => 'required|string',
            'sender_latitude' => 'nullable|numeric',
            'sender_longitude' => 'nullable|numeric',

            'recipient_name' => 'required|string|max:255',
            'recipient_phone' => 'required|string|max:50',
            'recipient_country' => 'required|string|max:100',
            'recipient_city' => 'required|string|max:100',
            'recipient_address' => 'required|string',
            'recipient_latitude' => 'nullable|numeric',
            'recipient_longitude' => 'nullable|numeric',

            'package_type' => 'required|string|in:box,document,pallet,fragile,heavy,parcel',
            'description' => 'nullable|string',
            'number_of_packages' => 'required|integer|min:1',
            'weight_kg' => 'required|numeric|min:0.1',
            'volume_m3' => 'nullable|numeric|min:0',
            'is_fragile' => 'nullable|boolean',
            'pickup_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $trackingNumber = 'TRK-' . date('Ymd') . '-' . strtoupper(Str::random(5));

        $weight = (float)$validated['weight_kg'];
        $packages = (int)$validated['number_of_packages'];
        $isFragile = !empty($validated['is_fragile']);

        $basePrice = 15.0;
        $weightFee = $weight * 3.5;
        $packageFee = ($packages - 1) * 5.0;
        $fragileFee = $isFragile ? 12.0 : 0.0;

        $price = round($basePrice + $weightFee + $packageFee + $fragileFee, 2);

        $shipment = Shipment::create([
            'tracking_number' => $trackingNumber,
            'sender_id' => null, // Guest Order

            'sender_name' => $validated['sender_name'],
            'sender_phone' => $validated['sender_phone'],
            'sender_email' => $validated['sender_email'] ?? null,
            'sender_country' => $validated['sender_country'],
            'sender_city' => $validated['sender_city'],
            'sender_address' => $validated['sender_address'],
            'sender_latitude' => $validated['sender_latitude'] ?? null,
            'sender_longitude' => $validated['sender_longitude'] ?? null,

            'recipient_name' => $validated['recipient_name'],
            'recipient_phone' => $validated['recipient_phone'],
            'recipient_country' => $validated['recipient_country'],
            'recipient_city' => $validated['recipient_city'],
            'recipient_address' => $validated['recipient_address'],
            'recipient_latitude' => $validated['recipient_latitude'] ?? null,
            'recipient_longitude' => $validated['recipient_longitude'] ?? null,

            'package_type' => $validated['package_type'],
            'description' => $validated['description'] ?? null,
            'number_of_packages' => $validated['number_of_packages'],
            'weight_kg' => $validated['weight_kg'],
            'volume_m3' => $validated['volume_m3'] ?? null,
            'is_fragile' => $isFragile,
            'pickup_date' => $validated['pickup_date'] ?? null,
            'delivery_date' => $validated['delivery_date'] ?? null,

            'price' => $price,
            'status' => 'pending',
            'payment_method' => 'pay_on_pickup',
            'payment_status' => 'unpaid',
            'currency' => 'EUR',
            'notes' => $validated['notes'] ?? null,
        ]);

        // Timeline log for guest order creation
        ShipmentLog::create([
            'shipment_id' => $shipment->id,
            'previous_status' => null,
            'new_status' => 'pending',
            'actor_id' => null,
            'actor_role' => 'guest',
            'comment' => 'Guest shipment order registered.',
            'latitude' => $validated['sender_latitude'] ?? null,
            'longitude' => $validated['sender_longitude'] ?? null,
        ]);

        return response()->json([
            'message' => 'Guest shipment created successfully',
            'tracking_number' => $trackingNumber,
            'payment_method' => 'pay_on_pickup',
            'payment_status' => 'unpaid',
            'status' => 'pending',
            'shipment' => $shipment,
        ], 201);
    }
}
