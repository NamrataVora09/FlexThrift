<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddQuantityToProducts extends Migration
{
    public function up()
    {
        $fields = [
            'quantity' => [
                'type'       => 'INT',
                'constraint' => 11,
                'default'    => 1,
                'after'      => 'status',
            ],
            'available_quantity' => [
                'type'       => 'INT',
                'constraint' => 11,
                'default'    => 1,
                'after'      => 'quantity',
            ],
        ];
        $this->forge->addColumn('products', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('products', ['quantity', 'available_quantity']);
    }
}
