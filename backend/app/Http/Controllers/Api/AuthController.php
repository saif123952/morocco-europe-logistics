<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Shipment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'nullable|in:client,driver,admin',
            'phone' => 'nullable|string|max:50',
        ]);

        $role = $validated['role'] ?? 'client';

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $role,
            'phone' => $validated['phone'] ?? null,
            'status' => 'active',
        ]);

        // Auto-link any previous guest shipments matching this user's phone or email
        $linkedCount = $this->linkGuestShipments($user);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'User registered successfully',
            'user' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer',
            'linked_guest_shipments' => $linkedCount,
        ], 201);
    }

    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json(['message' => 'Your account is inactive.'], 403);
        }

        // Auto-link any previous guest shipments matching this user's phone or email
        $linkedCount = $this->linkGuestShipments($user);

        $user->tokens()->delete(); // clear old tokens
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful',
            'user' => $user,
            'access_token' => $token,
            'token_type' => 'Bearer',
            'linked_guest_shipments' => $linkedCount,
        ]);
    }

    /**
     * Link previous guest shipments (where sender_id IS NULL) matching user email or phone.
     */
    private function linkGuestShipments(User $user): int
    {
        if (!$user->isClient()) {
            return 0;
        }

        $query = Shipment::whereNull('sender_id')->where(function ($q) use ($user) {
            if (!empty($user->email)) {
                $q->orWhere('sender_email', $user->email);
            }
            if (!empty($user->phone)) {
                $q->orWhere('sender_phone', $user->phone);
            }
        });

        return $query->update(['sender_id' => $user->id]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }
}
