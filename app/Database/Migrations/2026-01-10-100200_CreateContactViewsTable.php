<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateContactViewsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'user_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'comment' => 'Buyer who viewed contact',
            ],
            'seller_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'comment' => 'Seller whose contact was viewed',
            ],
            'product_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'subscription_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'null' => true,
                'comment' => 'Active subscription when viewed',
            ],
            'viewed_at' => [
                'type' => 'DATETIME',
                'null' => false,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('user_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('seller_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('product_id', 'products', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('subscription_id', 'user_subscriptions', 'id', 'SET NULL', 'CASCADE');
        
        // Prevent duplicate views of same seller by same buyer
        $this->forge->addKey(['user_id', 'seller_id'], false, true, 'unique_buyer_seller_view');
        
        $this->forge->createTable('contact_views');
    }

    public function down()
    {
        $this->forge->dropTable('contact_views');
    }
}
