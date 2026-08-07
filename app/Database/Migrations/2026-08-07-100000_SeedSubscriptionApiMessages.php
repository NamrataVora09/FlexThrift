<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Seeds all subscription-related API response message keys that were
 * missing from the original SeedAllApiResponseMessages migration.
 *
 * This migration is safe to run multiple times – existing rows are skipped.
 *
 * New keys added:
 *  - plan_requires_payment           (free-plan activation guard)
 *  - subscription_activate_failed    (DB insert failure)
 *  - subscription_plan_activated     (free / admin plan activated OK)
 *  - payment_subscription_activated  (PhonePe payment + activation OK)
 *  - subscription_already_active_verify (verify-payment: already paid)
 *  - seller_subscription_zero_uploads   (plan limit = 0 guard)
 *  - seller_subscription_expired        (dynamic template with {date})
 *  - buyer_subscription_expired         (dynamic template with {date})
 *  - seller_upload_limit_reached        (dynamic template with {n})
 */
class SeedSubscriptionApiMessages extends Migration
{
    private array $messages = [
        // -- SUBSCRIPTION FLOW
        ['message_key' => 'plan_requires_payment',         'message_value' => 'This plan requires payment',                                                                        'category' => 'error'],
        ['message_key' => 'subscription_activate_failed',  'message_value' => 'Failed to activate subscription',                                                                   'category' => 'error'],
        ['message_key' => 'subscription_plan_activated',   'message_value' => 'Plan activated successfully',                                                                       'category' => 'success'],
        ['message_key' => 'payment_subscription_activated','message_value' => 'Payment successful! Subscription activated.',                                                       'category' => 'success'],
        ['message_key' => 'subscription_already_active_verify', 'message_value' => 'Subscription is already active',                                                              'category' => 'info'],

        // -- SELLER SUBSCRIPTION GUARDS
        // NOTE: {date} and {n} are runtime placeholders resolved by BaseApiController::translateMessage()
        ['message_key' => 'seller_subscription_zero_uploads', 'message_value' => 'Your subscription plan has 0 product uploads. Please upgrade your plan to upload products.',    'category' => 'error'],
        ['message_key' => 'seller_subscription_expired',   'message_value' => 'Your subscription has expired on {date}. Please renew your plan to upload products.',              'category' => 'error'],
        ['message_key' => 'seller_upload_limit_reached',   'message_value' => 'You have reached your product upload limit ({n} uploads). Please upgrade your plan to upload more products.', 'category' => 'error'],

        // -- BUYER SUBSCRIPTION GUARDS
        ['message_key' => 'buyer_subscription_expired',    'message_value' => 'Your buyer subscription expired on {date}. Please renew your plan to view contact details.',       'category' => 'error'],
    ];

    public function up()
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        foreach ($this->messages as $msg) {
            $key      = $msg['message_key'];
            $existing = $db->table('app_messages')->where('message_key', $key)->get()->getRowArray();
            if (!$existing) {
                $db->table('app_messages')->insert([
                    'message_key'   => $key,
                    'message_value' => $msg['message_value'],
                    'category'      => $msg['category'],
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ]);
            }
        }
    }

    public function down()
    {
        $db   = \Config\Database::connect();
        $keys = array_column($this->messages, 'message_key');
        if (!empty($keys)) {
            $db->table('app_messages')->whereIn('message_key', $keys)->delete();
        }
    }
}
