<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class RenameSubscriptionDurationColumn extends Migration
{
    public function up()
    {
        if ($this->db->fieldExists('duration_days', 'subscription_plans')) {
            $this->forge->modifyColumn('subscription_plans', [
                'duration_days' => [
                    'name' => 'duration_hours',
                    'type' => 'INT',
                    'constraint' => 11,
                    'default' => 0
                ],
            ]);
        } elseif ($this->db->fieldExists('duration', 'subscription_plans')) {
            $this->forge->modifyColumn('subscription_plans', [
                'duration' => [
                    'name' => 'duration_hours',
                    'type' => 'INT',
                    'constraint' => 11,
                    'default' => 0
                ],
            ]);
        }
    }

    public function down()
    {
        $this->forge->modifyColumn('subscription_plans', [
            'duration_hours' => [
                'name' => 'duration_days',
                'type' => 'INT',
                'constraint' => 11,
                'default' => 0
            ],
        ]);
    }
}
