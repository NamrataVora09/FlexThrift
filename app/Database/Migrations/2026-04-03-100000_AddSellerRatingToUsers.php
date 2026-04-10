<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSellerRatingToUsers extends Migration
{
    public function up()
    {
        $this->forge->addColumn('users', [
            'seller_rating_avg' => [
                'type'       => 'DECIMAL',
                'constraint' => '3,2',
                'default'    => 0.00,
                'null'       => true,
                'after'      => 'updated_at',
            ],
            'seller_rating_count' => [
                'type'       => 'INT',
                'constraint' => 11,
                'default'    => 0,
                'null'       => true,
                'after'      => 'seller_rating_avg',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('users', ['seller_rating_avg', 'seller_rating_count']);
    }
}
