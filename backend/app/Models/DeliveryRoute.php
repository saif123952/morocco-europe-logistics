<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryRoute extends Model
{
    use HasFactory;

    protected $fillable = [
        'driver_id',
        'status',
        'total_distance_km',
        'estimated_duration_min',
    ];

    protected $casts = [
        'total_distance_km' => 'float',
        'estimated_duration_min' => 'integer',
    ];

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function stops()
    {
        return $this->hasMany(RouteStop::class, 'route_id')->orderBy('stop_order', 'asc');
    }
}
