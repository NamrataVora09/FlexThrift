<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSubscriptionPackagesTable extends Migration
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
            'package_name' => [
                'type' => 'VARCHAR',
                'constraint' => 100,
                'comment' => '3 Contacts, 5 Contacts, 7 Contacts, 10 Contacts',
            ],
            'contact_limit' => [
                'type' => 'INT',
                'constraint' => 11,
                'comment' => 'Number of seller contacts buyer can view',
            ],
            'duration_type' => [
                'type' => 'ENUM',
                'constraint' => ['monthly', 'quarterly', 'yearly'],
                'default' => 'monthly',
            ],
            'duration_months' => [
                'type' => 'INT',
                'constraint' => 11,
                'comment' => '1 for monthly, 3 for quarterly, 12 for yearly',
            ],
            'price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'comment' => 'Package price',
            ],
            'discount_percentage' => [
                'type' => 'DECIMAL',
                'constraint' => '5,2',
                'default' => 0.00,
                'null' => true,
            ],
            'is_active' => [
                'type' => 'TINYINT',
                'constraint' => 1,
                'default' => 1,
            ],
            'created_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
            'updated_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);

        $this->forge->addKey('id', true);
        $this->forge->createTable('subscription_packages');
    }

    public function down()
    {
        $this->forge->dropTable('subscription_packages');
    }
}
