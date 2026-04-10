<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AlterDurationHoursToDecimal extends Migration
{
    public function up()
    {
        $this->forge->modifyColumn('subscription_plans', [
            'duration_hours' => [
                'name'       => 'duration_hours',
                'type'       => 'DECIMAL',
                'constraint' => '8,2',
                'default'    => 0,
            ],
        ]);
    }

    public function down()
    {
        $this->forge->modifyColumn('subscription_plans', [
            'duration_hours' => [
                'name'       => 'duration_hours',
                'type'       => 'INT',
                'constraint' => 11,
                'default'    => 0,
            ],
        ]);
    }
}
