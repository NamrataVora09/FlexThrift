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
        // Require/bootstrap the migration classes if not autoloaded
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
