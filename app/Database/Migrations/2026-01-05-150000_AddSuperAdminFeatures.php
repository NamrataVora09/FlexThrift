<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddSuperAdminFeatures extends Migration
{
    public function up()
    {
        // Add bgv_cleared to users table
        if (!$this->db->fieldExists('bgv_cleared', 'users')) {
            $this->forge->addColumn('users', [
                'bgv_cleared' => [
                    'type' => 'TINYINT',
                    'constraint' => 1,
                    'default' => 0,
                    'null' => false,
                    'after' => 'is_blocked',
                ],
            ]);
        }

        // Add is_blocked and created_by_admin to brands table
        if ($this->db->tableExists('brands')) {
            if (!$this->db->fieldExists('is_blocked', 'brands')) {
                $this->forge->addColumn('brands', [
                    'is_blocked' => [
                        'type' => 'TINYINT',
                        'constraint' => 1,
                        'default' => 0,
                        'null' => false,
                    ],
                ]);
            }
            if (!$this->db->fieldExists('created_by_admin', 'brands')) {
                $this->forge->addColumn('brands', [
                    'created_by_admin' => [
                        'type' => 'TINYINT',
                        'constraint' => 1,
                        'default' => 0,
                        'null' => false,
                    ],
                ]);
            }
        }

        // Add rental extension fields to orders table
        if ($this->db->tableExists('orders')) {
            if (!$this->db->fieldExists('rental_extension_proof', 'orders')) {
                $this->forge->addColumn('orders', [
                    'rental_extension_proof' => [
                        'type' => 'TEXT',
                        'null' => true,
                    ],
                ]);
            }
        }

        // Create allowed_pin_codes table
        if (!$this->db->tableExists('allowed_pin_codes')) {
            $this->forge->addField([
                'id' => [
                    'type' => 'INT',
                    'constraint' => 11,
                    'unsigned' => true,
                    'auto_increment' => true,
                ],
                'pin_code' => [
                    'type' => 'VARCHAR',
                    'constraint' => 10,
                ],
                'city' => [
                    'type' => 'VARCHAR',
                    'constraint' => 100,
                ],
                'state' => [
                    'type' => 'VARCHAR',
                    'constraint' => 100,
                ],
                'created_at' => [
                    'type' => 'DATETIME',
                    'null' => true,
                ],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('allowed_pin_codes');
        }

        // Create listing_types table
        if (!$this->db->tableExists('listing_types')) {
            $this->forge->addField([
                'id' => [
                    'type' => 'INT',
                    'constraint' => 11,
                    'unsigned' => true,
                    'auto_increment' => true,
                ],
                'type_name' => [
                    'type' => 'VARCHAR',
                    'constraint' => 100,
                ],
                'category' => [
                    'type' => 'VARCHAR',
                    'constraint' => 50,
                ],
                'created_at' => [
                    'type' => 'DATETIME',
                    'null' => true,
                ],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('listing_types');
        }

        // Create system_settings table
        if (!$this->db->tableExists('system_settings')) {
            $this->forge->addField([
                'id' => [
                    'type' => 'INT',
                    'constraint' => 11,
                    'unsigned' => true,
                    'auto_increment' => true,
                ],
                'setting_key' => [
                    'type' => 'VARCHAR',
                    'constraint' => 100,
                    'unique' => true,
                ],
                'setting_value' => [
                    'type' => 'TEXT',
                    'null' => true,
                ],
                'updated_at' => [
                    'type' => 'DATETIME',
                    'null' => true,
                ],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('system_settings');

            // Insert default system settings
            $settings = [
                ['setting_key' => 'product_approval_required', 'setting_value' => '1'],
                ['setting_key' => 'maintenance_mode', 'setting_value' => '0'],
                ['setting_key' => 'brand_creation_enabled', 'setting_value' => '1'],
                ['setting_key' => 'brand_badge_requirement', 'setting_value' => '25'],
                ['setting_key' => 'seller_min_transaction_amount', 'setting_value' => '100'],
                ['setting_key' => 'platform_commission', 'setting_value' => '5'],
                ['setting_key' => 'delivery_commission', 'setting_value' => '2'],
                ['setting_key' => 'payment_gateway_commission', 'setting_value' => '2'],
                ['setting_key' => 'gst_rate', 'setting_value' => '18'],
                ['setting_key' => 'delivery_formula', 'setting_value' => '{"base_charge":50,"per_km_charge":10,"weight_multiplier":1.5}'],
                ['setting_key' => 'contact_viewing_ranges', 'setting_value' => '{"daily_range":10,"weekly_range":50,"monthly_range":200}'],
                ['setting_key' => 'subscription_price_range', 'setting_value' => '{"min_price":99,"max_price":999}'],
            ];

            foreach ($settings as $setting) {
                $this->db->table('system_settings')->insert($setting);
            }
        }

        // Create subscription_plans table
        if (!$this->db->tableExists('subscription_plans')) {
            $this->forge->addField([
                'id' => [
                    'type' => 'INT',
                    'constraint' => 11,
                    'unsigned' => true,
                    'auto_increment' => true,
                ],
                'name' => [
                    'type' => 'VARCHAR',
                    'constraint' => 100,
                ],
                'user_type' => [
                    'type' => 'ENUM',
                    'constraint' => ['seller', 'buyer'],
                    'default' => 'buyer',
                ],
                'plan_type' => [
                    'type' => 'ENUM',
                    'constraint' => ['quantity', 'duration'],
                    'default' => 'duration',
                ],
                'limit_value' => [
                    'type' => 'INT',
                    'constraint' => 11,
                    'default' => 0,
                    'null' => true,
                ],
                'base_price' => [
                    'type' => 'DECIMAL',
                    'constraint' => '10,2',
                    'default' => 0.00,
                    'null' => true,
                ],
                'plan_name' => [
                    'type' => 'VARCHAR',
                    'constraint' => 100,
                ],
                'duration_hours' => [
                    'type' => 'INT',
                    'constraint' => 11,
                    'default' => 0,
                    'null' => true,
                ],
                'price' => [
                    'type' => 'DECIMAL',
                    'constraint' => '10,2',
                ],
                'features' => [
                    'type' => 'TEXT',
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
            $this->forge->createTable('subscription_plans');
        }

        // Create categories table
        if (!$this->db->tableExists('categories')) {
            $this->forge->addField([
                'id' => [
                    'type' => 'INT',
                    'constraint' => 11,
                    'unsigned' => true,
                    'auto_increment' => true,
                ],
                'category_name' => [
                    'type' => 'VARCHAR',
                    'constraint' => 100,
                ],
                'category_type' => [
                    'type' => 'VARCHAR',
                    'constraint' => 50,
                ],
                'applies_to' => [
                    'type' => 'VARCHAR',
                    'constraint' => 50,
                ],
                'created_at' => [
                    'type' => 'DATETIME',
                    'null' => true,
                ],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('categories');
        }

        // Create advertisements table
        if (!$this->db->tableExists('advertisements')) {
            $this->forge->addField([
                'id' => [
                    'type' => 'INT',
                    'constraint' => 11,
                    'unsigned' => true,
                    'auto_increment' => true,
                ],
                'title' => [
                    'type' => 'VARCHAR',
                    'constraint' => 200,
                ],
                'media_path' => [
                    'type' => 'VARCHAR',
                    'constraint' => 255,
                ],
                'media_type' => [
                    'type' => 'VARCHAR',
                    'constraint' => 50,
                ],
                'position' => [
                    'type' => 'VARCHAR',
                    'constraint' => 50,
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
            $this->forge->createTable('advertisements');
        }

        // Create order_status_history table
        if (!$this->db->tableExists('order_status_history')) {
            $this->forge->addField([
                'id' => [
                    'type' => 'INT',
                    'constraint' => 11,
                    'unsigned' => true,
                    'auto_increment' => true,
                ],
                'order_id' => [
                    'type' => 'INT',
                    'constraint' => 11,
                    'unsigned' => true,
                ],
                'status' => [
                    'type' => 'VARCHAR',
                    'constraint' => 50,
                ],
                'updated_by' => [
                    'type' => 'INT',
                    'constraint' => 11,
                    'unsigned' => true,
                    'null' => true,
                ],
                'updated_by_role' => [
                    'type' => 'VARCHAR',
                    'constraint' => 50,
                    'null' => true,
                ],
                'remarks' => [
                    'type' => 'TEXT',
                    'null' => true,
                ],
                'created_at' => [
                    'type' => 'DATETIME',
                    'null' => true,
                ],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('order_status_history');
        }
    }

    public function down()
    {
        // Remove added columns
        if ($this->db->fieldExists('bgv_cleared', 'users')) {
            $this->forge->dropColumn('users', 'bgv_cleared');
        }

        if ($this->db->tableExists('brands')) {
            if ($this->db->fieldExists('is_blocked', 'brands')) {
                $this->forge->dropColumn('brands', 'is_blocked');
            }
            if ($this->db->fieldExists('created_by_admin', 'brands')) {
                $this->forge->dropColumn('brands', 'created_by_admin');
            }
        }

        if ($this->db->tableExists('orders')) {
            if ($this->db->fieldExists('rental_extension_proof', 'orders')) {
                $this->forge->dropColumn('orders', 'rental_extension_proof');
            }
        }

        // Drop tables
        $this->forge->dropTable('allowed_pin_codes', true);
        $this->forge->dropTable('listing_types', true);
        $this->forge->dropTable('system_settings', true);
        $this->forge->dropTable('subscription_plans', true);
        $this->forge->dropTable('categories', true);
        $this->forge->dropTable('advertisements', true);
        $this->forge->dropTable('order_status_history', true);
    }
}
