<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddReliabilityScoresToUsers extends Migration
{
    public function up()
    {
        $fields = [
            'buyer_rent_reliability_score' => [
                'type' => 'DECIMAL',
                'constraint' => '3,2',
                'default' => 0.00,
                'after' => 'seller_reliability_score',
            ],
            'buyer_buy_reliability_score' => [
                'type' => 'DECIMAL',
                'constraint' => '3,2',
                'default' => 0.00,
                'after' => 'buyer_rent_reliability_score',
            ],
            'buyer_overall_reliability_score' => [
                'type' => 'DECIMAL',
                'constraint' => '3,2',
                'default' => 0.00,
                'after' => 'buyer_buy_reliability_score',
            ],
            'seller_rent_reliability_score' => [
                'type' => 'DECIMAL',
                'constraint' => '3,2',
                'default' => 0.00,
                'after' => 'buyer_overall_reliability_score',
            ],
            'seller_sell_reliability_score' => [
                'type' => 'DECIMAL',
                'constraint' => '3,2',
                'default' => 0.00,
                'after' => 'seller_rent_reliability_score',
            ],
            'delivery_rental_reliability_score' => [
                'type' => 'DECIMAL',
                'constraint' => '3,2',
                'default' => 0.00,
                'after' => 'seller_sell_reliability_score',
            ],
            'delivery_sale_reliability_score' => [
                'type' => 'DECIMAL',
                'constraint' => '3,2',
                'default' => 0.00,
                'after' => 'delivery_rental_reliability_score',
            ],
        ];

        $this->forge->addColumn('users', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('users', [
            'buyer_rent_reliability_score',
            'buyer_buy_reliability_score',
            'buyer_overall_reliability_score',
            'seller_rent_reliability_score',
            'seller_sell_reliability_score',
            'delivery_rental_reliability_score',
            'delivery_sale_reliability_score',
        ]);
    }
}
