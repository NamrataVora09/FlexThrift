<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateBuyerPaymentHistoryTable extends Migration
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
            'order_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'payment_type' => [
                'type' => 'ENUM',
                'constraint' => ['sale_payment', 'rent_payment', 'deposit_paid', 'deposit_refunded'],
            ],
            'amount' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
            ],
            'status' => [
                'type' => 'ENUM',
                'constraint' => ['pending', 'deducted', 'refunded'],
                'default' => 'pending',
            ],
            'flag' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
                'comment' => 'Rent Deducted, Deposit Deducted, Payment Deducted',
            ],
            'transaction_reference' => [
                'type' => 'VARCHAR',
                'constraint' => 100,
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('buyer_id', 'users', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('order_id', 'orders', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('buyer_payment_history');
    }

    public function down()
    {
        $this->forge->dropTable('buyer_payment_history');
    }
}
