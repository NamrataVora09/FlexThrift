<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class CleanupSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();

        echo "Starting Database Truncation...\n";

        // Disable foreign key checks
        $db->query('SET FOREIGN_KEY_CHECKS = 0');

        // Get all tables
        $tables = $db->listTables();
        $ignoredTables = ['migrations'];

        foreach ($tables as $table) {
            if (in_array($table, $ignoredTables)) {
                echo "Skipping table: $table\n";
                continue;
            }

            echo "Truncating table: $table\n";
            $db->table($table)->truncate();
        }

        echo "\nSeeding Testing Users...\n";

        $password = password_hash('123456', PASSWORD_DEFAULT);
        $now = date('Y-m-d H:i:s');

        $users = [
            // Buyers
            ['name' => 'Buyer One', 'email' => 'buyer1@flex.com', 'user_type' => 'buyer'],
            ['name' => 'Buyer Two', 'email' => 'buyer2@flex.com', 'user_type' => 'buyer'],
            ['name' => 'Buyer Three', 'email' => 'buyer3@flex.com', 'user_type' => 'buyer'],
            ['name' => 'Buyer Four', 'email' => 'buyer4@flex.com', 'user_type' => 'buyer'],

            // Sellers
            ['name' => 'Seller Main', 'email' => 'seller@flex.com', 'user_type' => 'seller'],
            ['name' => 'Seller One', 'email' => 'seller1@flex.com', 'user_type' => 'seller'],
            ['name' => 'Seller Two', 'email' => 'seller2@flex.com', 'user_type' => 'seller'],
            ['name' => 'Seller Three', 'email' => 'seller3@flex.com', 'user_type' => 'seller'],
            ['name' => 'Seller Four', 'email' => 'seller4@flex.com', 'user_type' => 'seller'],

            // Admins
            ['name' => 'Super Admin', 'email' => 'superadmin@flex.com', 'user_type' => 'super_admin'],
            ['name' => 'Admin User', 'email' => 'admin@flex.com', 'user_type' => 'admin'],
        ];

        foreach ($users as $userData) {
            $userData['password'] = $password;
            $userData['mobile'] = '9876543210';
            $userData['is_verified'] = 1;
            $userData['created_at'] = $now;
            $userData['updated_at'] = $now;
            $userData['role'] = $userData['user_type'];

            $db->table('users')->insert($userData);
            echo "Inserted user: " . $userData['email'] . "\n";
        }

        // Re-enable foreign key checks
        $db->query('SET FOREIGN_KEY_CHECKS = 1');

        echo "\nDatabase cleanup and seeding completed successfully!\n";
    }
}
