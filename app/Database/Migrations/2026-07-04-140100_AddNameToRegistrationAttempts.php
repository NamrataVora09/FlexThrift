<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddNameToRegistrationAttempts extends Migration
{
    public function up()
    {
        $db = $this->db;
        
        // Check if column exists before adding it
        $columns = $db->getFieldData('registration_attempts');
        $columnNames = array_map(function($col) { return $col->name; }, $columns);
        
        // Add name column - only if it doesn't exist
        if (!in_array('name', $columnNames)) {
            $this->forge->addColumn('registration_attempts', [
                'name' => [
                    'type'       => 'VARCHAR',
                    'constraint' => 255,
                    'null'       => true,
                    'after'      => 'id',
                ],
            ]);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('registration_attempts', 'name');
    }
}
