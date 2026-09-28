<?php

namespace App\Http\Controllers\Api;

use App\Helpers\GeoHelper;
use App\Http\Controllers\Controller;
use App\Models\DriverLocation;
use App\Models\RouteStop;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\DeliveryExecutionService;
use App\Services\OrderMatchingService;
use App\Services\RouteOptimizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    protected OrderMatchingService $matchingService;
    protected RouteOptimizationService $routeService;
    protected DeliveryExecutionService $deliveryExecutionService;

    public function __construct(
        OrderMatchingService $matchingService,
        RouteOptimizationService $routeService,
        DeliveryExecutionService $deliveryExecutionService
    ) {
        $this->matchingService = $matchingService;
        $this->routeService = $routeService;
        $this->deliveryExecutionService = $deliveryExecutionService;
    }

    /**
     * Get Driver Profile, Vehicle & Status.
     */
    public function getProfile(Request $request): JsonResponse
    {
        $driver = $request->user()->load(['vehicle', 'latestLocation', 'activeRoute.stops.shipment']);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $driver->id,
                    'name' => $driver->name,
                    'email' => $driver->email,
                    'phone' => $driver->phone,
                    'availability' => $driver->availability,
                ],
                'vehicle' => $driver->vehicle,
                'latest_location' => $driver->latestLocation,
                'active_route' => $driver->activeRoute,
            ],
        ]);
    }

    /**
     * Create or Update Vehicle Information.
     */
    public function updateVehicle(Request $request): JsonResponse
    {
        $driver = $request->user();

        $validated = $request->validate([
            'vehicle_type' => 'required|in:van,truck,motorcycle,car,bicycle',
            'registration_number' => 'required|string|max:50',
            'max_weight_kg' => 'required|numeric|min:1',
            'max_volume_m3' => 'required|numeric|min:0.1',
        ]);

        // Check if registration number is taken by another vehicle
        $existing = Vehicle::where('registration_number', $validated['registration_number'])
            ->where('driver_id', '!=', $driver->id)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Registration number already in use by another vehicle.',
            ], 422);
        }

        $vehicle = Vehicle::updateOrCreate(
            ['driver_id' => $driver->id],
            $validated
        );

        return response()->json([
            'success' => true,
            'message' => 'Vehicle updated successfully',
            'data' => $vehicle,
        ]);
    }

    /**
     * Update Availability Status (available, busy, offline).
     */
    public function updateAvailability(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'availability' => 'required|in:available,busy,offline',
        ]);

        $driver = $request->user();
        $driver->update(['availability' => $validated['availability']]);

        return response()->json([
            'success' => true,
            'message' => "Availability updated to {$driver->availability}",
            'data' => ['availability' => $driver->availability],
        ]);
    }

    /**
     * Post GPS Location Update.
     */
    public function updateLocation(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'accuracy' => 'nullable|numeric',
        ]);

        $driver = $request->user();

        $location = DriverLocation::create([
            'driver_id' => $driver->id,
            'latitude' => $validated['latitude'],
            'longitude' => $validated['longitude'],
            'accuracy' => $validated['accuracy'] ?? null,
            'recorded_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Location recorded',
            'data' => $location,
        ]);
    }

    /**
     * Get Latest Driver Location.
     */
    public function getLocation(Request $request): JsonResponse
    {
        $location = $request->user()->latestLocation;

        return response()->json([
            'success' => true,
            'data' => $location,
        ]);
    }

    /**
     * Get Nearby Available Shipments (Haversine distance filter).
     */
    public function getNearbyShipments(Request $request): JsonResponse
    {
        $driver = $request->user();
        $lat = $request->input('latitude');
        $lng = $request->input('longitude');
        $radius = (float) $request->input('radius', 25);
        $search = $request->input('search');
        $city = $request->input('city');
        $maxWeight = $request->input('max_weight');
        $compatibleOnly = filter_var($request->input('compatible_only', false), FILTER_VALIDATE_BOOLEAN);

        // Fallback to driver's last saved location if not provided in query
        if (!$lat || !$lng) {
            $lastLoc = $driver->latestLocation;
            if ($lastLoc) {
                $lat = $lastLoc->latitude;
                $lng = $lastLoc->longitude;
            } else {
                // Default coordinates (Valencia, Spain center fallback if none)
                $lat = 39.4699;
                $lng = -0.3763;
            }
        }

        $query = Shipment::where('status', 'pending')
            ->whereNull('driver_id')
            ->whereNotNull('sender_latitude')
            ->whereNotNull('sender_longitude');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('tracking_number', 'like', "%{$search}%")
                  ->orWhere('sender_city', 'like', "%{$search}%")
                  ->orWhere('recipient_city', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($city) {
            $query->where(function ($q) use ($city) {
                $q->where('sender_city', 'like', "%{$city}%")
                  ->orWhere('recipient_city', 'like', "%{$city}%");
            });
        }

        if ($maxWeight) {
            $query->where('weight_kg', '<=', (float) $maxWeight);
        }

        $shipments = $query->get();
        $vehicle = $driver->vehicle;

        $results = [];

        foreach ($shipments as $shipment) {
            $dist = GeoHelper::haversine($lat, $lng, $shipment->sender_latitude, $shipment->sender_longitude);

            if ($dist <= $radius) {
                $canFit = $vehicle ? $vehicle->canFit((float) $shipment->weight_kg, (float) $shipment->volume_m3) : true;

                if ($compatibleOnly && !$canFit) {
                    continue;
                }

                $results[] = [
                    'shipment' => $shipment,
                    'distance_km' => $dist,
                    'can_fit' => $canFit,
                    'eta_pickup_min' => (int) round(($dist / max(1, config('matching.speed_kmh', 45))) * 60),
                ];
            }
        }

        // Sort by distance ascending
        usort($results, fn($a, $b) => $a['distance_km'] <=> $b['distance_km']);

        return response()->json([
            'success' => true,
            'driver_position' => ['latitude' => (float)$lat, 'longitude' => (float)$lng],
            'radius_km' => $radius,
            'count' => count($results),
            'data' => $results,
        ]);
    }

    /**
     * Get Smart Recommended Shipments (Ranked by OrderMatchingService).
     */
    public function getRecommendedShipments(Request $request): JsonResponse
    {
        $driver = $request->user();
        $lat = $request->input('latitude');
        $lng = $request->input('longitude');
        $radius = $request->input('radius');

        if (!$lat || !$lng) {
            $lastLoc = $driver->latestLocation;
            if ($lastLoc) {
                $lat = $lastLoc->latitude;
                $lng = $lastLoc->longitude;
            } else {
                $lat = 39.4699;
                $lng = -0.3763;
            }
        }

        $recommended = $this->matchingService->getRecommendedShipments(
            $driver,
            (float) $lat,
            (float) $lng,
            $radius ? (float) $radius : null
        );

        return response()->json([
            'success' => true,
            'count' => count($recommended),
            'data' => $recommended,
        ]);
    }

    /**
     * Accept a Shipment & Add to Driver's Vehicle + Route.
     */
    public function acceptShipment(Request $request, $id): JsonResponse
    {
        $driver = $request->user();
        $shipment = Shipment::findOrFail($id);

        if ($shipment->driver_id !== null && $shipment->driver_id !== $driver->id) {
            return response()->json([
                'success' => false,
                'message' => 'Shipment is assigned to another driver.',
            ], 400);
        }

        $vehicle = $driver->vehicle;
        if (!$vehicle) {
            return response()->json([
                'success' => false,
                'message' => 'You must register a vehicle before accepting orders.',
            ], 422);
        }

        // Check vehicle capacity
        $weight = (float) ($shipment->weight_kg ?? 0);
        $volume = (float) ($shipment->volume_m3 ?? 0);

        if (!$vehicle->canFit($weight, $volume)) {
            return response()->json([
                'success' => false,
                'message' => "Vehicle weight/volume capacity exceeded. Current loaded: {$vehicle->current_loaded_weight_kg}kg, Max: {$vehicle->max_weight_kg}kg.",
            ], 422);
        }

        // Assign shipment to driver
        $shipment->update([
            'driver_id' => $driver->id,
            'status' => 'assigned',
        ]);

        // Update loaded vehicle stats
        $vehicle->increment('current_loaded_weight_kg', $weight);
        $vehicle->increment('current_loaded_volume_m3', $volume);

        // Update driver availability to busy if active orders present
        if ($driver->availability === 'available') {
            $driver->update(['availability' => 'busy']);
        }

        // Auto-regenerate delivery route for assigned shipments
        $assignedShipments = Shipment::where('driver_id', $driver->id)
            ->whereIn('status', ['assigned', 'pickup_started', 'picked_up', 'in_transit'])
            ->pluck('id')
            ->toArray();

        $lat = $request->input('latitude');
        $lng = $request->input('longitude');
        if (!$lat || !$lng) {
            $lastLoc = $driver->latestLocation;
            $lat = $lastLoc ? $lastLoc->latitude : 39.4699;
            $lng = $lastLoc ? $lastLoc->longitude : -0.3763;
        }

        $route = $this->routeService->optimizeRoute($driver, $assignedShipments, (float)$lat, (float)$lng);

        return response()->json([
            'success' => true,
            'message' => 'Shipment accepted and added to tour route.',
            'data' => [
                'shipment' => $shipment->fresh(),
                'vehicle' => $vehicle->fresh(),
                'route' => $route,
            ],
        ]);
    }

    /**
     * Reject/Ignore a Shipment.
     */
    public function rejectShipment(Request $request, $id): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Shipment ignored.',
        ]);
    }

    /**
     * Get Current Active Tour Route & Stops.
     */
    public function getRoute(Request $request): JsonResponse
    {
        $driver = $request->user();
        $route = $driver->activeRoute;

        if ($route) {
            $route->load('stops.shipment');
        }

        return response()->json([
            'success' => true,
            'data' => $route,
        ]);
    }

    /**
     * Force Generate / Re-optimize Tour Route.
     */
    public function generateRoute(Request $request): JsonResponse
    {
        $driver = $request->user();
        $assignedShipments = Shipment::where('driver_id', $driver->id)
            ->whereIn('status', ['assigned', 'pickup_started', 'picked_up', 'in_transit'])
            ->pluck('id')
            ->toArray();

        if (empty($assignedShipments)) {
            return response()->json([
                'success' => false,
                'message' => 'No active shipments assigned to generate a route.',
            ], 400);
        }

        $lat = $request->input('latitude');
        $lng = $request->input('longitude');
        if (!$lat || !$lng) {
            $lastLoc = $driver->latestLocation;
            $lat = $lastLoc ? $lastLoc->latitude : 39.4699;
            $lng = $lastLoc ? $lastLoc->longitude : -0.3763;
        }

        $route = $this->routeService->optimizeRoute($driver, $assignedShipments, (float)$lat, (float)$lng);

        return response()->json([
            'success' => true,
            'message' => 'Route optimized successfully.',
            'data' => $route,
        ]);
    }

    /**
     * Update Stop Status & Handle Shipment Lifecycle Transitions via DeliveryExecutionService.
     */
    public function updateStopStatus(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'action' => 'required|in:start_pickup,confirm_pickup,start_delivery,confirm_delivery,cancel_shipment',
            'recipient_name' => 'nullable|string|max:255',
            'delivery_note' => 'nullable|string',
            'otp_code' => 'nullable|string|max:10',
        ]);

        $driver = $request->user();

        if ($validated['action'] === 'cancel_shipment') {
            $stop = RouteStop::with(['shipment', 'route'])->findOrFail($id);
            $shipment = $stop->shipment;
            if ($stop->route->driver_id !== $driver->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized stop modification.'], 403);
            }
            $stop->update(['status' => 'skipped']);
            $shipment->update(['driver_id' => null, 'status' => 'pending']);

            $vehicle = $driver->vehicle;
            if ($vehicle) {
                $weight = (float) ($shipment->weight_kg ?? 0);
                $volume = (float) ($shipment->volume_m3 ?? 0);
                $vehicle->decrement('current_loaded_weight_kg', min($vehicle->current_loaded_weight_kg, $weight));
                $vehicle->decrement('current_loaded_volume_m3', min($vehicle->current_loaded_volume_m3, $volume));
            }

            return response()->json([
                'success' => true,
                'message' => 'Shipment cancelled from tour and returned to pending pool.',
                'data' => ['stop' => $stop->fresh(), 'shipment' => $shipment->fresh()],
            ]);
        }

        $podData = [
            'recipient_name' => $validated['recipient_name'] ?? null,
            'delivery_note' => $validated['delivery_note'] ?? null,
            'otp_code' => $validated['otp_code'] ?? null,
        ];

        $result = $this->deliveryExecutionService->executeStopTransition($driver, (int)$id, $validated['action'], $podData);

        return response()->json([
            'success' => true,
            'message' => $result['message'],
            'data' => [
                'stop' => $result['stop'],
                'shipment' => $result['shipment'],
            ],
        ]);
    }

    /**
     * Admin: Get List of Drivers with status, location, vehicle, capacity.
     */
    public function getAdminDrivers(Request $request): JsonResponse
    {
        $drivers = User::where('role', 'driver')
            ->with(['vehicle', 'latestLocation', 'assignedShipments' => function($q) {
                $q->whereIn('status', ['assigned', 'pickup_started', 'picked_up', 'in_transit']);
            }])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $drivers,
        ]);
    }

    /**
     * Admin: Map visualization payload (all active drivers + shipments).
     */
    public function getAdminMap(Request $request): JsonResponse
    {
        $drivers = User::where('role', 'driver')
            ->with(['vehicle', 'latestLocation'])
            ->get();

        $activeShipments = Shipment::whereIn('status', ['pending', 'assigned', 'pickup_started', 'picked_up', 'in_transit'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'drivers' => $drivers,
                'shipments' => $activeShipments,
            ],
        ]);
    }
}
