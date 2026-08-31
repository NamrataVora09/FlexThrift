<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class RecreateAppMessagesTable extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        
        $migratedData = [];
        
        // 1. If old app_messages table exists, fetch its data to preserve it
        if ($db->tableExists('app_messages')) {
            $rows = $db->table('app_messages')->get()->getResultArray();
            foreach ($rows as $row) {
                $key = $row['key'] ?? ($row['message_key'] ?? null);
                $message = $row['message'] ?? ($row['message_value'] ?? null);
                
                if ($key !== null && $message !== null) {
                    $migratedData[] = [
                        'key'                => $key,
                        'message'            => $message,
                        'position_of_params' => null, // should be null
                    ];
                }
            }
            
            // 2. Drop the old app_messages table
            $this->forge->dropTable('app_messages', true);
        }
        
        // 3. Create the new app_messages table structure
        $this->forge->addField([
            'id'                 => ['type' => 'INT', 'auto_increment' => true],
            'key'                => ['type' => 'VARCHAR', 'constraint' => 255, 'unique' => true, 'null' => false],
            'message'            => ['type' => 'TEXT', 'null' => false],
            'position_of_params' => ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true, 'default' => null],
            'created_at'         => ['type' => 'TIMESTAMP', 'null' => true],
            'updated_at'         => ['type' => 'TIMESTAMP', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('app_messages');
        
        // 4. Insert the migrated data back into the new table
        if (!empty($migratedData)) {
            $db->table('app_messages')->insertBatch($migratedData);
        }
    }

    public function down()
    {
        $db = \Config\Database::connect();
        $migratedData = [];
        
        if ($db->tableExists('app_messages')) {
            $rows = $db->table('app_messages')->get()->getResultArray();
            foreach ($rows as $row) {
                $migratedData[] = [
                    'message_key'   => $row['key'],
                    'message_value' => $row['message'],
                    'category'      => 'general',
                ];
            }
            $this->forge->dropTable('app_messages', true);
        }
        
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'auto_increment' => true],
            'message_key'   => ['type' => 'VARCHAR', 'constraint' => 100, 'unique' => true],
            'message_value' => ['type' => 'TEXT'],
            'category'      => ['type' => 'VARCHAR', 'constraint' => 50, 'default' => 'general'],
            'created_at'    => ['type' => 'TIMESTAMP', 'null' => true],
            'updated_at'    => ['type' => 'TIMESTAMP', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('app_messages');
        
        if (!empty($migratedData)) {
            $db->table('app_messages')->insertBatch($migratedData);
        }
    }
}
