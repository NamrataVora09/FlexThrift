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

        // validation_error — generic field validation error (e.g. Listing Type required)
        ['message_key' => 'validation_error', 'message_value' => 'Please fix the validation errors before submitting.', 'category' => 'error'],

        // wishlist_added — shown when a product is added to the wishlist
        ['message_key' => 'wishlist_added', 'message_value' => 'Added to wishlist!', 'category' => 'success'],
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
