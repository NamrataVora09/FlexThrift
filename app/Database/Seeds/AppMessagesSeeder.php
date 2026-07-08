<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use App\Database\Migrations\SeedAllAppMessages;
use App\Database\Migrations\SeedMappedAppMessages;
use App\Database\Migrations\SeedAllApiResponseMessages;

class AppMessagesSeeder extends Seeder
{
    public function run()
    {
        // Manually require the migration files since migrations are not autoloaded by namespace in CI4
        require_once APPPATH . 'Database/Migrations/2026-05-15-000000_SeedAllAppMessages.php';
        require_once APPPATH . 'Database/Migrations/2026-06-24-111000_SeedMappedAppMessages.php';
        require_once APPPATH . 'Database/Migrations/2026-06-24-120000_SeedAllApiResponseMessages.php';

        $migrations = [
            new SeedAllAppMessages(),
            new SeedMappedAppMessages(),
            new SeedAllApiResponseMessages()
        ];

        foreach ($migrations as $migration) {
            $migration->up();
        }

        echo "App messages and error messages successfully seeded!\n";
    }
}
