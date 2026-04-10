<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddPostingLimitsToUsers extends Migration
{
    public function up()
    {
        $fields = [
            'daily_posts_count' => [
                'type' => 'INT',
                'constraint' => 11,
                'default' => 0,
                'comment' => 'Number of posts today',
            ],
            'weekly_posts_count' => [
                'type' => 'INT',
                'constraint' => 11,
                'default' => 0,
                'comment' => 'Number of posts this week',
            ],
            'monthly_posts_count' => [
                'type' => 'INT',
                'constraint' => 11,
                'default' => 0,
                'comment' => 'Number of posts this month',
            ],
            'last_post_date' => [
                'type' => 'DATE',
                'null' => true,
                'comment' => 'Last date of posting',
            ],
            'posting_limit_charges_paid' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'default' => 0.00,
                'comment' => 'Total charges paid for exceeding limits',
            ],
        ];

        $this->forge->addColumn('users', $fields);

        // Create posting limits configuration table
        $this->forge->addField([
            'id' => [
                'type' => 'INT',
                'constraint' => 11,
                'unsigned' => true,
                'auto_increment' => true,
            ],
            'limit_type' => [
                'type' => 'ENUM',
                'constraint' => ['daily', 'weekly', 'monthly'],
                'null' => false,
            ],
            'subscription_tier' => [
                'type' => 'VARCHAR',
                'constraint' => 50,
                'null' => false,
            ],
            'max_posts' => [
                'type' => 'INT',
                'constraint' => 11,
                'null' => false,
                'comment' => 'Maximum posts allowed',
            ],
            'charge_per_extra_post' => [
                'type' => 'DECIMAL',
                'constraint' => '10,2',
                'null' => false,
                'comment' => 'Charge for each post beyond limit',
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
        $this->forge->addUniqueKey(['limit_type', 'subscription_tier'], 'unique_limit_tier');
        $this->forge->createTable('posting_limits');

        // Insert default posting limits
        $db = \Config\Database::connect();
        $defaultLimits = [
            // Daily limits
            ['limit_type' => 'daily', 'subscription_tier' => 'free', 'max_posts' => 1, 'charge_per_extra_post' => 10.00],
            ['limit_type' => 'daily', 'subscription_tier' => 'basic', 'max_posts' => 3, 'charge_per_extra_post' => 8.00],
            ['limit_type' => 'daily', 'subscription_tier' => 'pro', 'max_posts' => 10, 'charge_per_extra_post' => 5.00],
            ['limit_type' => 'daily', 'subscription_tier' => 'enterprise', 'max_posts' => 999, 'charge_per_extra_post' => 0.00],
            
            // Weekly limits
            ['limit_type' => 'weekly', 'subscription_tier' => 'free', 'max_posts' => 5, 'charge_per_extra_post' => 8.00],
            ['limit_type' => 'weekly', 'subscription_tier' => 'basic', 'max_posts' => 15, 'charge_per_extra_post' => 6.00],
            ['limit_type' => 'weekly', 'subscription_tier' => 'pro', 'max_posts' => 50, 'charge_per_extra_post' => 4.00],
            ['limit_type' => 'weekly', 'subscription_tier' => 'enterprise', 'max_posts' => 999, 'charge_per_extra_post' => 0.00],
            
            // Monthly limits
            ['limit_type' => 'monthly', 'subscription_tier' => 'free', 'max_posts' => 10, 'charge_per_extra_post' => 5.00],
            ['limit_type' => 'monthly', 'subscription_tier' => 'basic', 'max_posts' => 50, 'charge_per_extra_post' => 4.00],
            ['limit_type' => 'monthly', 'subscription_tier' => 'pro', 'max_posts' => 200, 'charge_per_extra_post' => 3.00],
            ['limit_type' => 'monthly', 'subscription_tier' => 'enterprise', 'max_posts' => 999, 'charge_per_extra_post' => 0.00],
        ];

        foreach ($defaultLimits as $limit) {
            $limit['created_at'] = date('Y-m-d H:i:s');
            $db->table('posting_limits')->insert($limit);
        }
    }

    public function down()
    {
        $this->forge->dropColumn('users', [
            'daily_posts_count',
            'weekly_posts_count',
            'monthly_posts_count',
            'last_post_date',
            'posting_limit_charges_paid',
        ]);
        
        $this->forge->dropTable('posting_limits');
    }
}
