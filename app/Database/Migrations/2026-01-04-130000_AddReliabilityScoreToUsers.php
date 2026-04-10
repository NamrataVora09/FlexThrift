<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddReliabilityScoreToUsers extends Migration
{
    public function up()
    {
        $fields = [
            'reliability_score' => [
                'type' => 'INT',
                'default' => 0,
                'after' => 'user_type',
            ],
            'role' => [
                'type' => 'ENUM',
                'constraint' => ['buyer', 'seller', 'admin', 'super_admin', 'delivery'],
                'default' => 'buyer',
                'after' => 'reliability_score',
            ],
            'is_blocked' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'after' => 'role',
            ],
        ];

        $this->forge->addColumn('users', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('users', ['reliability_score', 'role', 'is_blocked']);
    }
}
