<?php

namespace App\Services;

use App\Helpers\GeoHelper;
use App\Models\Shipment;
use App\Models\ShipmentLog;

class TrackingService
{
    /**
     * Build rich tracking payload including timeline, live driver position (with privacy rules), and ETA.
     */
    public function getTrackingData(string $trackingNumber): ?array
    {
        $shipment = Shipment::where('tracking_number', $trackingNumber)
            ->with(['sender', 'driver.vehicle', 'driver.latestLocation', 'routeStops'])
            ->first();

        if (!$shipment) {
            return null;
        }

        // Fetch shipment timeline logs
        $logs = ShipmentLog::where('shipment_id', $shipment->id)
            ->with('actor:id,name,role')
            ->orderBy('created_at', 'asc')
            ->get();

        // If logs are empty, synthesize initial log entry
        if ($logs->isEmpty()) {
            $logs = collect([
                [
                    'previous_status' => null,
                    'new_status' => 'pending',
                    'actor' => ['name' => $shipment->sender_name, 'role' => 'client'],
                    'comment' => 'Shipment created and registered in system.',
                    'created_at' => $shipment->created_at,
                ]
            ]);
        }

        // Privacy-masked driver location logic
        $driverLocation = null;
        if ($shipment->driver && in_array($shipment->status, ['assigned', 'pickup_started', 'picked_up', 'in_transit'])) {
            $lastLoc = $shipment->driver->latestLocation;
            if ($lastLoc) {
                // Apply subtle privacy mask (rounds coordinates to ~500m precision) unless out for delivery
                $isOutForDelivery = ($shipment->status === 'in_transit');
                $driverLocation = [
                    'latitude' => $isOutForDelivery ? (float)$lastLoc->latitude : round((float)$lastLoc->latitude, 3),
                    'longitude' => $isOutForDelivery ? (float)$lastLoc->longitude : round((float)$lastLoc->longitude, 3),
                    'last_updated' => $lastLoc->recorded_at ? $lastLoc->recorded_at->toIso8601String() : null,
                    'is_approximate' => !$isOutForDelivery,
                ];
            }
        }

        // Step-by-step Timeline status pipeline mapping
        $pipelineSteps = [
            ['key' => 'pending', 'label' => 'Order Created', 'completed' => true],
            ['key' => 'assigned', 'label' => 'Driver Assigned', 'completed' => in_array($shipment->status, ['assigned', 'pickup_started', 'picked_up', 'in_transit', 'delivered'])],
            ['key' => 'pickup_started', 'label' => 'Pickup Started', 'completed' => in_array($shipment->status, ['pickup_started', 'picked_up', 'in_transit', 'delivered'])],
            ['key' => 'picked_up', 'label' => 'Package Picked Up', 'completed' => in_array($shipment->status, ['picked_up', 'in_transit', 'delivered'])],
            ['key' => 'in_transit', 'label' => 'Out For Delivery', 'completed' => in_array($shipment->status, ['in_transit', 'delivered'])],
            ['key' => 'delivered', 'label' => 'Delivered', 'completed' => $shipment->status === 'delivered'],
        ];

        // Compute route progress percentage
        $progressPct = 0;
        switch ($shipment->status) {
            case 'pending': $progressPct = 10; break;
            case 'assigned': $progressPct = 25; break;
            case 'pickup_started': $progressPct = 40; break;
            case 'picked_up': $progressPct = 60; break;
            case 'in_transit': $progressPct = 85; break;
            case 'delivered': $progressPct = 100; break;
            case 'cancelled': $progressPct = 0; break;
        }

        // Compute estimated remaining distance & ETA
        $estRemainingKm = null;
        $estRemainingMin = null;
        if ($driverLocation && $shipment->recipient_latitude && $shipment->recipient_longitude) {
            $estRemainingKm = GeoHelper::haversine(
                $driverLocation['latitude'], $driverLocation['longitude'],
                $shipment->recipient_latitude, $shipment->recipient_longitude
            );
            $estRemainingMin = (int) round(($estRemainingKm / max(1, config('matching.speed_kmh', 45))) * 60);
        }

        return [
            'shipment' => [
                'id' => $shipment->id,
                'tracking_number' => $shipment->tracking_number,
                'status' => $shipment->status,
                'package_type' => $shipment->package_type,
                'description' => $shipment->description,
                'number_of_packages' => $shipment->number_of_packages,
                'weight_kg' => $shipment->weight_kg,
                'volume_m3' => $shipment->volume_m3,
                'is_fragile' => $shipment->is_fragile,
                'price' => $shipment->price,
                'pickup_date' => $shipment->pickup_date,
                'delivery_date' => $shipment->delivery_date,
                'sender' => [
                    'name' => $shipment->sender_name,
                    'city' => $shipment->sender_city,
                    'address' => $shipment->sender_address,
                    'latitude' => $shipment->sender_latitude,
                    'longitude' => $shipment->sender_longitude,
                ],
                'recipient' => [
                    'name' => $shipment->recipient_name,
                    'city' => $shipment->recipient_city,
                    'address' => $shipment->recipient_address,
                    'latitude' => $shipment->recipient_latitude,
                    'longitude' => $shipment->recipient_longitude,
                ],
                'driver' => $shipment->driver ? [
                    'name' => $shipment->driver->name,
                    'phone' => $shipment->driver->phone,
                    'vehicle' => $shipment->driver->vehicle ? [
                        'vehicle_type' => $shipment->driver->vehicle->vehicle_type,
                        'registration_number' => $shipment->driver->vehicle->registration_number,
                    ] : null,
                ] : null,
            ],
            'driver_live_location' => $driverLocation,
            'progress_percentage' => $progressPct,
            'estimated_remaining_km' => $estRemainingKm,
            'estimated_remaining_min' => $estRemainingMin,
            'pipeline_steps' => $pipelineSteps,
            'timeline_history' => $logs,
        ];
    }
}
