<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddDeliveryAddressToOffers extends Migration
{
    public function up()
    {
        $fields = [
            'delivery_address' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'offer_type'
            ],
            'delivery_pin_code' => [
                'type' => 'VARCHAR',
                'constraint' => '20',
                'null' => true,
                'after' => 'delivery_address'
            ],
        ];
        $this->forge->addColumn('offers', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('offers', ['delivery_address', 'delivery_pin_code']);
    }
}
