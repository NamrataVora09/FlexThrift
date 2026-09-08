<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddCityAndZoneTypeToAllowedZones extends Migration
{
    public function up()
    {
        $fields = $this->db->getFieldNames('allowed_zones');
        if (!in_array('zone_type', $fields)) {
            $this->forge->addColumn('allowed_zones', [
                'zone_type' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 50,
                    'null'       => false,
                    'default'    => 'polygon',
                    'after'      => 'zone_name',
                ],
            ]);
        }
        if (!in_array('city', $fields)) {
            $this->forge->addColumn('allowed_zones', [
                'city' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => true,
                    'default'    => null,
                    'after'      => 'state_code',
                ],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('allowed_zones', 'zone_type');
        $this->forge->dropColumn('allowed_zones', 'city');
    }
}
