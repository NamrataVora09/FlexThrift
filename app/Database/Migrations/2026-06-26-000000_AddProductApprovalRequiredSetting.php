<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddProductApprovalRequiredSetting extends Migration
{
    public function up()
    {
        $db = $this->db;
        
        // Check if setting already exists
        $existing = $db->table('system_settings')
            ->where('setting_key', 'product_approval_required')
            ->get()
            ->getRowArray();
        
        if (!$existing) {
            $db->table('system_settings')->insert([
                'setting_key' => 'product_approval_required',
                'setting_value' => '1',
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }
    }

    public function down()
    {
        $this->db->table('system_settings')
            ->where('setting_key', 'product_approval_required')
            ->delete();
    }
}
