<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSelfDeliveryFieldsToReviews extends Migration
{
    public function up()
    {
        $fields = [
            'product_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
                'after' => 'order_id',
            ],
            'review_type' => [
                'type' => 'ENUM',
                'constraint' => ['order', 'self_delivery'],
                'default' => 'order',
                'after' => 'reviewer_type',
            ],
        ];

        $this->forge->addColumn('reviews', $fields);

        // Add foreign key for product_id
        $db = \Config\Database::connect();
        $db->query('ALTER TABLE reviews ADD CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE');
    }

    public function down()
    {
        // Drop foreign key first
        $db = \Config\Database::connect();
        $db->query('ALTER TABLE reviews DROP FOREIGN KEY fk_reviews_product');
        
        $this->forge->dropColumn('reviews', ['product_id', 'review_type']);
    }
}
