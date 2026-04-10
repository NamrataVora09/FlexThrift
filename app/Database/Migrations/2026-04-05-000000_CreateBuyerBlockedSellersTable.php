<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateBuyerBlockedSellersTable extends Migration
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
            'buyer_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'blocked_seller_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'reason' => [
                'type' => 'TEXT',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => false,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => false,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addUniqueKey(['buyer_id', 'blocked_seller_id']);
        $this->forge->addForeignKey('buyer_id', 'users', 'id', '', 'CASCADE');
        $this->forge->addForeignKey('blocked_seller_id', 'users', 'id', '', 'CASCADE');
        $this->forge->createTable('buyer_blocked_sellers');
    }

    public function down()
    {
        $this->forge->dropTable('buyer_blocked_sellers');
    }
}
