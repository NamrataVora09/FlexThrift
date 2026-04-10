<?php

namespace App\Models;

use CodeIgniter\Model;

class RegistrationAttemptModel extends Model
{
    protected $table = 'registration_attempts';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'mobile',
        'ip_address',
        'country',
        'state',
        'city',
        'latitude',
        'longitude',
        'is_allowed',
        'zone_id',
        'user_id'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = null;
}
