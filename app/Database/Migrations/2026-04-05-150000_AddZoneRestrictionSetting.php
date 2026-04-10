<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddZoneRestrictionSetting extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        $exists = $db->table('system_settings')->where('setting_key', 'enable_zone_restriction')->countAllResults();
        
        if (!$exists) {
            $db->table('system_settings')->insert([
                'setting_key'   => 'enable_zone_restriction',
                'setting_value' => '1',
                'updated_at'    => date('Y-m-d H:i:s'),
            ]);
        }
    }

    public function down()
    {
        $db = \Config\Database::connect();
        $db->table('system_settings')->where('setting_key', 'enable_zone_restriction')->delete();
    }
}
