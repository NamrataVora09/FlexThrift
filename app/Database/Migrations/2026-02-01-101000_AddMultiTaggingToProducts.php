<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddMultiTaggingToProducts extends Migration
{
    public function up()
    {
        $fields = [
            'category_ids' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'category',
                'comment' => 'Multiple category IDs as JSON array',
            ],
            'sub_category_ids' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'sub_category',
                'comment' => 'Multiple sub-category IDs as JSON array',
            ],
        ];
        $this->forge->addColumn('products', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('products', ['category_ids', 'sub_category_ids']);
    }
}
