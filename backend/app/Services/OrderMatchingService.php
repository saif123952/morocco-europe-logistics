<?php

namespace App\Services;

use App\Helpers\GeoHelper;
use App\Models\Shipment;
use App\Models\User;

class OrderMatchingService
{
    protected array $weights;
    protected float $maxRadius;
    protected float $speedKmh;

    public function __construct()
    {
        $this->weights = config('matching.weights', [
            'proximity' => 35,
            'route_direction' => 25,
            'destination' => 15,
            'time' => 10,
            'capacity' => 15,
        ]);
        $this->maxRadius = (float) config('matching.max_radius_km', 50);
        $this->speedKmh = (float) config('matching.speed_kmh', 45);
    }

    /**
     * Rank available shipments for a driver based on multi-factor scoring.
     */
    public function getRecommendedShipments(User $driver, float $lat, float $lng, float $radiusKm = null): array
    {
        $radiusKm = $radiusKm ?? $this->maxRadius;
        $vehicle = $driver->vehicle;

        // Fetch unassigned pending shipments
        $shipments = Shipment::where('status', 'pending')
            ->whereNull('driver_id')
            ->whereNotNull('sender_latitude')
            ->whereNotNull('sender_longitude')
            ->get();

        $activeRoute = $driver->activeRoute;
        $routeStops = $activeRoute ? $activeRoute->stops : collect();

        $scoredShipments = [];

        foreach ($shipments as $shipment) {
            $distToPickup = GeoHelper::haversine($lat, $lng, $shipment->sender_latitude, $shipment->sender_longitude);

            // Filter out if beyond max requested radius
            if ($distToPickup > $radiusKm) {
                continue;
            }

            $capacityFit = $this->calculateCapacityScore($vehicle, $shipment);
            $proximityScore = $this->calculateProximityScore($distToPickup, $radiusKm);
            $directionScore = $this->calculateDirectionScore($lat, $lng, $shipment, $routeStops);
            $destinationScore = $this->calculateDestinationScore($shipment, $routeStops);
            $timeScore = $this->calculateTimeScore($shipment);

            $totalScore = round(
                ($proximityScore * ($this->weights['proximity'] / 100)) +
                ($directionScore * ($this->weights['route_direction'] / 100)) +
                ($destinationScore * ($this->weights['destination'] / 100)) +
                ($timeScore * ($this->weights['time'] / 100)) +
                ($capacityFit['score'] * ($this->weights['capacity'] / 100)),
                1
            );

            // Human-readable score breakdown explanation
            $explanations = [];
            $explanations[] = "Pickup {$distToPickup}km away (" . round($proximityScore) . "% proximity)";
            if ($capacityFit['is_over_capacity']) {
                $explanations[] = "⚠️ Exceeds vehicle capacity (" . $capacityFit['reason'] . ")";
            } else {
                $explanations[] = "Vehicle fit: " . round($capacityFit['score']) . "% (" . ($shipment->weight_kg ?? 0) . "kg / " . ($shipment->volume_m3 ?? 0) . "m³)";
            }
            if ($directionScore > 70) {
                $explanations[] = "High route direction alignment";
            }

            // Estimate pickup ETA
            $etaMinutes = (int) round(($distToPickup / max(1, $this->speedKmh)) * 60);

            $scoredShipments[] = [
                'shipment' => $shipment,
                'distance_to_pickup_km' => $distToPickup,
                'estimated_pickup_eta_min' => $etaMinutes,
                'match_score' => $totalScore,
                'is_over_capacity' => $capacityFit['is_over_capacity'],
                'can_accept' => !$capacityFit['is_over_capacity'],
                'score_breakdown' => [
                    'proximity' => round($proximityScore, 1),
                    'direction' => round($directionScore, 1),
                    'destination' => round($destinationScore, 1),
                    'time' => round($timeScore, 1),
                    'capacity' => round($capacityFit['score'], 1),
                ],
                'explanations' => $explanations,
            ];
        }

        // Sort by match_score descending
        usort($scoredShipments, fn($a, $b) => $b['match_score'] <=> $a['match_score']);

        return $scoredShipments;
    }

