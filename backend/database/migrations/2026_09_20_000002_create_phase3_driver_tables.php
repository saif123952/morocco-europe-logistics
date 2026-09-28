<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add availability to users table
        Schema::table('users', function (Blueprint $table) {
            $table->enum('availability', ['available', 'busy', 'offline'])->default('offline')->after('role');
        });

        // Vehicles table
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('users')->onDelete('cascade');
            $table->enum('vehicle_type', ['van', 'truck', 'motorcycle', 'car', 'bicycle'])->default('van');
            $table->string('registration_number')->unique();
            $table->decimal('max_weight_kg', 8, 2);
            $table->decimal('max_volume_m3', 8, 2);
            $table->decimal('current_loaded_weight_kg', 8, 2)->default(0);
            $table->decimal('current_loaded_volume_m3', 8, 2)->default(0);
            $table->timestamps();
        });

        // Driver locations table
        Schema::create('driver_locations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('users')->onDelete('cascade');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->float('accuracy')->nullable();
            $table->timestamp('recorded_at')->useCurrent();
            $table->timestamps();

            $table->index(['driver_id', 'recorded_at']);
        });

        // Delivery routes table
        Schema::create('delivery_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('users')->onDelete('cascade');
            $table->enum('status', ['planning', 'active', 'completed', 'cancelled'])->default('active');
            $table->decimal('total_distance_km', 10, 2)->nullable();
            $table->integer('estimated_duration_min')->nullable();
            $table->timestamps();
        });

        // Route stops table
        Schema::create('route_stops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_id')->constrained('delivery_routes')->onDelete('cascade');
            $table->foreignId('shipment_id')->constrained('shipments')->onDelete('cascade');
            $table->enum('stop_type', ['pickup', 'delivery']);
            $table->integer('stop_order');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->enum('status', ['pending', 'arrived', 'completed', 'skipped'])->default('pending');
            $table->timestamp('estimated_arrival')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        // Update shipments table status column to allow new status values
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('status')->default('pending')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('route_stops');
        Schema::dropIfExists('delivery_routes');
        Schema::dropIfExists('driver_locations');
        Schema::dropIfExists('vehicles');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('availability');
        });
    }
};
