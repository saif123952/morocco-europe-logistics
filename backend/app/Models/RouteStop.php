<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RouteStop extends Model
{
    use HasFactory;

    protected $fillable = [
        'route_id',
        'shipment_id',
        'stop_type',
        'stop_order',
        'latitude',
        'longitude',
        'address',
        'city',
        'status',
        'estimated_arrival',
        'completed_at',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'stop_order' => 'integer',
        'estimated_arrival' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function route()
    {
        return $this->belongsTo(DeliveryRoute::class, 'route_id');
    }

    public function shipment()
    {
        return $this->belongsTo(Shipment::class, 'shipment_id');
    }
}
