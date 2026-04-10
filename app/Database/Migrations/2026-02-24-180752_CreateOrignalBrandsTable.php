<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateOrignalBrandsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true
            ],
            'brand_name' => [
                'type' => 'VARCHAR',
                'constraint' => 150
            ],
            'brand_image' => [
                'type' => 'VARCHAR',
                'constraint' => 255,
                'null' => true
            ],
            'description' => [
                'type' => 'TEXT',
                'null' => true
            ],
            'is_active' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1
            ],
            'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
            'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('orignal_brands');

        // Add column to products table
        $this->forge->addColumn('products', [
            'orignal_brand_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'null' => true,
                'after' => 'brand_id'
            ]
        ]);
    }

    public function down()
    {
        $this->forge->dropTable('orignal_brands');
        $this->forge->dropColumn('products', 'orignal_brand_id');
    }
}
