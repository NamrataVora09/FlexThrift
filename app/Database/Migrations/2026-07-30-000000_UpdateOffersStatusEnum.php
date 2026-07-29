<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class UpdateOffersStatusEnum extends Migration
{
    public function up()
    {
        // Update status column enum constraint to include 'negotiating', 'missed', and 'cancelled'
        $this->db->query("ALTER TABLE offers MODIFY COLUMN status ENUM('pending', 'accepted', 'rejected', 'withdrawn', 'negotiating', 'missed', 'cancelled') DEFAULT 'pending'");

        // Fix existing offers where invalid status defaulted to empty string ''
        $this->db->query("UPDATE offers SET status = 'negotiating' WHERE status = '' OR status IS NULL");
    }

    public function down()
    {
        $this->db->query("ALTER TABLE offers MODIFY COLUMN status ENUM('pending', 'accepted', 'rejected', 'withdrawn') DEFAULT 'pending'");
    }
}
