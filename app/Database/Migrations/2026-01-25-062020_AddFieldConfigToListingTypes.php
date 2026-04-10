<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddFieldConfigToListingTypes extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('field_config', 'listing_types')) {
            $fields = [
                'field_config' => [
                    'type' => 'JSON',
                    'null' => true,
                    'after' => 'type_name'
                ],
            ];
            $this->forge->addColumn('listing_types', $fields);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('listing_types', 'field_config');
    }
}
