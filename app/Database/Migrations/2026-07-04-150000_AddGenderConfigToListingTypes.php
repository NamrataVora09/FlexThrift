<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddGenderConfigToListingTypes extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('gender_config', 'listing_types')) {
            $fields = [
                'gender_config' => [
                    'type' => 'VARCHAR',
                    'constraint' => 20,
                    'null' => true,
                    'after' => 'field_config',
                    'comment' => 'Gender requirement: optional, mandatory, or hidden'
                ],
            ];
            $this->forge->addColumn('listing_types', $fields);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('listing_types', 'gender_config');
    }
}
