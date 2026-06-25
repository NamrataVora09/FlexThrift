<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddAdminEditFieldsToProductEditRequests extends Migration
{
    public function up()
    {
        $this->forge->addColumn('product_edit_requests', [
            'previous_data' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'deleted_images_ids',
            ],
            'editor_role' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
                'null' => true,
                'after' => 'previous_data',
            ],
            'editor_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
                'after' => 'editor_role',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('product_edit_requests', ['previous_data', 'editor_role', 'editor_id']);
    }
}
