<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddTargetUrlToAdvertisements extends Migration
{
    public function up()
    {
        if ($this->db->tableExists('advertisements')) {
            if (!$this->db->fieldExists('target_url', 'advertisements')) {
                $this->forge->addColumn('advertisements', [
                    'target_url' => [
                        'type' => 'VARCHAR',
                        'constraint' => 500,
                        'null' => true,
                        'after' => 'display_page',
                    ]
                ]);
            }
        }
    }

    public function down()
    {
        if ($this->db->tableExists('advertisements')) {
            if ($this->db->fieldExists('target_url', 'advertisements')) {
                $this->forge->dropColumn('advertisements', 'target_url');
            }
        }
    }
}
