<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Seeds the 4 real app_messages keys that were found to be missing
 * from all previous seeders but are referenced in the frontend/backend.
 */
class SeedMissingAppMessages extends Migration
{
    private array $messages = [
        // plan_duration_error — shown when a duration-based plan has no hours set
        ['message_key' => 'plan_duration_error', 'message_value' => 'Duration Hours cannot be zero or empty for a Duration Based plan.', 'category' => 'error'],

        // seo_setting_update_success — shown after SEO settings are saved
        ['message_key' => 'seo_setting_update_success', 'message_value' => 'SEO settings updated successfully!', 'category' => 'success'],

        // validation_error — field validation error
        ['message_key' => 'validation_error', 'message_value' => 'Please fix the validation errors before submitting.', 'category' => 'error'],

        // wishlist_added — shown when a product is added to the wishlist
        ['message_key' => 'wishlist_added', 'message_value' => 'Added to wishlist!', 'category' => 'success'],

        // subscription_assign_failed — error assigning subscription to user
        ['message_key' => 'subscription_assign_failed', 'message_value' => 'Failed to assign subscription to user. Please try again.', 'category' => 'error'],

        // admin_status_update_failed — error toggling admin status
        ['message_key' => 'admin_status_update_failed', 'message_value' => 'Failed to update administrator status.', 'category' => 'error'],

        // admin_role_update_failed — error toggling admin role operations
        ['message_key' => 'admin_role_update_failed', 'message_value' => 'Failed to update administrator role operations.', 'category' => 'error'],

        // admin_delete_failed — error deleting administrator
        ['message_key' => 'admin_delete_failed', 'message_value' => 'Failed to delete administrator account.', 'category' => 'error'],

        // admin_bulk_rights_failed — error in bulk rights toggle
        ['message_key' => 'admin_bulk_rights_failed', 'message_value' => 'Failed to bulk update administrator rights.', 'category' => 'error'],

        // notifications_mark_read_failed — error marking notifications as read
        ['message_key' => 'notifications_mark_read_failed', 'message_value' => 'Failed to mark notifications as read.', 'category' => 'error'],

        // offer_cancel_failed — error cancelling offer
        ['message_key' => 'offer_cancel_failed', 'message_value' => 'Failed to cancel offer.', 'category' => 'error'],

        // settings_update_failed — error saving business settings
        ['message_key' => 'settings_update_failed', 'message_value' => 'Failed to save business settings.', 'category' => 'error'],

        // app_messages_load_failed — error loading app messages
        ['message_key' => 'app_messages_load_failed', 'message_value' => 'Failed to load app messages.', 'category' => 'error'],

        // app_messages_update_failed — error updating app message
        ['message_key' => 'app_messages_update_failed', 'message_value' => 'Failed to update app message text.', 'category' => 'error'],
    ];

    public function up(): void
    {
        $db = \Config\Database::connect();

        foreach ($this->messages as $msg) {
            $existing = $db->table('app_messages')
                ->where('message_key', $msg['message_key'])
                ->get()
                ->getRowArray();

            if (!$existing) {
                $db->table('app_messages')->insert([
                    'message_key'   => $msg['message_key'],
                    'message_value' => $msg['message_value'],
                    'category'      => $msg['category'],
                    'created_at'    => date('Y-m-d H:i:s'),
                    'updated_at'    => date('Y-m-d H:i:s'),
                ]);
            }
        }
    }

    public function down(): void
    {
        $db = \Config\Database::connect();
        $keys = array_column($this->messages, 'message_key');
        $db->table('app_messages')->whereIn('message_key', $keys)->delete();
    }
}
