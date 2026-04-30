<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddDashboardSubtitlesToAppMessages extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();

        $messages = [
            [
                'message_key'   => 'seller_dashboard_subtitle',
                'message_value' => 'Manage your listings, track offers, and grow your business.',
                'category'      => 'general',
                'created_at'    => date('Y-m-d H:i:s'),
                'updated_at'    => date('Y-m-d H:i:s'),
            ],
            [
                'message_key'   => 'buyer_dashboard_subtitle',
                'message_value' => 'Browse millions of unique fashion gems and track your rental orders.',
                'category'      => 'general',
                'created_at'    => date('Y-m-d H:i:s'),
                'updated_at'    => date('Y-m-d H:i:s'),
            ],
        ];

        foreach ($messages as $msg) {
            $existing = $db->table('app_messages')
                ->where('message_key', $msg['message_key'])
                ->get()
                ->getRowArray();

            if (!$existing) {
                $db->table('app_messages')->insert($msg);
            }
        }
    }

    public function down()
    {
        $db = \Config\Database::connect();
        $db->table('app_messages')
            ->whereIn('message_key', ['seller_dashboard_subtitle', 'buyer_dashboard_subtitle'])
            ->delete();
    }
}
