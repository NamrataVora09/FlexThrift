<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSellerAndListingTypeToOrignalBrands extends Migration
{
    public function up()
    {
        $this->forge->addColumn('orignal_brands', [
            'seller_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'id',
            ],
            'listing_type_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'seller_id',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('orignal_brands', 'seller_id');
        $this->forge->dropColumn('orignal_brands', 'listing_type_id');
    }
}
