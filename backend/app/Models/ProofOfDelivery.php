<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProofOfDelivery extends Model
{
    use HasFactory;

    protected $table = 'proof_of_deliveries';

    protected $fillable = [
        'shipment_id',
        'recipient_name',
        'delivery_note',
        'otp_code',
        'verified_at',
        'photo_path',
        'signature_path',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
    ];

    public function shipment()
    {
        return $this->belongsTo(Shipment::class, 'shipment_id');
    }
}
