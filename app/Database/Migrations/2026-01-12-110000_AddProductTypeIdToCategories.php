<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddProductTypeIdToCategories extends Migration
{
    public function up()
    {
        // Add product_type_id column to categories table to link categories with product types
        $fields = [
            'product_type_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
                'after' => 'id',
                'comment' => 'Links category to product_type (optional)',
            ],
        ];

        // Check if column doesn't exist before adding
        $db = \Config\Database::connect();
        $existingFields = $db->getFieldNames('categories');
        
        if (!in_array('product_type_id', $existingFields)) {
            $this->forge->addColumn('categories', $fields);
        }
    }

    public function down()
    {
        $db = \Config\Database::connect();
        $existingFields = $db->getFieldNames('categories');
        
        if (in_array('product_type_id', $existingFields)) {
            $this->forge->dropColumn('categories', 'product_type_id');
        }
    }
}
