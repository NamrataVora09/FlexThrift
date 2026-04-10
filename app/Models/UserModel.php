<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table = 'users';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'name',
        'email',
        'password',
        'mobile',
        'address',
        'pin_code',
        'user_type',
        'role',
        'reliability_score',
        'buyer_rating_avg',
        'buyer_rating_count',
        'seller_rating_avg',
        'seller_rating_count',
        'seller_reliability_score',
        'renter_reliability_score',
        'is_blocked',
        'bgv_cleared',
        'otp',
        'otp_expires_at',
        'is_verified',
        'buyer_rent_reliability_score',
        'buyer_buy_reliability_score',
        'buyer_overall_reliability_score',
        'seller_rent_reliability_score',
        'seller_sell_reliability_score',
        'delivery_rental_reliability_score',
        'delivery_sale_reliability_score',
        'products_uploaded_count',
        'subscription_tier',
        'subscription_expires_at',
        'daily_posts_count',
        'weekly_posts_count',
        'monthly_posts_count',
        'last_post_date',
        'posting_limit_charges_paid',
        'blocked_seller',
        'blocked_buyer',
        'last_role_switch_at',
        'blocked_from_approvals',
        'blocked_from_user_management',
        'referral_code',
        'referred_by',
        'referral_balance',
        'has_used_referral',
        'referral_expires_at'
    ];

    protected $beforeInsert = ['generateReferralCode'];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    // Validation
    protected $validationRules = [
        'name' => 'required|min_length[3]|max_length[255]',
        'email' => 'required|valid_email|is_unique[users.email,id,{id}]',
        'mobile' => 'required|min_length[10]|max_length[15]',
        'password' => 'required|min_length[6]|max_length[255]',
        'pin_code' => 'required|min_length[4]|max_length[10]',
        'user_type' => 'required|in_list[seller,buyer,both]',
    ];

    protected $validationMessages = [
        'email' => [
            'is_unique' => 'This email is already registered.',
        ],
    ];

    protected $skipValidation = false;
    protected $cleanValidationRules = true;

    /**
     * Generate and save OTP for user
     */
    public function generateOTP($userId)
    {
        $otp = random_int(100000, 999999);
        $expiresAt = date('Y-m-d H:i:s', strtotime('+10 minutes'));

        return $this->update($userId, [
            'otp' => $otp,
            'otp_expires_at' => $expiresAt
        ]) ? $otp : false;
    }

    /**
     * Verify OTP
     */
    public function verifyOTP($email, $otp)
    {
        $user = $this->where('email', $email)->first();

        if (!$user) {
            return false;
        }

        // Check if OTP matches and not expired
        if ($user['otp'] == $otp && strtotime($user['otp_expires_at']) > time()) {
            // Mark as verified and clear OTP
            $this->update($user['id'], [
                'is_verified' => 1,
                'otp' => null,
                'otp_expires_at' => null
            ]);
            return $this->find($user['id']);
        }

        return false;
    }

    /**
     * Get user by email
     */
    public function getUserByEmail($email)
    {
        return $this->where('email', $email)->first();
    }

    /**
     * Verify password login
     */
    public function verifyPassword($email, $password)
    {
        $user = $this->where('email', $email)->first();

        if (!$user) {
            return false;
        }

        if (!empty($user['password']) && password_verify($password, $user['password'])) {
            return $user;
        }

        return false;
    }

    /**
     * Callback to generate a unique referral code before insert
     */
    protected function generateReferralCode(array $data)
    {
        if (isset($data['data']['name'])) {
            $name = strtoupper(trim($data['data']['name']));
            $cleanName = preg_replace('/[^A-Z]/', '', $name);
            $prefix = substr($cleanName, 0, 4);
            if (strlen($prefix) < 2)
                $prefix = 'FLEX';

            $code = '';
            $isUnique = false;
            $attempts = 0;

            while (!$isUnique && $attempts < 10) {
                $suffix = strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 4));
                $code = $prefix . $suffix;

                $existing = $this->where('referral_code', $code)->first();
                if (!$existing) {
                    $isUnique = true;
                }
                $attempts++;
            }

            $data['data']['referral_code'] = $code;
        }
        return $data;
    }
}