    protected function calculateProximityScore(float $distanceKm, float $maxRadiusKm): float
    {
        if ($distanceKm <= 0) return 100.0;
        if ($distanceKm >= $maxRadiusKm) return 0.0;
        return max(0.0, 100.0 * (1 - ($distanceKm / $maxRadiusKm)));
    }

    protected function calculateCapacityScore($vehicle, Shipment $shipment): array
    {
        if (!$vehicle) {
            return [
                'score' => 50.0,
                'is_over_capacity' => false,
                'reason' => 'No vehicle profile set',
            ];
        }

        $pkgWeight = (float) ($shipment->weight_kg ?? 0);
        $pkgVolume = (float) ($shipment->volume_m3 ?? 0);

        $availWeight = $vehicle->available_weight_kg;
        $availVolume = $vehicle->available_volume_m3;

        if ($pkgWeight > $availWeight || $pkgVolume > $availVolume) {
            $reason = [];
            if ($pkgWeight > $availWeight) $reason[] = "weight +{$pkgWeight}kg > max avail {$availWeight}kg";
            if ($pkgVolume > $availVolume) $reason[] = "volume +{$pkgVolume}m³ > max avail {$availVolume}m³";
            return [
                'score' => 0.0,
                'is_over_capacity' => true,
                'reason' => implode(', ', $reason),
            ];
        }

        $weightRatio = $availWeight > 0 ? ($pkgWeight / $availWeight) : 0;
        $volumeRatio = $availVolume > 0 ? ($pkgVolume / $availVolume) : 0;
        $ratio = max($weightRatio, $volumeRatio);

        // Optimal utilization is between 30% and 80% of vehicle capacity
        $score = 100 - (abs(0.5 - $ratio) * 100);

        return [
            'score' => max(20.0, min(100.0, $score)),
            'is_over_capacity' => false,
            'reason' => 'Fits in vehicle',
        ];
    }

    protected function calculateDirectionScore(float $lat, float $lng, Shipment $shipment, $routeStops): float
    {
        if ($routeStops->isEmpty()) {
            return 50.0; // neutral default
        }

        $shipmentBearing = GeoHelper::bearing(
            $lat, $lng,
            $shipment->sender_latitude, $shipment->sender_longitude
        );

        $lastStop = $routeStops->last();
        $routeBearing = GeoHelper::bearing($lat, $lng, $lastStop->latitude, $lastStop->longitude);

        $delta = GeoHelper::bearingDelta($shipmentBearing, $routeBearing);
        return max(0.0, 100.0 * (1 - ($delta / 180.0)));
    }

    protected function calculateDestinationScore(Shipment $shipment, $routeStops): float
    {
        if ($routeStops->isEmpty()) {
            return 50.0;
        }

        $shipmentDestCity = strtolower(trim($shipment->recipient_city ?? ''));
        if (!$shipmentDestCity) return 50.0;

        foreach ($routeStops as $stop) {
            $stopCity = strtolower(trim($stop->city ?? ''));
            if ($stopCity && $stopCity === $shipmentDestCity) {
                return 100.0;
            }
        }

        return 40.0;
    }

    protected function calculateTimeScore(Shipment $shipment): float
    {
        if (!$shipment->pickup_date) {
            return 70.0;
        }

        $pickupTime = strtotime($shipment->pickup_date);
        $todayTime = strtotime(date('Y-m-d'));
        $daysDiff = ($pickupTime - $todayTime) / 86400;

        if ($daysDiff <= 0) return 100.0; // due today or past due
        if ($daysDiff == 1) return 85.0; // due tomorrow
        if ($daysDiff <= 3) return 60.0;
        return 40.0;
    }
}
