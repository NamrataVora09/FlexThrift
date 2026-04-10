<?php

namespace App\Models;

use CodeIgniter\Model;

class PlatformChargeModel extends Model
{
    protected $table = 'platform_charges';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'charge_name',
        'charge_type',
        'charge_value',
        'is_active',
        'created_at',
        'updated_at'
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    /**
     * Get all active platform charges
     */
    public function getActiveCharges()
    {
        return $this->where('is_active', 1)->findAll();
    }
}
