<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class MarkExpiredOffersAsMissed extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();

        // Read the configured acceptance limit (default 7 days)
        $row = $db->table('system_settings')
            ->where('setting_key', 'offer_acceptance_limit_days')
            ->get()->getRowArray();
        $limitDays = isset($row['setting_value']) ? (int) $row['setting_value'] : 7;

        $cutoff = date('Y-m-d H:i:s', strtotime("-{$limitDays} days"));

        // Mark all pending offers older than the limit as missed
        $db->table('offers')
            ->where('status', 'pending')
            ->where('created_at <', $cutoff)
            ->update([
                'status'     => 'missed',
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
    }

    public function down()
    {
        // Revert missed → pending (for rollback only — loses original intent)
        $db = \Config\Database::connect();
        $db->table('offers')
            ->where('status', 'missed')
            ->update([
                'status'     => 'pending',
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
    }
}
