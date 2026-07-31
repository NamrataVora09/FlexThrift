<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class FixSellOfferAutoRejectRemarks extends Migration
{
    public function up()
    {
        // Fix auto-rejected sell offers that incorrectly say "these dates"
        // These offers were rejected when a sell product was sold to another buyer
        $this->db->query("
            UPDATE offers o
            INNER JOIN products p ON p.id = o.product_id
            SET o.seller_remarks = 'Another buyer\\'s offer for this product has been accepted.'
            WHERE o.status = 'rejected'
              AND (o.offer_type = 'sell' OR (o.offer_type IS NULL AND p.listing_type = 'sell'))
              AND o.seller_remarks = 'Another buyer\\'s offer for these dates has been accepted.'
        ");
    }

    public function down()
    {
        // No reliable way to reverse data corrections
    }
}
