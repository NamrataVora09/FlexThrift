<?php

namespace App\Models;

use CodeIgniter\Model;

class UserAuditTrailModel extends Model
{
    protected $table = 'user_audit_trails';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'user_id',
        'admin_id',
        'action_type',
        'action_details',
        'ip_address',
        'user_agent',
        'created_at'
    ];

    protected $useTimestamps = false;

    public function log($userId, $actionType, $details = [], $adminId = null)
    {
        $request = service('request');
        return $this->insert([
            'user_id' => $userId,
            'admin_id' => $adminId,
            'action_type' => $actionType,
            'action_details' => is_array($details) ? json_encode($details) : $details,
            'ip_address' => $request->getIPAddress(),
            'user_agent' => $request->getUserAgent()->getAgentString(),
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
}
