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
        // 1. Shipment timeline logs
        Schema::create('shipment_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained('shipments')->onDelete('cascade');
            $table->string('previous_status')->nullable();
            $table->string('new_status');
            $table->foreignId('actor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('actor_role')->default('system'); // client, driver, admin, system
            $table->text('comment')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamps();
        });

        // 2. In-app notifications
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('type'); // shipment_created, driver_assigned, pickup_started, picked_up, in_transit, delivered, cancelled, issue_reported
            $table->string('title');
            $table->text('message');
            $table->foreignId('shipment_id')->nullable()->constrained('shipments')->onDelete('cascade');
            $table->string('channel')->default('in_app'); // in_app, email, sms, push
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        // 3. Proof of Delivery
        Schema::create('proof_of_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->unique()->constrained('shipments')->onDelete('cascade');
            $table->string('recipient_name')->nullable();
            $table->text('delivery_note')->nullable();
            $table->string('otp_code')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->string('photo_path')->nullable();
            $table->string('signature_path')->nullable();
            $table->timestamps();
        });

        // 4. Shipment Exceptions / Issues
        Schema::create('shipment_exceptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained('shipments')->onDelete('cascade');
            $table->foreignId('driver_id')->constrained('users')->onDelete('cascade');
            $table->enum('issue_type', [
                'driver_unavailable',
                'capacity_exceeded',
                'pickup_failed',
                'recipient_unavailable',
                'route_problem',
                'shipment_damaged',
                'delivery_failed'
            ]);
            $table->text('description');
            $table->enum('status', ['reported', 'investigating', 'resolved'])->default('reported');
            $table->foreignId('resolved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('resolution_note')->nullable();
            $table->timestamps();
        });

        // 5. Audit logs
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actor_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('actor_role')->default('system');
            $table->string('action'); // driver_assigned, driver_reassigned, shipment_cancelled, vehicle_updated, user_status_changed
            $table->string('target_type');
            $table->unsignedBigInteger('target_id');
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('shipment_exceptions');
        Schema::dropIfExists('proof_of_deliveries');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('shipment_logs');
    }
};
