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
        Schema::table('shipments', function (Blueprint $table) {
            $table->string('payment_method')->default('pay_on_pickup')->after('price');
            $table->enum('payment_status', ['unpaid', 'paid', 'payment_failed', 'refunded'])->default('unpaid')->after('payment_method');
            $table->string('currency', 3)->default('EUR')->after('payment_status');
            $table->timestamp('paid_at')->nullable()->after('currency');
            $table->foreignId('collected_by_driver_id')->nullable()->constrained('users')->onDelete('set null')->after('paid_at');
            $table->text('payment_notes')->nullable()->after('collected_by_driver_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            $table->dropForeign(['collected_by_driver_id']);
            $table->dropColumn([
                'payment_method',
                'payment_status',
                'currency',
                'paid_at',
                'collected_by_driver_id',
                'payment_notes',
            ]);
        });
    }
};
