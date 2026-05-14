<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class SuperAdminOnlyResetSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();

        echo "Starting Database Purge (Keeping only SuperAdmin)...\n";

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

        echo "\nRestoring SuperAdmin User...\n";

        $now = date('Y-m-d H:i:s');
        $superAdmin = [
            'name' => 'Super Admin',
            'email' => 'superadmin@flex.com',
            'password' => password_hash('123456', PASSWORD_DEFAULT),
            'mobile' => '9876543210',
            'user_type' => 'super_admin',
            'role' => 'super_admin',
            'is_verified' => 1,
            'created_at' => $now,
            'updated_at' => $now
        ];

        $db->table('users')->insert($superAdmin);
        echo "SuperAdmin restored: " . $superAdmin['email'] . "\n";

        // Re-enable foreign key checks
        $db->query('SET FOREIGN_KEY_CHECKS = 1');

        echo "\nDatabase purge completed successfully!\n";
    }
}
