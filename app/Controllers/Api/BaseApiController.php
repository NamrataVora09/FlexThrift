<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
/**
 * BaseApiController
 *
 * Every API controller extends this class. The respond() method is overridden
 * to intercept the 'message' field of every JSON response and replace it with
 * the value stored in the `app_messages` database table (keyed by $messageKeyMap).
 *
 * This means the SuperAdmin can customise every API response message from the
 * Business Settings → App Messages page without touching code.
 *
 * HOW IT WORKS
 * ─────────────
 *  1. Controller calls:  $this->respond(['success' => false, 'message' => 'User not found'], 404)
 *  2. respond() calls translateResponseData() which finds the 'message' key.
 *  3. translateMessage() looks up 'User not found' in $messageKeyMap → 'user_not_found'.
 *  4. getAppMessage('user_not_found', 'User not found') fetches the DB row.
 *  5. The DB value (customised by superadmin) is returned instead of the hardcoded string.
 *
 * ADDING NEW MESSAGES
 * ────────────────────
 *  1. Add the hardcoded string → 'db_key' to $messageKeyMap below.
 *  2. Insert a row in app_messages with that message_key.
 *  3. No other code changes required – the interception is automatic.
 */
class BaseApiController extends ResourceController
{
    protected $format = 'json';

    /**
     * Recalibrates the start and end dates of queued subscriptions for a user when their active plan changes or is depleted.
     * This is useful to pull forward queued plans when a quantity-based plan is fully used.
     */
    protected function recalibrateUserSubscriptions($userId, $userType)
    {
        $db = \Config\Database::connect();
        
        // 1. Get all active, paid, and non-expired subscriptions for this user and type
        $subs = $db->table('user_subscriptions us')
            ->select('us.*, sp.duration_hours, sp.plan_type')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->where('us.user_id', $userId)
            ->where('us.is_active', 1)
            ->where('us.payment_status', 'paid')
            ->where('sp.user_type', $userType)
            ->where('us.expires_at >=', date('Y-m-d H:i:s'))
            ->orderBy('us.starts_at', 'ASC')
            ->orderBy('us.id', 'ASC')
            ->get()->getResultArray();

        if (empty($subs)) {
            return;
        }

        $currentTime = time();
        $baseTime = $currentTime; // starts_at for the first queued plan we pull forward
        
        $updatedExpiry = null;

        foreach ($subs as $index => $sub) {
            $startsAtTime = strtotime($sub['starts_at']);
            $expiresAtTime = strtotime($sub['expires_at']);
            
            if ($index === 0) {
                if ($startsAtTime > $currentTime) {
                    // This plan was queued in the future! Pull it forward to start now.
                    $newStartsAt = date('Y-m-d H:i:s', $currentTime);
                    $durationHours = (float) $sub['duration_hours'];
                    
                    // Check if it's a lifetime plan (expires_at is 2099-12-31)
                    $isLifetime = ($sub['expires_at'] === '2099-12-31 23:59:59' || $durationHours <= 0);
                    $newExpiresAt = $isLifetime 
                        ? '2099-12-31 23:59:59' 
                        : date('Y-m-d H:i:s', $currentTime + (int)round($durationHours * 3600));

                    $db->table('user_subscriptions')->where('id', $sub['id'])->update([
                        'starts_at' => $newStartsAt,
                        'expires_at' => $newExpiresAt,
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                    
                    $baseTime = $isLifetime ? strtotime('2099-12-31 23:59:59') : ($currentTime + (int)round($durationHours * 3600));
                    $updatedExpiry = $newExpiresAt;
                } else {
                    // It's already running. Keep its current expires_at as the base time for any subsequent queued plans.
                    $baseTime = $expiresAtTime;
                    $updatedExpiry = $sub['expires_at'];
                }
            } else {
                // For subsequent stacked plans: start exactly when the previous one expires.
                $newStartsAt = date('Y-m-d H:i:s', $baseTime);
                $durationHours = (float) $sub['duration_hours'];
                $newBase = $baseTime;
                
                $isLifetime = ($sub['expires_at'] === '2099-12-31 23:59:59' || $durationHours <= 0);
                $newExpiresAt = $isLifetime
                    ? '2099-12-31 23:59:59'
                    : date('Y-m-d H:i:s', $newBase + (int)round($durationHours * 3600));

                $db->table('user_subscriptions')->where('id', $sub['id'])->update([
                    'starts_at' => $newStartsAt,
                    'expires_at' => $newExpiresAt,
                    'updated_at' => date('Y-m-d H:i:s')
                ]);

                $baseTime = $isLifetime ? strtotime('2099-12-31 23:59:59') : ($newBase + (int)round($durationHours * 3600));
                
                if ($newExpiresAt > $updatedExpiry) {
                    $updatedExpiry = $newExpiresAt;
                }
            }
        }
        
        // 2. Synchronize the `users` table fields: `subscription_tier` and `subscription_expires_at`
        $latestOverall = $db->table('user_subscriptions us')
            ->select('us.expires_at, sp.name')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->where('us.user_id', $userId)
            ->where('us.is_active', 1)
            ->where('us.payment_status', 'paid')
            ->where('us.expires_at >=', date('Y-m-d H:i:s'))
            ->orderBy('us.expires_at', 'DESC')
            ->get()->getRowArray();
            
        if ($latestOverall) {
            $db->table('users')->where('id', $userId)->update([
                'subscription_tier' => $latestOverall['name'],
                'subscription_expires_at' => $latestOverall['expires_at'],
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        } else {
            $db->table('users')->where('id', $userId)->update([
                'subscription_tier' => 'Free',
                'subscription_expires_at' => null,
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        }
    }
}
