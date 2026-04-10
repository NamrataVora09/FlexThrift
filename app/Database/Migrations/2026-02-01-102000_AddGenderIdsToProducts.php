<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddGenderIdsToProducts extends Migration
{
    public function up()
    {
        $fields = [
            'gender_ids' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'gender',
                'comment' => 'Multiple gender names as JSON array',
            ],
        ];
        $this->forge->addColumn('products', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('products', 'gender_ids');
    }
}
