<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateUserReportsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'reporter_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'reported_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
            ],
            'reporter_role' => [
                'type'       => 'VARCHAR',
                'constraint' => 50,
            ],
            'reason' => [
                'type' => 'TEXT',
            ],
            'status' => [
                'type'       => 'ENUM',
                'constraint' => ['pending', 'reviewed', 'dismissed'],
                'default'    => 'pending',
            ],
            'assigned_admin_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'default'    => null,
            ],
            'reviewed_by' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'default'    => null,
            ],
            'admin_notes' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'action_taken' => [
                'type'       => 'ENUM',
                'constraint' => ['none', 'suspended', 'blocked', 'dismissed'],
                'default'    => 'none',
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addKey(['reporter_id', 'reported_id', 'created_at']);
        $this->forge->createTable('user_reports');
    }

    public function down()
    {
        $this->forge->dropTable('user_reports');
    }
}
