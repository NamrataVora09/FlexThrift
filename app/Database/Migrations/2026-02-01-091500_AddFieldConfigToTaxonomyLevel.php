<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddFieldConfigToTaxonomyLevel extends Migration
{
    public function up()
    {
        $fields = [
            'field_config' => [
                'type' => 'TEXT',
                'null' => true,
                'comment' => 'Custom attributes as JSON',
            ],
        ];
        $this->forge->addColumn('categories', $fields);
        $this->forge->addColumn('sub_categories', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('categories', 'field_config');
        $this->forge->dropColumn('sub_categories', 'field_config');
    }
}
