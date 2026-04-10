<?php

namespace App\Models;

use CodeIgniter\Model;

class ContactViewModel extends Model
{
    protected $table = 'contact_views';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'user_id',
        'seller_id',
        'product_id',
        'subscription_id',
        'viewed_at',
        'return_confirmed',
        'returned_at'
    ];

    // Dates
    protected $useTimestamps = false;
    protected $dateFormat = 'datetime';
    protected $createdField = 'viewed_at';
    protected $updatedField = '';
    protected $deletedField = '';

    // Check if buyer can rate seller (within 20 days of viewing contact)
    public function canRateSeller($buyerId, $sellerId)
    {
        $view = $this->where('user_id', $buyerId)
            ->where('seller_id', $sellerId)
            ->first();

        if (!$view) {
            return false;
        }

        // Check if within 20 days
        $viewedAt = strtotime($view['viewed_at']);
        $twentyDaysLater = $viewedAt + (20 * 24 * 60 * 60);

        return time() <= $twentyDaysLater;
    }

    // Record contact view
    public function recordView($buyerId, $sellerId, $productId, $subscriptionId = null)
    {
        // Check if already viewed for this specific product
        $existing = $this->where('user_id', $buyerId)
            ->where('seller_id', $sellerId)
            ->where('product_id', $productId)
            ->first();

        if ($existing) {
            // Update viewed_at time
            $this->update($existing['id'], [
                'viewed_at' => date('Y-m-d H:i:s'),
                'subscription_id' => $subscriptionId,
            ]);
            return $existing['id'];
        }

        // Insert new view
        return $this->insert([
            'user_id' => $buyerId,
            'seller_id' => $sellerId,
            'product_id' => $productId,
            'subscription_id' => $subscriptionId,
            'viewed_at' => date('Y-m-d H:i:s'),
        ]);
    }

    // Get views for a seller
    public function getSellerViews($sellerId, $limit = 50)
    {
        return $this->select('contact_views.*, users.name as buyer_name, users.email as buyer_email, products.title as product_title')
            ->select('o.delivery_address, o.delivery_pin_code')
            ->join('users', 'users.id = contact_views.user_id')
            ->join('products', 'products.id = contact_views.product_id')
            ->join('offers o', 'o.buyer_id = contact_views.user_id AND o.product_id = contact_views.product_id', 'left')
            ->where('contact_views.seller_id', $sellerId)
            ->orderBy('contact_views.viewed_at', 'DESC')
            ->limit($limit)
            ->groupBy('contact_views.id')
            ->findAll();
    }

    // Get views for a buyer
    public function getBuyerViews($buyerId, $limit = 50)
    {
        return $this->select('contact_views.*, users.name as seller_name, users.email as seller_email, users.mobile as seller_mobile, products.title as product_title')
            ->join('users', 'users.id = contact_views.seller_id')
            ->join('products', 'products.id = contact_views.product_id')
            ->where('contact_views.user_id', $buyerId)
            ->orderBy('contact_views.viewed_at', 'DESC')
            ->limit($limit)
            ->findAll();
    }
}
