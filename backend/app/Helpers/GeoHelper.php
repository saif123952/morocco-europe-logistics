<?php

namespace App\Helpers;

class GeoHelper
{
    /**
     * Calculate Haversine distance between two sets of GPS coordinates in kilometers.
     */
    public static function haversine(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadius = 6371; // Earth's radius in kilometers

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadius * $c, 2);
    }

    /**
     * Calculate initial compass bearing from point A to point B in degrees (0..360).
     */
    public static function bearing(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $lat1Rad = deg2rad($lat1);
        $lat2Rad = deg2rad($lat2);
        $dLonRad = deg2rad($lon2 - $lon1);

        $y = sin($dLonRad) * cos($lat2Rad);
        $x = cos($lat1Rad) * sin($lat2Rad) - sin($lat1Rad) * cos($lat2Rad) * cos($dLonRad);

        $bearing = rad2deg(atan2($y, $x));
        return fmod(($bearing + 360), 360);
    }

    /**
     * Difference in degrees between two bearings (0..180).
     */
    public static function bearingDelta(float $bearing1, float $bearing2): float
    {
        $diff = abs($bearing1 - $bearing2);
        return $diff > 180 ? 360 - $diff : $diff;
    }
}
