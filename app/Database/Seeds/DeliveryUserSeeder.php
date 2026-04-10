<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class DeliveryUserSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();

        // Dummy user - delivery role with buyer user_type
        $userData = [
            'name' => 'Test Delivery',
            'email' => 'delivery@test.local',
            'password' => password_hash('Delivery@123', PASSWORD_DEFAULT),
            'mobile' => '9999999999',
            'address' => 'Test Address',
            'pin_code' => '560001',
            'user_type' => 'buyer',  // ENUM only allows 'seller' or 'buyer'
            'role' => 'delivery',     // Actual role is delivery
            'reliability_score' => 0,
            'is_blocked' => 0,
            'bgv_cleared' => 1,
            'otp' => null,
            'otp_expires_at' => null,
            'is_verified' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        $db->table('users')->insert($userData);
        $userId = $db->insertID();

        // Delivery person record
        $dpData = [
            'user_id' => $userId,
            'vehicle_type' => 'bike',
            'vehicle_number' => 'TEST-0001',
            'license_number' => 'DL-TEST-0001',
            'is_available' => 1,
            'total_deliveries' => 0,
            'rating' => 5,
            'status' => 'active',
            'pan_card' => 'TESTPAN1234',
            'aadhar_card' => 'TESTAADHAR',
            'kyc_verified' => 1,
            'badges' => 50,
            'rental_reliability_score' => 0,
            'sale_reliability_score' => 0,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        $db->table('delivery_persons')->insert($dpData);
    }
}
