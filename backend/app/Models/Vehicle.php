<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Vehicle extends Model
{
    use HasFactory;

    protected $fillable = [
        'driver_id',
        'vehicle_type',
        'registration_number',
        'max_weight_kg',
        'max_volume_m3',
        'current_loaded_weight_kg',
        'current_loaded_volume_m3',
    ];

    protected $casts = [
        'max_weight_kg' => 'float',
        'max_volume_m3' => 'float',
        'current_loaded_weight_kg' => 'float',
        'current_loaded_volume_m3' => 'float',
    ];

    public function driver()
    {
        return $this->belongsTo(User::class, 'driver_id');
    }

    public function getAvailableWeightKgAttribute(): float
    {
        return max(0, $this->max_weight_kg - $this->current_loaded_weight_kg);
    }

    public function getAvailableVolumeM3Attribute(): float
    {
        return max(0, $this->max_volume_m3 - $this->current_loaded_volume_m3);
    }

    public function canFit(float $weightKg, float $volumeM3): bool
    {
        return ($this->current_loaded_weight_kg + $weightKg <= $this->max_weight_kg) &&
               ($this->current_loaded_volume_m3 + $volumeM3 <= $this->max_volume_m3);
    }
}
