<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddOfferTypeAndDepositToOffers extends Migration
{
    public function up()
    {
        $fields = [
            'offer_type' => [
                'type' => 'ENUM',
                'constraint' => ['buy', 'rent'],
                'default' => 'buy',
                'after' => 'status',
            ],
            'deposit_amount' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
                'after' => 'offer_type',
            ],
        ];

        $this->forge->addColumn('offers', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('offers', ['offer_type', 'deposit_amount']);
    }
}
