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
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_number')->unique();
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('driver_id')->nullable()->constrained('users')->onDelete('set null');
            
            // Sender details
            $table->string('sender_name');
            $table->string('sender_phone');
            $table->string('sender_country')->default('Morocco');
            $table->string('sender_city');
            $table->text('sender_address');
            $table->decimal('sender_latitude', 10, 7)->nullable();
            $table->decimal('sender_longitude', 10, 7)->nullable();

            // Recipient details
            $table->string('recipient_name');
            $table->string('recipient_phone');
            $table->string('recipient_country')->default('Morocco');
            $table->string('recipient_city');
            $table->text('recipient_address');
            $table->decimal('recipient_latitude', 10, 7)->nullable();
            $table->decimal('recipient_longitude', 10, 7)->nullable();

            // Package specs
            $table->string('package_type')->default('box'); // box, document, pallet, fragile, heavy
            $table->text('description')->nullable();
            $table->integer('number_of_packages')->default(1);
            $table->decimal('weight_kg', 8, 2)->default(1.00);
            $table->decimal('volume_m3', 8, 2)->nullable();
            $table->boolean('is_fragile')->default(false);
            $table->date('pickup_date')->nullable();
            $table->date('delivery_date')->nullable();
            
            $table->decimal('price', 10, 2)->default(0.00);
            $table->enum('status', ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
