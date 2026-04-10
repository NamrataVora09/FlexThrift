<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateSubscriptionTierSettingsTable extends Migration
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
            'tier' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
                'null' => false,
            ],
            'max_products' => [
                'type' => 'INT',
                'constraint' => 11,
                'null' => false,
            ],
            'monthly_price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => false,
            ],
            'yearly_price' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => false,
            ],
            'features' => [
                'type' => 'TEXT',
                'null' => true,
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
        $this->forge->addUniqueKey('tier', 'unique_tier');
        $this->forge->createTable('subscription_tier_settings');

        // Insert default values (these match the helper function defaults)
        $db = \Config\Database::connect();
        $defaultTiers = [
            ['tier' => 'free', 'max_products' => 3, 'monthly_price' => 0, 'yearly_price' => 0, 'features' => '3 Product uploads, Basic support'],
            ['tier' => 'basic', 'max_products' => 10, 'monthly_price' => 99, 'yearly_price' => 999, 'features' => '10 Product uploads, Priority support, Analytics'],
            ['tier' => 'pro', 'max_products' => 50, 'monthly_price' => 299, 'yearly_price' => 2999, 'features' => '50 Product uploads, 24/7 Support, Advanced analytics, Featured listings'],
            ['tier' => 'enterprise', 'max_products' => 999, 'monthly_price' => 999, 'yearly_price' => 9999, 'features' => 'Unlimited uploads, Dedicated manager, API access, Custom branding'],
        ];

        foreach ($defaultTiers as $tier) {
            $tier['created_at'] = date('Y-m-d H:i:s');
            $db->table('subscription_tier_settings')->insert($tier);
        }
    }

    public function down()
    {
        $this->forge->dropTable('subscription_tier_settings');
    }
}
