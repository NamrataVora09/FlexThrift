<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class UpdateUsersForSubscription extends Migration
{
    public function up()
    {
        $fields = [
            'products_uploaded_count' => [
                'type' => 'INT',
                'default' => 0,
                'after' => 'is_blocked',
            ],
            'subscription_tier' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
                'default' => 'free',
                'after' => 'products_uploaded_count',
            ],
            'subscription_expires_at' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'subscription_tier',
            ],
            'renter_reliability_score' => [
                'type' => 'INT',
                'default' => 0,
                'after' => 'reliability_score',
            ],
            'seller_reliability_score' => [
                'type' => 'INT',
                'default' => 0,
                'after' => 'renter_reliability_score',
            ],
        ];

        $this->forge->addColumn('users', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('users', [
            'products_uploaded_count', 'subscription_tier', 'subscription_expires_at',
            'renter_reliability_score', 'seller_reliability_score'
        ]);
    }
}
