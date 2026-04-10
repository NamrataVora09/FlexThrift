<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class FixDeliveryUserType extends Migration
{
    public function up()
    {
        // Fix existing delivery users - set user_type to buyer, keep role as delivery
        $this->db->query("UPDATE users SET user_type='buyer' WHERE role='delivery' AND (user_type='' OR user_type IS NULL OR user_type='0')");
    }

    public function down()
    {
        // No rollback needed
    }
}
