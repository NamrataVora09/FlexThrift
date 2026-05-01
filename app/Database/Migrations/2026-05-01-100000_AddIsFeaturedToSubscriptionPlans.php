<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddIsFeaturedToSubscriptionPlans extends Migration
{
    public function up()
    {
        $exists = $this->db->query("SHOW COLUMNS FROM subscription_plans LIKE 'is_featured'")->getRowArray();
        if (!$exists) {
            $this->db->query("ALTER TABLE subscription_plans ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active");
        }
    }

    public function down()
    {
        $exists = $this->db->query("SHOW COLUMNS FROM subscription_plans LIKE 'is_featured'")->getRowArray();
        if ($exists) {
            $this->db->query("ALTER TABLE subscription_plans DROP COLUMN is_featured");
        }
    }
}
