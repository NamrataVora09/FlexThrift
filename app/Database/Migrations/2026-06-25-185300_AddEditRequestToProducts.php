<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddEditRequestToProducts extends Migration
{
    public function up()
    {
        $this->forge->addColumn('products', [
            'edit_request' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'pending_reason',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('products', 'edit_request');
    }
}
