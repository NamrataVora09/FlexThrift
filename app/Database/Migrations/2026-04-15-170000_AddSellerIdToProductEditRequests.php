<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSellerIdToProductEditRequests extends Migration
{
    public function up()
    {
        $fields = [
            'seller_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'after'      => 'product_id',
                'null'       => true,
            ],
        ];
        $this->forge->addColumn('product_edit_requests', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('product_edit_requests', 'seller_id');
    }
}
