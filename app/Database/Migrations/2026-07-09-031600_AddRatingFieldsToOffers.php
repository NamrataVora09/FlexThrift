<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddRatingFieldsToOffers extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        $existingColumns = $db->getFieldNames('offers');
        
        $fields = [];
        if (!in_array('seller_rated_buyer', $existingColumns)) {
            $fields['seller_rated_buyer'] = [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'null' => false,
                'after' => 'rejected_at',
            ];
        }
        if (!in_array('buyer_rated_seller', $existingColumns)) {
            $fields['buyer_rated_seller'] = [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'null' => false,
                'after' => 'seller_rated_buyer',
            ];
        }

        if (!empty($fields)) {
            $this->forge->addColumn('offers', $fields);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('offers', ['seller_rated_buyer', 'buyer_rated_seller']);
    }
}
