<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddUsageLabelToProducts extends Migration
{
    public function up()
    {
        $db = $this->db;
        
        // Check if column exists before adding it
        $columns = $db->getFieldData('products');
        $columnNames = array_map(function($col) { return $col->name; }, $columns);
        
        // Add usage_label column - only if it doesn't exist
        if (!in_array('usage_label', $columnNames)) {
            $this->forge->addColumn('products', [
                'usage_label' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 100,
                    'null'       => true,
                    'default'    => 'Times Used',
                    'after'      => 'used_times',
                ],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('products', 'usage_label');
    }
}
