<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class AddCategoryProductTypeValidationRules extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        
        $rules = [
            [
                'field_name' => 'product_type',
                'field_label' => 'Product Type',
                'is_required' => 1,
                'error_message' => 'Product type is required',
                'is_active' => 1,
            ],
            [
                'field_name' => 'category_id',
                'field_label' => 'Category',
                'is_required' => 1,
                'error_message' => 'Category is required',
                'is_active' => 1,
            ],
        ];

        foreach ($rules as $rule) {
            $rule['created_at'] = date('Y-m-d H:i:s');
            $rule['updated_at'] = date('Y-m-d H:i:s');
            $db->table('validation_rules')->insert($rule);
        }
    }
}
