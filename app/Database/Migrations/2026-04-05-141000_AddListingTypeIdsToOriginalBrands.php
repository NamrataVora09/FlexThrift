<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddListingTypeIdsToOriginalBrands extends Migration
{
    public function up()
    {
        // Add JSON field to store multiple listing type IDs
        $fields = [
            'listing_type_ids' => [
                'type'       => 'JSON',
                'null'       => true,
                'after'      => 'listing_type_id',
            ],
        ];
        $this->forge->addColumn('orignal_brands', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('orignal_brands', ['listing_type_ids']);
    }
}
