<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddReferralDiscountToSubscriptions extends Migration
{
    public function up()
    {
        $this->forge->addColumn('user_subscriptions', [
            'referral_discount_applied' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'default' => 0.00,
                'after' => 'payment_status'
            ]
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('user_subscriptions', 'referral_discount_applied');
    }
}
