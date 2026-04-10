<?php

namespace App\Models;

use CodeIgniter\Model;

class OfferHistoryModel extends Model
{
    protected $table = 'offer_history';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'offer_id',
        'changed_by',
        'action',
        'old_start_date',
        'new_start_date',
        'old_end_date',
        'new_end_date',
        'old_price',
        'new_price'
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = '';

    public function getHistoryByOffer($offerId)
    {
        return $this->where('offer_id', $offerId)
            ->orderBy('created_at', 'DESC')
            ->findAll();
    }
}
