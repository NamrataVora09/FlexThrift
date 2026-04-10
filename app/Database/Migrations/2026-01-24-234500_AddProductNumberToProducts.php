<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddProductNumberToProducts extends Migration
{
    public function up()
    {
        $fields = [
            'product_number' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
                'null' => true,
                'after' => 'id',
            ],
        ];

        $this->forge->addColumn('products', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('products', 'product_number');
    }
}
