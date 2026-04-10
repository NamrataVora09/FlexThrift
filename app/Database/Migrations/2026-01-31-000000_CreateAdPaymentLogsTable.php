<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateAdPaymentLogsTable extends Migration
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
            'ad_id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
            ],
            'payment_date' => [
                'type' => 'DATE',
                'null' => true,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('ad_id', 'advertisements', 'id', 'CASCADE', 'CASCADE');
        $this->forge->createTable('ad_payment_logs');
    }

    public function down()
    {
        $this->forge->dropTable('ad_payment_logs');
    }
}
