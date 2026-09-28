<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Shipment extends Model
{
    use HasFactory;

    protected $fillable = [
        'tracking_number',
        'sender_id',
        'driver_id',

        'sender_name',
        'sender_phone',
        'sender_email',
        'sender_country',
        'sender_city',
        'sender_address',
        'sender_latitude',
        'sender_longitude',

        'recipient_name',
        'recipient_phone',
        'recipient_country',
        'recipient_city',
        'recipient_address',
        'recipient_latitude',
        'recipient_longitude',

        'package_type',
        'description',
        'number_of_packages',
        'weight_kg',
        'volume_m3',
        'is_fragile',
        'pickup_date',
        'delivery_date',

        'price',
        'status',
        'notes',

        'payment_method',
        'payment_status',
        'currency',
        'paid_at',
        'collected_by_driver_id',
        'payment_notes',
    ];

    protected $casts = [
        'is_fragile' => 'boolean',
        'sender_latitude' => 'float',
        'sender_longitude' => 'float',
        'recipient_latitude' => 'float',
        'recipient_longitude' => 'float',
        'weight_kg' => 'float',
        'volume_m3' => 'float',
        'price' => 'float',
        'number_of_packages' => 'integer',
        'pickup_date' => 'date',
        'delivery_date' => 'date',
        'paid_at' => 'datetime',
    ];

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function collector()
    {
        return $this->belongsTo(User::class, 'collected_by_driver_id');
    }

    public function routeStops()
    {
        return $this->hasMany(RouteStop::class, 'shipment_id');
    }
}
