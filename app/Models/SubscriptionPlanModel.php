<?php

namespace App\Models;

use CodeIgniter\Model;

class SubscriptionPlanModel extends Model
{
    protected $table = 'subscription_plans';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'name',
        'user_type',
        'plan_type',
        'limit_value',
        'duration_hours',
        'price',
        'base_price',
        'is_active'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    // Validation
    protected $validationRules = [
        'name' => 'required|min_length[3]|max_length[100]',
        'user_type' => 'required|in_list[seller,buyer]',
        'plan_type' => 'required|in_list[quantity,duration]',
        'price' => 'required|numeric|greater_than_equal_to[0]',
        'base_price' => 'numeric|greater_than_equal_to[0]|permit_empty',
        'limit_value' => 'integer|greater_than_equal_to[0]',
        'duration_hours' => 'integer|greater_than_equal_to[0]',
    ];

    protected $validationMessages = [
        'name' => [
            'required' => 'Plan name is required',
            'min_length' => 'Plan name must be at least 3 characters'
        ],
        'user_type' => [
            'required' => 'Target role (Buyer/Seller) is required'
        ],
        'price' => [
            'greater_than_equal_to' => 'Price cannot be negative'
        ]
    ];
}
