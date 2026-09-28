<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\ShipmentLog;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ShipmentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Shipment::with(['sender:id,name,email,phone', 'driver:id,name,email,phone', 'collector:id,name,email,phone']);

        // Scope by user role for strict security
        if ($user->isDriver()) {
            $query->where(function ($q) use ($user) {
                $q->where('driver_id', $user->id)
                  ->orWhere(function ($sub) {
                      $sub->whereNull('driver_id')->where('status', 'pending');
                  });
            });
        } elseif ($user->isClient()) {
            $query->where('sender_id', $user->id);
        }

        // Apply Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Apply Payment Status Filter
        if ($request->filled('payment_status') && $request->payment_status !== 'all') {
            $query->where('payment_status', $request->payment_status);
        }

        // Apply Search Filter (tracking number, recipient, city)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tracking_number', 'like', "%{$search}%")
                  ->orWhere('recipient_name', 'like', "%{$search}%")
                  ->orWhere('recipient_city', 'like', "%{$search}%")
                  ->orWhere('sender_city', 'like', "%{$search}%");
            });
        }

        $shipments = $query->latest()->get();

        return response()->json([
            'shipments' => $shipments,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sender_name' => 'required|string|max:255',
            'sender_phone' => 'required|string|max:50',
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
            'sender_id' => $request->user()->id,

            'sender_name' => $validated['sender_name'],
            'sender_phone' => $validated['sender_phone'],
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

        // Record initial timeline log
        ShipmentLog::create([
            'shipment_id' => $shipment->id,
            'previous_status' => null,
            'new_status' => 'pending',
            'actor_id' => $request->user()->id,
            'actor_role' => $request->user()->role,
            'comment' => 'Shipment order created by client.',
            'latitude' => $validated['sender_latitude'] ?? null,
            'longitude' => $validated['sender_longitude'] ?? null,
        ]);

        // Send in-app notification
        NotificationService::send(
            $request->user()->id,
            'shipment_created',
            'Shipment Order Created',
            "Your shipment {$trackingNumber} has been created and registered.",
            $shipment->id
        );

        return response()->json([
            'message' => 'Shipment created successfully',
            'shipment' => $shipment->load(['sender:id,name,email']),
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $shipment = Shipment::with(['sender:id,name,email,phone', 'driver:id,name,email,phone'])->findOrFail($id);
        $user = $request->user();

        // Security ownership check
        if ($user->isClient() && $shipment->sender_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized access to this shipment.'], 403);
        }

        return response()->json([
            'shipment' => $shipment,
        ]);
    }

    public function track($trackingNumber)
    {
        $shipment = Shipment::with(['sender:id,name,email,phone', 'driver:id,name,email,phone'])
            ->where('tracking_number', $trackingNumber)
            ->first();

        if (!$shipment) {
            return response()->json(['message' => 'Shipment with this tracking number was not found.'], 404);
        }

        return response()->json([
            'shipment' => $shipment,
        ]);
    }

    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,assigned,pickup_started,picked_up,in_transit,delivered,cancelled',
            'comment' => 'nullable|string',
        ]);

        $shipment = Shipment::findOrFail($id);
        $user = $request->user();

        if ($user->isDriver()) {
            if ($shipment->driver_id && $shipment->driver_id !== $user->id) {
                return response()->json(['message' => 'Shipment assigned to another driver.'], 403);
            }
            if (!$shipment->driver_id) {
                $shipment->driver_id = $user->id;
            }
        }

        $prevStatus = $shipment->status;
        $shipment->status = $validated['status'];
        $shipment->save();

        // Record timeline log
        ShipmentLog::create([
            'shipment_id' => $shipment->id,
            'previous_status' => $prevStatus,
            'new_status' => $shipment->status,
            'actor_id' => $user->id,
            'actor_role' => $user->role,
            'comment' => $validated['comment'] ?? "Status updated to {$shipment->status}",
        ]);

        // Send notifications
        if ($shipment->sender_id) {
            NotificationService::send(
                $shipment->sender_id,
                "shipment_{$shipment->status}",
                "Shipment Status Updated: {$shipment->tracking_number}",
                "Status updated to " . strtoupper($shipment->status),
                $shipment->id
            );
        }

        return response()->json([
            'message' => 'Status updated successfully',
            'shipment' => $shipment->load(['sender:id,name,email', 'driver:id,name,email']),
        ]);
    }

    public function assignDriver(Request $request, $id)
    {
        $validated = $request->validate([
            'driver_id' => 'required|exists:users,id',
        ]);

        $driver = User::where('id', $validated['driver_id'])->where('role', 'driver')->firstOrFail();
        $shipment = Shipment::findOrFail($id);
        $prevDriverId = $shipment->driver_id;

        $shipment->driver_id = $driver->id;
        $shipment->status = 'assigned';
        $shipment->save();

        // Record timeline log
        ShipmentLog::create([
            'shipment_id' => $shipment->id,
            'previous_status' => 'pending',
            'new_status' => 'assigned',
            'actor_id' => $request->user()->id,
            'actor_role' => 'admin',
            'comment' => "Assigned driver {$driver->name} to shipment.",
        ]);

        // Audit Log entry for Admin action
        AuditLogService::log(
            $prevDriverId ? 'driver_reassigned' : 'driver_assigned',
            'Shipment',
            $shipment->id,
            ['previous_driver_id' => $prevDriverId, 'new_driver_id' => $driver->id],
            $request
        );

        // Send notifications to driver & client
        NotificationService::send(
            $driver->id,
            'shipment_assigned',
            'New Shipment Assigned',
            "You have been assigned to shipment {$shipment->tracking_number} from {$shipment->sender_city} to {$shipment->recipient_city}.",
            $shipment->id
        );

        if ($shipment->sender_id) {
            NotificationService::send(
                $shipment->sender_id,
                'driver_assigned',
                'Driver Assigned to Your Order',
                "Driver {$driver->name} has been assigned to your order {$shipment->tracking_number}.",
                $shipment->id
            );
        }

        return response()->json([
            'message' => "Assigned driver {$driver->name} to shipment",
            'shipment' => $shipment->load(['sender:id,name,email', 'driver:id,name,email']),
        ]);
    }
}
