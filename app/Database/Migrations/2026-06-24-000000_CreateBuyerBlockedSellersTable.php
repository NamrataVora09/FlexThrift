<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateBuyerBlockedSellersTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 10,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'buyer_id' => [
                'type'       => 'INT',
                'constraint' => 10,
                'unsigned'   => true,
                'null'       => false,
            ],
            'blocked_seller_id' => [
                'type'       => 'INT',
                'constraint' => 10,
                'unsigned'   => true,
                'null'       => false,
            ],
            'created_at' => [
                'type'    => 'DATETIME',
                'null'    => false,
                'default' => 'CURRENT_TIMESTAMP',
            ],
        ]);

        $this->forge->addPrimaryKey('id');
        $this->forge->addUniqueKey(['buyer_id', 'blocked_seller_id'], 'unique_block');
        $this->forge->addKey('buyer_id', false, false, 'idx_buyer');

        $this->forge->createTable('buyer_blocked_sellers', true);
    }

    public function down()
    {
        $this->forge->dropTable('buyer_blocked_sellers', true);
    }
}
