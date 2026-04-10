<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddDeliveryLocationFields extends Migration
{
    public function up()
    {
        // Add to offers table
        $fields = [
            'delivery_country' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
                'null' => true,
                'after' => 'delivery_pin_code'
            ],
            'delivery_state' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
                'null' => true,
                'after' => 'delivery_country'
            ],
            'delivery_city' => [
                'type' => 'VARCHAR',
                'constraint' => '100',
                'null' => true,
                'after' => 'delivery_state'
            ],
        ];
        $this->forge->addColumn('offers', $fields);

        // Add to orders table
        $this->forge->addColumn('orders', $fields);
    }

    public function down()
    {
        $cols = ['delivery_country', 'delivery_state', 'delivery_city'];
        $this->forge->dropColumn('offers', $cols);
        $this->forge->dropColumn('orders', $cols);
    }
}
