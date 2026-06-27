<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class AddDispatchValidationRules extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        
        $rules = [
            [
                'field_name' => 'dispatch_address',
                'field_label' => 'Dispatch Address',
                'is_required' => 1,
                'min_length' => 5,
                'error_message' => 'Dispatch address is required',
                'is_active' => 1,
            ],
            [
                'field_name' => 'dispatch_state',
                'field_label' => 'State',
                'is_required' => 1,
                'min_length' => 2,
                'error_message' => 'State is required',
                'is_active' => 1,
            ],
            [
                'field_name' => 'dispatch_city',
                'field_label' => 'City',
                'is_required' => 1,
                'min_length' => 2,
                'error_message' => 'City is required',
                'is_active' => 1,
            ],
            [
                'field_name' => 'dispatch_pin_code',
                'field_label' => 'PIN Code',
                'is_required' => 1,
                'pattern' => '^[0-9]{6}$',
                'error_message' => 'PIN code must be 6 digits',
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
