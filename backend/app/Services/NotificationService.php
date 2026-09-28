<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    /**
     * Send an in-app notification to a user.
     */
    public static function send(int $userId, string $type, string $title, string $message, ?int $shipmentId = null, string $channel = 'in_app'): Notification
    {
        return Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'shipment_id' => $shipmentId,
            'channel' => $channel,
        ]);
    }

    /**
     * Notify all Admins in the platform.
     */
    public static function notifyAdmins(string $type, string $title, string $message, ?int $shipmentId = null): void
    {
        $admins = User::where('role', 'admin')->pluck('id');
        foreach ($admins as $adminId) {
            self::send($adminId, $type, $title, $message, $shipmentId);
        }
    }
}
