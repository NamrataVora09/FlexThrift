<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateDeliveryPersonsTable extends Migration
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
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'vehicle_type' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
            ],
            'vehicle_number' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
            ],
            'license_number' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
            ],
            'available_cities' => [
                'type' => 'TEXT',
            ],
            'is_available' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
            ],
            'total_deliveries' => [
                'type' => 'INT',
                'default' => 0,
            ],
            'rating' => [
                'type' => 'DECIMAL',
                'constraint' => '3,2',
                'default' => 0,
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
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('delivery_persons');
    }

    public function down()
    {
        $this->forge->dropTable('delivery_persons');
    }
}
