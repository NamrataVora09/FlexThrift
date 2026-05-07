<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddStateToAllowedZones extends Migration
{
    public function up(): void
    {
        // Add state column to allowed_zones if not already present
        $fields = $this->db->getFieldNames('allowed_zones');
        if (!in_array('state', $fields)) {
            $this->forge->addColumn('allowed_zones', [
                'state' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => true,
                    'default'    => null,
                    'after'      => 'zone_name',
                ],
            ]);
        }
        if (!in_array('state_code', $fields)) {
            $this->forge->addColumn('allowed_zones', [
                'state_code' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 10,
                    'null'       => true,
                    'default'    => null,
                    'after'      => 'state',
                ],
            ]);
        }
    }

    public function down(): void
    {
        $this->forge->dropColumn('allowed_zones', 'state');
        $this->forge->dropColumn('allowed_zones', 'state_code');
    }
}
