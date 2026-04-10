<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Sync migration: creates tables that exist in live DB but had no migration file.
 * Tables covered:
 *   colors, coupons, coupon_usage, rejection_templates,
 *   registration_attempts, system_settings, subscription_plans,
 *   subscription_plans_audit, allowed_pin_codes, allowed_zones,
 *   pricing_rules, rental_pricing_rules
 */
class CreateMissingTablesSync extends Migration
{
    public function up(): void
    {
        // --- colors ---
        if (!$this->db->tableExists('colors')) {
            $this->forge->addField([
                'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'name'       => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
                'hex_code'   => ['type' => 'VARCHAR', 'constraint' => 10, 'null' => true],
                'created_at' => ['type' => 'DATETIME', 'null' => true],
                'updated_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->createTable('colors', true);
        }

        // --- coupons ---
        if (!$this->db->tableExists('coupons')) {
            $this->forge->addField([
                'id'               => ['type' => 'INT', 'unsigned' => false, 'auto_increment' => true],
                'code'             => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
                'discount_type'    => ['type' => 'ENUM', 'constraint' => ['percentage', 'fixed'], 'default' => 'percentage'],
                'discount_value'   => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => false],
                'min_order_amount' => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true, 'default' => 0.00],
                'max_discount'     => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true],
                'valid_from'       => ['type' => 'DATETIME', 'null' => true],
                'valid_until'      => ['type' => 'DATETIME', 'null' => true],
                'usage_limit'      => ['type' => 'INT', 'null' => true],
                'used_count'       => ['type' => 'INT', 'null' => false, 'default' => 0],
                'is_active'        => ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 1],
                'created_at'       => ['type' => 'DATETIME', 'null' => true],
                'updated_at'       => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->addUniqueKey('code');
            $this->forge->createTable('coupons', true);
        }

        // --- coupon_usage ---
        if (!$this->db->tableExists('coupon_usage')) {
            $this->forge->addField([
                'id'        => ['type' => 'INT', 'auto_increment' => true],
                'coupon_id' => ['type' => 'INT', 'null' => false],
                'user_id'   => ['type' => 'INT', 'null' => false],
                'used_at'   => ['type' => 'DATETIME', 'null' => true, 'default' => 'CURRENT_TIMESTAMP'],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->createTable('coupon_usage', true);
        }

        // --- rejection_templates ---
        if (!$this->db->tableExists('rejection_templates')) {
            $this->forge->addField([
                'id'            => ['type' => 'INT', 'auto_increment' => true],
                'template_text' => ['type' => 'TEXT', 'null' => false],
                'type'          => ['type' => 'ENUM', 'constraint' => ['Products', 'Brands'], 'null' => true, 'default' => 'Products'],
                'created_at'    => ['type' => 'DATETIME', 'null' => true],
                'updated_at'    => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->createTable('rejection_templates', true);
        }

        // --- registration_attempts ---
        if (!$this->db->tableExists('registration_attempts')) {
            $this->forge->addField([
                'id'         => ['type' => 'INT', 'auto_increment' => true],
                'mobile'     => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
                'ip_address' => ['type' => 'VARCHAR', 'constraint' => 45, 'null' => true],
                'country'    => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
                'state'      => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
                'city'       => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
                'latitude'   => ['type' => 'DECIMAL', 'constraint' => '10,7', 'null' => true],
                'longitude'  => ['type' => 'DECIMAL', 'constraint' => '10,7', 'null' => true],
                'is_allowed' => ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 0],
                'zone_id'    => ['type' => 'INT', 'null' => true],
                'user_id'    => ['type' => 'INT', 'null' => true],
                'created_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->createTable('registration_attempts', true);
        }

        // --- system_settings ---
        if (!$this->db->tableExists('system_settings')) {
            $this->forge->addField([
                'id'            => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'setting_key'   => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
                'setting_value' => ['type' => 'TEXT', 'null' => true],
                'updated_at'    => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->addUniqueKey('setting_key');
            $this->forge->createTable('system_settings', true);
        }

        // --- subscription_plans ---
        if (!$this->db->tableExists('subscription_plans')) {
            $this->forge->addField([
                'id'             => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'name'           => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false, 'default' => ''],
                'user_type'      => ['type' => 'ENUM', 'constraint' => ['seller', 'buyer'], 'null' => false, 'default' => 'buyer'],
                'plan_type'      => ['type' => 'ENUM', 'constraint' => ['quantity', 'duration'], 'null' => false, 'default' => 'duration'],
                'limit_value'    => ['type' => 'INT', 'null' => true, 'default' => 0],
                'base_price'     => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true, 'default' => 0.00],
                'plan_name'      => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
                'duration_hours' => ['type' => 'DECIMAL', 'constraint' => '8,2', 'null' => true, 'default' => 0.00],
                'price'          => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => false],
                'features'       => ['type' => 'TEXT', 'null' => true],
                'is_active'      => ['type' => 'TINYINT', 'constraint' => 1, 'null' => false, 'default' => 1],
                'created_at'     => ['type' => 'DATETIME', 'null' => true],
                'updated_at'     => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->createTable('subscription_plans', true);
        }

        // --- subscription_plans_audit ---
        if (!$this->db->tableExists('subscription_plans_audit')) {
            $this->forge->addField([
                'id'         => ['type' => 'INT', 'auto_increment' => true],
                'plan_id'    => ['type' => 'INT', 'null' => true],
                'admin_id'   => ['type' => 'INT', 'null' => true],
                'action'     => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
                'changes'    => ['type' => 'TEXT', 'null' => true],
                'created_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->createTable('subscription_plans_audit', true);
        }

        // --- allowed_pin_codes ---
        if (!$this->db->tableExists('allowed_pin_codes')) {
            $this->forge->addField([
                'id'         => ['type' => 'INT', 'unsigned' => true, 'auto_increment' => true],
                'pin_code'   => ['type' => 'VARCHAR', 'constraint' => 10, 'null' => false],
                'city'       => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
                'state'      => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
                'created_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->createTable('allowed_pin_codes', true);
        }

        // --- allowed_zones ---
        if (!$this->db->tableExists('allowed_zones')) {
            $this->forge->addField([
                'id'           => ['type' => 'INT', 'auto_increment' => true],
                'zone_name'    => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => false],
                'zone_polygon' => ['type' => 'LONGTEXT', 'null' => true],
                'is_active'    => ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 1],
                'created_by'   => ['type' => 'INT', 'null' => true],
                'created_at'   => ['type' => 'DATETIME', 'null' => true],
                'updated_at'   => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->createTable('allowed_zones', true);
        }

        // --- pricing_rules ---
        if (!$this->db->tableExists('pricing_rules')) {
            $this->forge->addField([
                'id'                   => ['type' => 'INT', 'auto_increment' => true],
                'filter_type'          => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
                'filter_value'         => ['type' => 'INT', 'null' => true],
                'filter_label'         => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
                'deduction_threshold'  => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => true, 'default' => 0.00],
                'depreciation_range_min' => ['type' => 'INT', 'null' => true, 'default' => 0],
                'depreciation_range_max' => ['type' => 'INT', 'null' => true, 'default' => 0],
                'depreciation_amount'  => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => true, 'default' => 0.00],
                'is_active'            => ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 1],
                'created_at'           => ['type' => 'DATETIME', 'null' => true],
                'updated_at'           => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->createTable('pricing_rules', true);
        }

        // --- rental_pricing_rules ---
        if (!$this->db->tableExists('rental_pricing_rules')) {
            $this->forge->addField([
                'id'                          => ['type' => 'INT', 'auto_increment' => true],
                'filter_type'                 => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => false],
                'filter_value'                => ['type' => 'INT', 'null' => true],
                'filter_label'                => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
                'deposit_deduction_threshold' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => true, 'default' => 0.00],
                'depreciation_range_min'      => ['type' => 'INT', 'null' => true, 'default' => 0],
                'depreciation_range_max'      => ['type' => 'INT', 'null' => true, 'default' => 0],
                'depreciation_amount'         => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => true, 'default' => 0.00],
                'deposit_percentage'          => ['type' => 'DECIMAL', 'constraint' => '5,2', 'null' => true, 'default' => 0.00],
                'max_cost_cap_per_day'        => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true, 'default' => 0.00],
                'is_active'                   => ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 1],
                'created_at'                  => ['type' => 'DATETIME', 'null' => true],
                'updated_at'                  => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addPrimaryKey('id');
            $this->forge->createTable('rental_pricing_rules', true);
        }
    }

    public function down(): void
    {
        $tables = [
            'colors', 'coupons', 'coupon_usage', 'rejection_templates',
            'registration_attempts', 'system_settings', 'subscription_plans',
            'subscription_plans_audit', 'allowed_pin_codes', 'allowed_zones',
            'pricing_rules', 'rental_pricing_rules',
        ];
        foreach ($tables as $table) {
            $this->forge->dropTable($table, true);
        }
    }
}
