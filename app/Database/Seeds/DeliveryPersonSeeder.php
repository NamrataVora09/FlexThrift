<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class DeliveryPersonSeeder extends Seeder
{
    public function run()
    {
        $now = date('Y-m-d H:i:s');
        
        // Get delivery user
        $deliveryUser = $this->db->table('users')->where('email', 'delivery@example.com')->get()->getRowArray();
        
        if (!$deliveryUser) {
            echo "Delivery user not found. Run DummyUsersSeeder first.\n";
            return;
        }

        // Check if entry already exists
        $existing = $this->db->table('delivery_persons')->where('user_id', $deliveryUser['id'])->get()->getRowArray();
        
        if ($existing) {
            echo "Delivery person entry already exists.\n";
            return;
        }

        $deliveryPersonData = [
            'user_id' => $deliveryUser['id'],
            'vehicle_type' => 'bike',
            'vehicle_number' => 'MH01AB1234',
            'license_number' => 'DL1234567890',
            'available_cities' => 'Mumbai,Pune,Nashik',
            'is_available' => 1,
            'total_deliveries' => 0,
            'rating' => 5.0,
            'created_at' => $now,
            'updated_at' => $now,
        ];
        
        $this->db->table('delivery_persons')->insert($deliveryPersonData);
        echo "Created delivery_persons entry for user ID: {$deliveryUser['id']}\n";
    }
}
