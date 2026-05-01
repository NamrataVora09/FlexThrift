<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddIsMostSelectedToSubscriptionPlans extends Migration
{
    public function up()
    {
        $this->forge->addColumn('subscription_plans', [
            'is_most_selected' => [
                'type'       => 'TINYINT',
                'constraint' => 1,
                'default'    => 0,
                'after'      => 'is_featured',
            ],
        ]);
    }

    public function down()
    {
        $this->forge->dropColumn('subscription_plans', 'is_most_selected');
    }
}
