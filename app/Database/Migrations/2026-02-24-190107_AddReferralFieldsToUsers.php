<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddReferralFieldsToUsers extends Migration
{
    public function up()
    {
        $fields = [
            'referral_code' => [
                'type' => 'VARCHAR',
                'constraint' => '50',
                'unique' => true,
                'null' => true,
                'after' => 'mobile'
            ],
            'referred_by' => [
                'type' => 'VARCHAR',
                'constraint' => '50',
                'null' => true,
                'after' => 'referral_code'
            ],
            'referral_balance' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'default' => 0.00,
                'after' => 'referred_by'
            ],
            'has_used_referral' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 0,
                'after' => 'referral_balance'
            ],
            'referral_expires_at' => [
                'type' => 'DATETIME',
                'null' => true,
                'after' => 'has_used_referral'
            ]
        ];
        $this->forge->addColumn('users', $fields);
    }

    public function down()
    {
        $this->forge->dropColumn('users', ['referral_code', 'referred_by', 'referral_balance', 'has_used_referral', 'referral_expires_at']);
    }
}
