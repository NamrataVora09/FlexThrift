<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use CodeIgniter\I18n\Time;

class DummyUsersSeeder extends Seeder
{
    public function run()
    {
        $now = date('Y-m-d H:i:s');
        $users = [
            [
                'name' => 'Seller One',
                'email' => 'seller@example.com',
                'mobile' => '9999990001',
                'address' => 'Seller Address',
                'pin_code' => '400001',
                'user_type' => 'seller',
                'role' => 'seller',
                'password' => password_hash('sellerpass', PASSWORD_DEFAULT),
                'is_verified' => 1,
                'reliability_score' => 40,
                'is_blocked' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Delivery One',
                'email' => 'delivery@example.com',
                'mobile' => '9999990002',
                'address' => 'Delivery Address',
                'pin_code' => '400002',
                'user_type' => 'delivery',
                'role' => 'delivery',
                'password' => password_hash('deliverypass', PASSWORD_DEFAULT),
                'is_verified' => 1,
                'reliability_score' => 0,
                'is_blocked' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Admin One',
                'email' => 'admin@example.com',
                'mobile' => '9999990003',
                'address' => 'Admin Address',
                'pin_code' => '400003',
                'user_type' => 'admin',
                'role' => 'admin',
                'password' => password_hash('adminpass', PASSWORD_DEFAULT),
                'is_verified' => 1,
                'reliability_score' => 0,
                'is_blocked' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@example.com',
                'mobile' => '9999990004',
                'address' => 'Super Admin Address',
                'pin_code' => '400004',
                'user_type' => 'super_admin',
                'role' => 'super_admin',
                'password' => password_hash('superpass', PASSWORD_DEFAULT),
                'is_verified' => 1,
                'reliability_score' => 0,
                'is_blocked' => 0,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];

        foreach ($users as $user) {
            // Insert directly via Query Builder to avoid model validation issues
            $this->db->table('users')->insert($user);
        }

        echo "Inserted dummy users\n";

        // Create delivery_persons entry for delivery user
        $deliveryUser = $this->db->table('users')->where('email', 'delivery@example.com')->get()->getRowArray();
        if ($deliveryUser) {
            $deliveryPersonData = [
                'user_id' => $deliveryUser['id'],
                'vehicle_type' => 'bike',
                'vehicle_number' => 'MH01AB1234',
                'license_number' => 'DL1234567890',
                'is_available' => 1,
                'status' => 'active',
                'total_deliveries' => 0,
                'rating' => 5.0,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            
            // Check if delivery_persons table exists
            if ($this->db->tableExists('delivery_persons')) {
                $this->db->table('delivery_persons')->insert($deliveryPersonData);
                echo "Created delivery_persons entry\n";
            }
        }
    }
}
