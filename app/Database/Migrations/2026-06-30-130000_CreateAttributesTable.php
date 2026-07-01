<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAttributesTable extends Migration
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
            'name' => [
                'type' => 'VARCHAR',
                'constraint' => 100,
            ],
            'type' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
                'comment' => 'text, number, select, checkbox, radio, date',
                'default' => 'text',
            ],
            'required' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
            ],
            'allowed_values' => [
                'type' => 'JSON',
                'null' => true,
                'comment' => 'Array of possible values for select/radio/checkbox types',
            ],
            'placeholder' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
                'null' => true,
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
        $this->forge->createTable('attributes');
    }

    public function down()
    {
        $this->forge->dropTable('attributes');
    }
}
