<?php

namespace App\Models;

use CodeIgniter\Model;

class UserSubscriptionModel extends Model
{
    protected $table = 'user_subscriptions';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'user_id',
        'plan_id',
        'coupon_id',
        'starts_at',
        'expires_at',
        'usage_count',
        'is_active',
        'payment_status',
        'amount_paid',
        'referral_discount_applied',
        'merchant_transaction_id'
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
