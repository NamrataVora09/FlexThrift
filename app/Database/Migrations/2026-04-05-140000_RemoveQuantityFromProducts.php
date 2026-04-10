<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class RemoveQuantityFromProducts extends Migration
{
    public function up()
    {
        $this->forge->dropColumn('products', ['quantity']);
    }

    public function down()
    {
        $fields = [
            'quantity' => [
                'type'       => 'INT',
                'constraint' => 11,
                'default'    => 1,
                'after'      => 'status',
            ],
        ];
        $this->forge->addColumn('products', $fields);
    }
}
