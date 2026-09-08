<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddOfferMissedMessageToAppMessages extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();

        $msg = [
            'message_key'   => 'offer_missed_message',
            'message_value' => 'This offer was marked as missed by the system. The seller did not respond within the allowed window (deadline: {deadline}). You can browse the marketplace to find similar items and make a new offer.',
            'category'      => 'info',
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s'),
        ];

        $existing = $db->table('app_messages')
            ->where('message_key', $msg['message_key'])
            ->get()
            ->getRowArray();

        if (!$existing) {
            $db->table('app_messages')->insert($msg);
        }
    }

    public function down()
    {
        $db = \Config\Database::connect();
        $db->table('app_messages')
            ->where('message_key', 'offer_missed_message')
            ->delete();
    }
}
