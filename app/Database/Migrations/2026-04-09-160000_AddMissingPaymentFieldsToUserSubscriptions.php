<?php
namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddMissingPaymentFieldsToUserSubscriptions extends Migration
{
    public function up()
    {
        $this->forge->addColumn('user_subscriptions', [
            'amount_paid' => [
                'type'       => 'DECIMAL',
                'constraint' => '10,2',
                'default'    => 0.00,
                'after'      => 'payment_status'
            ],
            'merchant_transaction_id' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
                'null'       => true,
                'after'      => 'referral_discount_applied'
            ]
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('user_subscriptions', ['amount_paid', 'merchant_transaction_id']);
    }
}
