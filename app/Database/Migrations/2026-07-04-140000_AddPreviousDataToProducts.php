<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPreviousDataToProducts extends Migration
{
    public function up()
    {
        $db = $this->db;
        
        // Check if column exists before adding it
        $columns = $db->getFieldData('products');
        $columnNames = array_map(function($col) { return $col->name; }, $columns);
        
        // Add previous_data column - only if it doesn't exist
        if (!in_array('previous_data', $columnNames)) {
            $this->forge->addColumn('products', [
                'previous_data' => [
                    'type'       => 'TEXT',
                    'null'       => true,
                    'comment'    => 'JSON snapshot of product data before edit for comparison',
                    'after'      => 'admin_remarks',
                ],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('products', 'previous_data');
    }
}
