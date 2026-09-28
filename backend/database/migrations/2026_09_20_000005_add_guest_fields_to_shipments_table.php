<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Execute raw SQL to ensure sender_id is nullable without doctrine/dbal dependency
        DB::statement('ALTER TABLE shipments MODIFY sender_id BIGINT UNSIGNED NULL;');

        Schema::table('shipments', function (Blueprint $table) {
            if (!Schema::hasColumn('shipments', 'sender_email')) {
                $table->string('sender_email')->nullable()->after('sender_phone');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('shipments', function (Blueprint $table) {
            if (Schema::hasColumn('shipments', 'sender_email')) {
                $table->dropColumn('sender_email');
            }
        });

        DB::statement('ALTER TABLE shipments MODIFY sender_id BIGINT UNSIGNED NOT NULL;');
    }
};
