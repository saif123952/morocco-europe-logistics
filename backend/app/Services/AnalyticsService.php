<?php

namespace App\Services;

use App\Models\DeliveryRoute;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    /**
     * Compute comprehensive real-time database analytics for Admin Operations.
     */
    public function getAdminMetrics(): array
    {
        // 1. Shipment Status Breakdown
        $totalShipments = Shipment::count();
        $deliveredCount = Shipment::where('status', 'delivered')->count();
        $inTransitCount = Shipment::whereIn('status', ['in_transit', 'pickup_started', 'picked_up'])->count();
        $pendingCount = Shipment::where('status', 'pending')->count();
        $assignedCount = Shipment::where('status', 'assigned')->count();
        $cancelledCount = Shipment::where('status', 'cancelled')->count();

        $successRate = $totalShipments > 0 ? round(($deliveredCount / $totalShipments) * 100, 1) : 0;
        $totalRevenue = (float) Shipment::sum('price');

        // 2. Daily Volume Trends (Last 7 days)
        $dailyTrends = Shipment::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('COUNT(*) as total_orders'),
            DB::raw('SUM(CASE WHEN status = "delivered" THEN 1 ELSE 0 END) as delivered_orders'),
            DB::raw('SUM(price) as daily_revenue')
        )
        ->groupBy('date')
        ->orderBy('date', 'desc')
        ->limit(7)
        ->get();

        // 3. Country & City Breakdown
        $countryBreakdown = Shipment::select('sender_country', DB::raw('COUNT(*) as count'))
            ->whereNotNull('sender_country')
            ->groupBy('sender_country')
            ->get();

        $cityBreakdown = Shipment::select('sender_city', DB::raw('COUNT(*) as count'))
            ->whereNotNull('sender_city')
            ->groupBy('sender_city')
            ->orderBy('count', 'desc')
            ->limit(5)
            ->get();

        // 4. Fleet Utilization Metrics
        $totalDrivers = User::where('role', 'driver')->count();
        $availableDrivers = User::where('role', 'driver')->where('availability', 'available')->count();
        $busyDrivers = User::where('role', 'driver')->where('availability', 'busy')->count();
        $offlineDrivers = User::where('role', 'driver')->where('availability', 'offline')->count();

        $totalVehicleCapacityKg = (float) Vehicle::sum('max_weight_kg');
        $currentLoadedKg = (float) Vehicle::sum('current_loaded_weight_kg');
        $capacityUtilizationPct = $totalVehicleCapacityKg > 0 ? round(($currentLoadedKg / $totalVehicleCapacityKg) * 100, 1) : 0;

        // 5. Total Tour Distance & Active Routes
        $totalTourDistanceKm = (float) DeliveryRoute::where('status', 'active')->sum('total_distance_km');
        $avgWeightKg = (float) Shipment::avg('weight_kg');

        return [
            'overview' => [
                'total_shipments' => $totalShipments,
                'delivered_count' => $deliveredCount,
                'in_transit_count' => $inTransitCount,
                'pending_count' => $pendingCount,
                'assigned_count' => $assignedCount,
                'cancelled_count' => $cancelledCount,
                'success_rate_pct' => $successRate,
                'total_revenue' => round($totalRevenue, 2),
                'avg_package_weight_kg' => round($avgWeightKg, 1),
            ],
            'daily_trends' => $dailyTrends,
            'country_breakdown' => $countryBreakdown,
            'top_cities' => $cityBreakdown,
            'fleet' => [
                'total_drivers' => $totalDrivers,
                'available' => $availableDrivers,
                'busy' => $busyDrivers,
                'offline' => $offlineDrivers,
                'capacity_utilization_pct' => $capacityUtilizationPct,
                'total_loaded_weight_kg' => $currentLoadedKg,
                'max_fleet_capacity_kg' => $totalVehicleCapacityKg,
                'active_tours_total_km' => round($totalTourDistanceKm, 1),
            ],
        ];
    }
}
