<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPricingFieldsToProducts extends Migration
{
    public function up()
    {
        $db = \Config\Database::connect();
        
        // Get existing columns
        $existingColumns = $db->getFieldNames('products');
        
        $fields = [
            'listing_type_category' => [
                'type' => 'VARCHAR',
                'constraint' => 100,
                'null' => true,
                'after' => 'listing_type',
                'comment' => 'Cascading dropdown: Clothing, Electronics, etc',
            ],
            'original_purchase_price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
                'after' => 'bill_image',
                'comment' => 'Original price when bought - used for calculations',
            ],
            'suggested_sale_price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
                'after' => 'original_purchase_price',
                'comment' => 'System calculated based on formula',
            ],
            'suggested_rent_price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
                'after' => 'suggested_sale_price',
                'comment' => 'System calculated rent cost per day',
            ],
            'suggested_deposit' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => true,
                'after' => 'suggested_rent_price',
                'comment' => 'System calculated deposit amount',
            ],
        ];

        // Filter out fields that already exist
        $fieldsToAdd = [];
        foreach ($fields as $fieldName => $fieldConfig) {
            if (!in_array($fieldName, $existingColumns)) {
                $fieldsToAdd[$fieldName] = $fieldConfig;
            }
        }

        // Only add columns if there are any to add
        if (!empty($fieldsToAdd)) {
            $this->forge->addColumn('products', $fieldsToAdd);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('products', [
            'listing_type_category',
            'original_purchase_price',
            'suggested_sale_price',
            'suggested_rent_price',
            'suggested_deposit',
        ]);
    }
}
