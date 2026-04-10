<?php

namespace App\Models;

use CodeIgniter\Model;

class OfferMessageModel extends Model
{
    protected $table = 'offer_messages';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $allowedFields = [
        'offer_id',
        'sender_id',
        'sender_role',
        'message',
        'is_read',
    ];

    protected $useTimestamps = false;

    public function getMessages(int $offerId): array
    {
        return $this->db->table('offer_messages om')
            ->select('om.*, u.name as sender_name')
            ->join('users u', 'u.id = om.sender_id', 'left')
            ->where('om.offer_id', $offerId)
            ->orderBy('om.created_at', 'ASC')
            ->get()->getResultArray();
    }
}
