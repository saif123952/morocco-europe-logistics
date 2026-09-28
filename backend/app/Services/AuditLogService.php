<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogService
{
    /**
     * Record an administrative or sensitive action in audit log.
     */
    public static function log(string $action, string $targetType, int $targetId, ?array $metadata = null, ?Request $request = null): AuditLog
    {
        $actor = $request ? $request->user() : auth()->user();

        return AuditLog::create([
            'actor_id' => $actor ? $actor->id : null,
            'actor_role' => $actor ? $actor->role : 'system',
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'ip_address' => $request ? $request->ip() : null,
            'user_agent' => $request ? substr($request->userAgent() ?? '', 0, 500) : null,
            'metadata' => $metadata,
        ]);
    }
}
