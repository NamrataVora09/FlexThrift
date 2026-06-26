<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateProductEditRequests extends Migration
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
            'product_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'updated_data' => [
                'type' => 'TEXT',
                'null' => false,
            ],
            'temp_images' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'deleted_images_ids' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'original_images_snapshot' => [
                'type' => 'TEXT',
                'null' => true,
                'comment' => 'Snapshot of original product images at time of first edit request',
            ],
            'status' => [
                'type' => 'ENUM',
                'constraint' => ['pending', 'approved', 'rejected'],
                'default' => 'pending',
            ],
            'admin_remarks' => [
                'type' => 'TEXT',
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
        $this->forge->addForeignKey('product_id', 'products', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('product_edit_requests');
    }

    public function down()
    {
        $this->forge->dropTable('product_edit_requests');
    }
}
