<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddListingTypeIdsToBrands extends Migration
{
    public function up()
    {
        // Add listing_type_id column first (for backward compatibility)
        $this->forge->addColumn('brands', [
            'listing_type_id' => [
                'type'       => 'INT',
                'constraint' => 11,
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'description',
            ],
        ]);

        // Add JSON field to store multiple listing type IDs
        $this->forge->addColumn('brands', [
            'listing_type_ids' => [
                'type'       => 'JSON',
                'null'       => true,
                'after'      => 'listing_type_id',
            ],
        ]);

        // Add foreign key for listing_type_id
        $this->forge->addForeignKey('listing_type_id', 'listing_types', 'id', 'SET NULL', 'CASCADE');
    }

    public function down()
    {
        $this->forge->dropColumn('brands', ['listing_type_ids', 'listing_type_id']);
    }
}
