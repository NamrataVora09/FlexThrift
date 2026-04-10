<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreatePlatformChargesTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'charge_name' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
            ],
            'charge_type' => [
                'type' => 'ENUM',
                'constraint' => ['fixed', 'percentage'],
                'default' => 'percentage',
            ],
            'charge_value' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'default' => 0.00,
            ],
            'is_active' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
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
        $this->forge->createTable('platform_charges');
    }

    public function down()
    {
        $this->forge->dropTable('platform_charges');
    }
}
