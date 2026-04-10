<?php

namespace App\Models;

use CodeIgniter\Model;

class OrderModel extends Model
{
    protected $table = 'orders';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'order_number',
        'product_id',
        'buyer_id',
        'seller_id',
        'delivery_person_id',
        'order_type',
        'final_price',
        'deposit_amount',
        'fitting_charge',
        'delivery_address',
        'delivery_pin_code',
        'delivery_country',
        'delivery_state',
        'delivery_city',
        'status',
        'payment_status',
        'delivery_date',
        'return_date',
        'rental_start_date',
        'rental_end_date'
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
        'final_price' => 'required|decimal',
        'delivery_address' => 'required',
        'delivery_pin_code' => 'required',
    ];

    protected $validationMessages = [];
    protected $skipValidation = false;

    protected $beforeInsert = ['generateOrderNumber'];

    protected function generateOrderNumber(array $data)
    {
        if (!isset($data['data']['order_number'])) {
            $data['data']['order_number'] = 'FLX' . strtoupper(uniqid());
        }
        return $data;
    }

    public function getSellerOrders($sellerId, $status = null)
    {
        $builder = $this->db->table('orders o')
            ->select('o.*, p.title as product_title, u.name as buyer_name, u.mobile as buyer_mobile')
            ->join('products p', 'p.id = o.product_id')
            ->join('users u', 'u.id = o.buyer_id')
            ->where('o.seller_id', $sellerId)
            ->orderBy('o.created_at', 'DESC');

        if ($status) {
            $builder->where('o.status', $status);
        }

        return $builder->get()->getResultArray();
    }

    public function getBuyerOrders($buyerId)
    {
        return $this->db->table('orders o')
            ->select('o.*, p.title as product_title, u.name as seller_name')
            ->join('products p', 'p.id = o.product_id')
            ->join('users u', 'u.id = o.seller_id')
            ->where('o.buyer_id', $buyerId)
            ->orderBy('o.created_at', 'DESC')
            ->get()
            ->getResultArray();
    }

    public function updateOrderStatus($orderId, $status, $userId, $remarks = null)
    {
        $this->update($orderId, ['status' => $status]);

        // Log status change
        $historyModel = new \App\Models\OrderStatusHistoryModel();
        $historyModel->insert([
            'order_id' => $orderId,
            'status' => $status,
            'remarks' => $remarks,
            'updated_by' => $userId
        ]);

        return true;
    }
}
