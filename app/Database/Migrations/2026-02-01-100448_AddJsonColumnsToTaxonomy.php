<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddJsonColumnsToTaxonomy extends Migration
{
    public function up()
    {
        // Add product_type_ids to categories
        $categoryFields = [
            'product_type_ids' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'product_type_id',
                'comment' => 'Multiple product type IDs as JSON array',
            ],
        ];
        $this->forge->addColumn('categories', $categoryFields);

        // Add category_ids to sub_categories
        $subCategoryFields = [
            'category_ids' => [
                'type' => 'TEXT',
                'null' => true,
                'after' => 'category_id',
                'comment' => 'Multiple category IDs as JSON array',
            ],
        ];
        $this->forge->addColumn('sub_categories', $subCategoryFields);
    }

    public function down()
    {
        $this->forge->dropColumn('categories', 'product_type_ids');
        $this->forge->dropColumn('sub_categories', 'category_ids');
    }
}
