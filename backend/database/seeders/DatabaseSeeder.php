<?php

namespace Database\Seeders;

use App\Models\DriverLocation;
use App\Models\Shipment;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Admin User
        $admin = User::firstOrCreate(
            ['email' => 'admin@logistics.com'],
            [
                'name' => 'System Admin',
                'password' => Hash::make('password123'),
                'role' => 'admin',
                'phone' => '+212 600-112233',
                'status' => 'active',
                'availability' => 'offline',
            ]
        );

        // 2. Client User
        $client = User::firstOrCreate(
            ['email' => 'client@logistics.com'],
            [
                'name' => 'Sarah Client',
                'password' => Hash::make('password123'),
                'role' => 'client',
                'phone' => '+212 633-445566',
                'status' => 'active',
                'availability' => 'offline',
            ]
        );

        // 3. Driver 1: Alex Express (Casablanca, Morocco)
        $driver1 = User::firstOrCreate(
            ['email' => 'driver@logistics.com'],
            [
                'name' => 'Alex Express Driver',
                'password' => Hash::make('password123'),
                'role' => 'driver',
                'phone' => '+212 611-223344',
                'status' => 'active',
                'availability' => 'available',
            ]
        );
        Vehicle::updateOrCreate(
            ['driver_id' => $driver1->id],
            [
                'vehicle_type' => 'van',
                'registration_number' => 'CAS-88492',
                'max_weight_kg' => 600,
                'max_volume_m3' => 4.5,
                'current_loaded_weight_kg' => 0,
                'current_loaded_volume_m3' => 0,
            ]
        );
        DriverLocation::create([
            'driver_id' => $driver1->id,
            'latitude' => 33.589886,
            'longitude' => -7.632403,
            'accuracy' => 12.5,
            'recorded_at' => now(),
        ]);

        // 4. Driver 2: Carlos Valencia (Valencia, Spain)
        $carlos = User::firstOrCreate(
            ['email' => 'carlos@logistics.com'],
            [
                'name' => 'Carlos Valencia',
                'password' => Hash::make('password123'),
                'role' => 'driver',
                'phone' => '+34 612 345 678',
                'status' => 'active',
                'availability' => 'available',
            ]
        );
        Vehicle::updateOrCreate(
            ['driver_id' => $carlos->id],
            [
                'vehicle_type' => 'van',
                'registration_number' => '7849-VLC',
                'max_weight_kg' => 500,
                'max_volume_m3' => 4.0,
                'current_loaded_weight_kg' => 0,
                'current_loaded_volume_m3' => 0,
            ]
        );
        DriverLocation::create([
            'driver_id' => $carlos->id,
            'latitude' => 39.4699,
            'longitude' => -0.3763,
            'accuracy' => 10.0,
            'recorded_at' => now(),
        ]);

        // 5. Driver 3: Youssef Transporter (Truck Driver)
        $youssef = User::firstOrCreate(
            ['email' => 'driver2@logistics.com'],
            [
                'name' => 'Youssef Transporter',
                'password' => Hash::make('password123'),
                'role' => 'driver',
                'phone' => '+212 622-334455',
                'status' => 'active',
                'availability' => 'available',
            ]
        );
        Vehicle::updateOrCreate(
            ['driver_id' => $youssef->id],
            [
                'vehicle_type' => 'truck',
                'registration_number' => 'TRK-90122',
                'max_weight_kg' => 1200,
                'max_volume_m3' => 8.0,
                'current_loaded_weight_kg' => 0,
                'current_loaded_volume_m3' => 0,
            ]
        );
        DriverLocation::create([
            'driver_id' => $youssef->id,
            'latitude' => 33.5731,
            'longitude' => -7.5898,
            'accuracy' => 15.0,
            'recorded_at' => now(),
        ]);

        // 6. Test Shipments - Spain Scenario
        Shipment::create([
            'tracking_number' => 'TRK-ES-VLC-MUR',
            'sender_id' => $client->id,
            'sender_name' => 'Valencia Textiles',
            'sender_phone' => '+34 963 111 222',
            'sender_country' => 'Spain',
            'sender_city' => 'Valencia',
            'sender_address' => 'Plaza del Ayuntamiento 1, Valencia',
            'sender_latitude' => 39.4699,
            'sender_longitude' => -0.3763,
            'recipient_name' => 'Murcia Fashion Store',
            'recipient_phone' => '+34 968 333 444',
            'recipient_country' => 'Spain',
            'recipient_city' => 'Murcia',
            'recipient_address' => 'Calle Trapería 12, Murcia',
            'recipient_latitude' => 37.9922,
            'recipient_longitude' => -1.1307,
            'package_type' => 'box',
            'description' => 'Garments apparel boxes',
            'number_of_packages' => 3,
            'weight_kg' => 12.00,
            'volume_m3' => 0.18,
            'is_fragile' => false,
            'pickup_date' => date('Y-m-d'),
            'delivery_date' => date('Y-m-d', strtotime('+1 day')),
            'price' => 45.00,
            'status' => 'pending',
        ]);

        Shipment::create([
            'tracking_number' => 'TRK-ES-VLC-ALC',
            'sender_id' => $client->id,
            'sender_name' => 'Valencia Electronics',
            'sender_phone' => '+34 963 555 666',
            'sender_country' => 'Spain',
            'sender_city' => 'Valencia',
            'sender_address' => 'Avenida de Aragón 15, Valencia',
            'sender_latitude' => 39.4750,
            'sender_longitude' => -0.3600,
            'recipient_name' => 'Alicante Tech Hub',
            'recipient_phone' => '+34 965 777 888',
            'recipient_country' => 'Spain',
            'recipient_city' => 'Alicante',
            'recipient_address' => 'Rambla Méndez Núñez 8, Alicante',
            'recipient_latitude' => 38.3452,
            'recipient_longitude' => -0.4810,
            'package_type' => 'parcel',
            'description' => 'High-end computer components',
            'number_of_packages' => 1,
            'weight_kg' => 8.00,
            'volume_m3' => 0.08,
            'is_fragile' => true,
            'pickup_date' => date('Y-m-d'),
            'delivery_date' => date('Y-m-d', strtotime('+1 day')),
            'price' => 38.00,
            'status' => 'pending',
        ]);

        Shipment::create([
            'tracking_number' => 'TRK-ES-VLC-BCN-HEAVY',
            'sender_id' => $client->id,
            'sender_name' => 'Valencia Industrial Steel',
            'sender_phone' => '+34 963 999 000',
            'sender_country' => 'Spain',
            'sender_city' => 'Valencia',
            'sender_address' => 'Polígono Industrial Vara de Quart',
            'sender_latitude' => 39.4600,
            'sender_longitude' => -0.4100,
            'recipient_name' => 'Barcelona Machinery Corp',
            'recipient_phone' => '+34 932 111 000',
            'recipient_country' => 'Spain',
            'recipient_city' => 'Barcelona',
            'recipient_address' => 'Zona Franca Sector B, Barcelona',
            'recipient_latitude' => 41.3851,
            'recipient_longitude' => 2.1734,
            'package_type' => 'pallet',
            'description' => 'Heavy steel machinery parts (600kg - Exceeds Carlos Van 500kg limit)',
            'number_of_packages' => 2,
            'weight_kg' => 600.00,
            'volume_m3' => 3.80,
            'is_fragile' => false,
            'pickup_date' => date('Y-m-d'),
            'delivery_date' => date('Y-m-d', strtotime('+2 days')),
            'price' => 320.00,
            'status' => 'pending',
        ]);

        // 7. Test Shipments - Morocco Scenario
        Shipment::create([
            'tracking_number' => 'TRK-MA-CAS-RAB',
            'sender_id' => $client->id,
            'sender_name' => 'Casablanca Pharma',
            'sender_phone' => '+212 522 112233',
            'sender_country' => 'Morocco',
            'sender_city' => 'Casablanca',
            'sender_address' => 'Boulevard Anfa 45, Casablanca',
            'sender_latitude' => 33.5890,
            'sender_longitude' => -7.6300,
            'recipient_name' => 'Rabat Central Hospital',
            'recipient_phone' => '+212 537 445566',
            'recipient_country' => 'Morocco',
            'recipient_city' => 'Rabat',
            'recipient_address' => 'Avenue Ibn Sina, Agdal, Rabat',
            'recipient_latitude' => 34.0042,
            'recipient_longitude' => -6.8488,
            'package_type' => 'box',
            'description' => 'Medical supply samples',
            'number_of_packages' => 2,
            'weight_kg' => 15.00,
            'volume_m3' => 0.20,
            'is_fragile' => true,
            'pickup_date' => date('Y-m-d'),
            'delivery_date' => date('Y-m-d', strtotime('+1 day')),
            'price' => 65.00,
            'status' => 'pending',
        ]);

        Shipment::create([
            'tracking_number' => 'TRK-MA-CAS-KEN',
            'sender_id' => $client->id,
            'sender_name' => 'Casablanca Auto Spare',
            'sender_phone' => '+212 522 778899',
            'sender_country' => 'Morocco',
            'sender_city' => 'Casablanca',
            'sender_address' => 'Route de Tétouan, Ain Sebaâ',
            'sender_latitude' => 33.6050,
            'sender_longitude' => -7.5300,
            'recipient_name' => 'Kenitra Automotive Assembly',
            'recipient_phone' => '+212 537 990011',
            'recipient_country' => 'Morocco',
            'recipient_city' => 'Kenitra',
            'recipient_address' => 'Atlantic Free Zone, Kenitra',
            'recipient_latitude' => 34.2610,
            'recipient_longitude' => -6.5802,
            'package_type' => 'box',
            'description' => 'Precision auto gaskets',
            'number_of_packages' => 4,
            'weight_kg' => 25.00,
            'volume_m3' => 0.35,
            'is_fragile' => false,
            'pickup_date' => date('Y-m-d'),
            'delivery_date' => date('Y-m-d', strtotime('+1 day')),
            'price' => 80.00,
            'status' => 'pending',
        ]);
    }
}
