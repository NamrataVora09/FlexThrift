<?php

namespace App\Models;

use CodeIgniter\Model;

class OfferModel extends Model
{
    protected $table = 'offers';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'product_id',
        'buyer_id',
        'seller_id',
        'offer_price',
        'message',
        'status',
        'seller_remarks',
        'rental_start_date',
        'rental_end_date',
        'deposit_amount',
        'offer_type',
        'delivery_address',
        'delivery_pin_code',
        'delivery_country',
        'delivery_state',
        'delivery_city',
        'accepted_at',
        'rejected_at',
        'seller_rated_buyer',
        'buyer_rated_seller',
        'buyer_change_count'
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'product_id' => 'required|integer',
        'buyer_id' => 'required|integer',
        'seller_id' => 'required|integer',
        'offer_price' => 'required|decimal',
    ];

    protected $validationMessages = [];
    protected $skipValidation = false;

    public function getSellerOffers($sellerId, $status = 'pending')
    {
        return $this->db->table('offers o')
            // include product category
            ->select('o.*, o.offer_price as offered_price, p.title as product_title, p.price, p.rental_cost, p.listing_type, p.category')
            ->select('u.name as buyer_name, u.email as buyer_email, u.mobile as buyer_mobile')
            ->select('COALESCE(AVG(r.rating), 0) as buyer_rating, ((u.renter_reliability_score + u.seller_reliability_score) / 2) as buyer_reliability_score')
            ->join('products p', 'p.id = o.product_id')
            ->join('users u', 'u.id = o.buyer_id')
            ->join('reviews r', 'r.reviewed_id = u.id AND r.reviewer_type = "seller"', 'left')
            ->where('o.seller_id', $sellerId)
            ->where('o.status', $status)
            ->groupBy('o.id')
            ->orderBy('o.created_at', 'DESC')
            ->get()
            ->getResultArray();
    }

    public function getBuyerOffers($buyerId)
    {
        return $this->db->table('offers o')
            ->select('o.*, o.offer_price as offered_price, p.title as product_title, p.price, p.rental_cost, p.listing_type, p.category, pi.image_path as product_image')
            ->select('u.name as seller_name, u.seller_reliability_score')
            ->join('products p', 'p.id = o.product_id')
            ->join('users u', 'u.id = o.seller_id')
            ->join('product_images pi', 'pi.product_id = p.id AND pi.is_primary = 1', 'left')
            ->where('o.buyer_id', $buyerId)
            ->orderBy('o.created_at', 'DESC')
            ->get()
            ->getResultArray();
    }

    public function acceptOffer($offerId, $remarks = null)
    {
        return $this->update($offerId, [
            'status' => 'accepted',
            'seller_remarks' => $remarks
        ]);
    }

    public function rejectOffer($offerId, $remarks = null)
    {
        return $this->update($offerId, [
            'status' => 'rejected',
            'seller_remarks' => $remarks
        ]);
    }
}
