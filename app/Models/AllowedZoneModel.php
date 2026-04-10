<?php

namespace App\Models;

use CodeIgniter\Model;

class AllowedZoneModel extends Model
{
    protected $table = 'allowed_zones';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'zone_name',
        'zone_polygon',
        'is_active',
        'created_by'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
}
