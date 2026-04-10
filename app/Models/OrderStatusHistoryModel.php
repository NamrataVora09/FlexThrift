<?php

namespace App\Models;

use CodeIgniter\Model;

class OrderStatusHistoryModel extends Model
{
    protected $table = 'order_status_history';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = ['order_id', 'status', 'remarks', 'updated_by'];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = '';

    public function getOrderHistory($orderId)
    {
        return $this->db->table('order_status_history osh')
            ->select('osh.*, u.name as updated_by_name')
            ->join('users u', 'u.id = osh.updated_by')
            ->where('osh.order_id', $orderId)
            ->orderBy('osh.created_at', 'ASC')
            ->get()
            ->getResultArray();
    }
}
