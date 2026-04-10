<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddDeliveryPhotoToOrders extends Migration
{
    public function up()
    {
        $this->forge->addColumn('orders', [
            'delivery_photo' => [
                'type'       => 'VARCHAR',
                'constraint' => 500,
                'null'       => true,
                'default'    => null,
                'after'      => 'dispatched_at',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('orders', 'delivery_photo');
    }
}
