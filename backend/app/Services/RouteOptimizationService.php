<?php

namespace App\Services;

use App\Helpers\GeoHelper;
use App\Models\DeliveryRoute;
use App\Models\RouteStop;
use App\Models\Shipment;
use App\Models\User;

interface RouteOptimizerInterface
{
    public function optimizeRoute(User $driver, array $shipmentIds, float $startLat, float $startLng): DeliveryRoute;
}

class RouteOptimizationService implements RouteOptimizerInterface
{
    protected float $speedKmh;

    public function __construct()
    {
        $this->speedKmh = (float) config('matching.speed_kmh', 45);
    }

    /**
     * Optimize delivery route using nearest-neighbor heuristic.
     * Guarantees pickup stop occurs before delivery stop for every shipment.
     */
    public function optimizeRoute(User $driver, array $shipmentIds, float $startLat, float $startLng): DeliveryRoute
    {
        $shipments = Shipment::whereIn('id', $shipmentIds)->get();

        // Create or get active route for driver
        $route = DeliveryRoute::firstOrCreate(
            ['driver_id' => $driver->id, 'status' => 'active'],
            ['total_distance_km' => 0, 'estimated_duration_min' => 0]
        );

        // Clear existing pending stops for clean regeneration
        RouteStop::where('route_id', $route->id)->where('status', 'pending')->delete();

        // Build list of candidate stops to sequence
        $pendingPickups = [];
        $pendingDeliveries = [];

        foreach ($shipments as $shipment) {
            $pendingPickups[$shipment->id] = [
                'shipment_id' => $shipment->id,
                'stop_type' => 'pickup',
                'latitude' => (float) $shipment->sender_latitude,
                'longitude' => (float) $shipment->sender_longitude,
                'address' => $shipment->sender_address,
                'city' => $shipment->sender_city,
            ];

            $pendingDeliveries[$shipment->id] = [
                'shipment_id' => $shipment->id,
                'stop_type' => 'delivery',
                'latitude' => (float) $shipment->recipient_latitude,
                'longitude' => (float) $shipment->recipient_longitude,
                'address' => $shipment->recipient_address,
                'city' => $shipment->recipient_city,
            ];
        }

        $orderedStops = [];
        $currLat = $startLat;
        $currLng = $startLng;
        $totalDist = 0.0;
        $stopOrder = 1;

        $completedPickups = [];

        // Nearest-neighbor loop
        while (!empty($pendingPickups) || !empty($pendingDeliveries)) {
            $bestCandidate = null;
            $bestDist = 999999.0;
            $bestType = null;
            $bestShipmentId = null;

            // Check eligible pickups
            foreach ($pendingPickups as $shipmentId => $stopData) {
                $dist = GeoHelper::haversine($currLat, $currLng, $stopData['latitude'], $stopData['longitude']);
                if ($dist < $bestDist) {
                    $bestDist = $dist;
                    $bestCandidate = $stopData;
                    $bestType = 'pickup';
                    $bestShipmentId = $shipmentId;
                }
            }

            // Check eligible deliveries (only if pickup for that shipment is completed)
            foreach ($pendingDeliveries as $shipmentId => $stopData) {
                if (isset($completedPickups[$shipmentId])) {
                    $dist = GeoHelper::haversine($currLat, $currLng, $stopData['latitude'], $stopData['longitude']);
                    if ($dist < $bestDist) {
                        $bestDist = $dist;
                        $bestCandidate = $stopData;
                        $bestType = 'delivery';
                        $bestShipmentId = $shipmentId;
                    }
                }
            }

            if (!$bestCandidate) {
                break;
            }

            // Move current location to stop location
            $currLat = $bestCandidate['latitude'];
            $currLng = $bestCandidate['longitude'];
            $totalDist += $bestDist;

            // Save stop to database
            $stop = RouteStop::create([
                'route_id' => $route->id,
                'shipment_id' => $bestCandidate['shipment_id'],
                'stop_type' => $bestCandidate['stop_type'],
                'stop_order' => $stopOrder++,
                'latitude' => $bestCandidate['latitude'],
                'longitude' => $bestCandidate['longitude'],
                'address' => $bestCandidate['address'],
                'city' => $bestCandidate['city'],
                'status' => 'pending',
                'estimated_arrival' => now()->addMinutes((int) round(($totalDist / max(1, $this->speedKmh)) * 60)),
            ]);

            $orderedStops[] = $stop;

            if ($bestType === 'pickup') {
                $completedPickups[$bestShipmentId] = true;
                unset($pendingPickups[$bestShipmentId]);
            } else {
                unset($pendingDeliveries[$bestShipmentId]);
            }
        }

        $estDuration = (int) round(($totalDist / max(1, $this->speedKmh)) * 60) + (count($orderedStops) * 10); // 10 min dwell per stop

        $route->update([
            'total_distance_km' => round($totalDist, 2),
            'estimated_duration_min' => $estDuration,
            'status' => 'active',
        ]);

        return $route->fresh('stops.shipment');
    }
}
