<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateUsersTable extends Migration
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
            'name' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
            ],
            'email' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
                'unique'     => true,
            ],
            'mobile' => [
                'type'       => 'VARCHAR',
                'constraint' => '15',
            ],
            'address' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'pin_code' => [
                'type'       => 'VARCHAR',
                'constraint' => '10',
            ],
            'user_type' => [
                'type'       => 'ENUM',
                'constraint' => ['seller', 'buyer'],
                'default'    => 'buyer',
            ],
            'otp' => [
                'type'       => 'VARCHAR',
                'constraint' => '6',
                'null'       => true,
            ],
            'otp_expires_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'is_verified' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 0,
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
        $this->forge->createTable('users');
    }

    public function down()
    {
        $this->forge->dropTable('users');
    }
}
