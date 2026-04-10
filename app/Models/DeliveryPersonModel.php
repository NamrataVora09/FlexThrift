<?php

namespace App\Models;

use CodeIgniter\Model;

class DeliveryPersonModel extends Model
{
    protected $table = 'delivery_persons';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'user_id', 'vehicle_type', 'vehicle_number', 'license_number',
        'is_available', 'current_location_lat', 'current_location_lng',
        'total_deliveries', 'rating', 'status',
        'pan_card', 'aadhar_card', 'kyc_verified',
        'badges', 'rental_reliability_score', 'sale_reliability_score'
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'user_id' => 'required|integer',
        'vehicle_type' => 'required',
        'vehicle_number' => 'required',
    ];

    public function getAvailableDeliveryPersons($location = null)
    {
        $builder = $this->db->table('delivery_persons dp')
            ->select('dp.*, u.name, u.mobile')
            ->join('users u', 'u.id = dp.user_id')
            ->where('dp.is_available', 1)
            ->where('dp.status', 'active');

        // If location provided, order by nearest (would need geolocation logic)
        
        return $builder->get()->getResultArray();
    }

    public function updateLocation($deliveryPersonId, $lat, $lng)
    {
        return $this->update($deliveryPersonId, [
            'current_location_lat' => $lat,
            'current_location_lng' => $lng,
        ]);
    }

    public function incrementDeliveries($deliveryPersonId)
    {
        $dp = $this->find($deliveryPersonId);
        if ($dp) {
            $this->update($deliveryPersonId, [
                'total_deliveries' => ($dp['total_deliveries'] ?? 0) + 1
            ]);
        }
    }
}
