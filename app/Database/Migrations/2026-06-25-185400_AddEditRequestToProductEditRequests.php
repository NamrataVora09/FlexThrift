<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddEditRequestToProductEditRequests extends Migration
{
    public function up()
    {
        $this->forge->addColumn('product_edit_requests', [
            'edit_request' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'status',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('product_edit_requests', 'edit_request');
    }
}
