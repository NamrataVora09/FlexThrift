<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateMissingTables extends Migration
{
    public function up()
    {
        // app_messages
        if (!$this->db->tableExists('app_messages')) {
            $this->forge->addField([
                'id'            => ['type' => 'INT', 'auto_increment' => true],
                'message_key'   => ['type' => 'VARCHAR', 'constraint' => 100, 'unique' => true],
                'message_value' => ['type' => 'TEXT'],
                'category'      => ['type' => 'VARCHAR', 'constraint' => 50, 'default' => 'general'],
                'created_at'    => ['type' => 'TIMESTAMP', 'null' => true],
                'updated_at'    => ['type' => 'TIMESTAMP', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('app_messages');

            $this->db->table('app_messages')->insertBatch([
                ['message_key' => 'auth_login_required',  'message_value' => 'Please login first',                               'category' => 'error'],
                ['message_key' => 'product_not_found',    'message_value' => 'Product not found',                                'category' => 'error'],
                ['message_key' => 'offer_sent_success',   'message_value' => 'Offer sent successfully!',                         'category' => 'success'],
                ['message_key' => 'min_rental_duration',  'message_value' => 'Minimum rental duration is {min} days',           'category' => 'error'],
                ['message_key' => 'booking_conflict',     'message_value' => 'Product already booked for selected dates',       'category' => 'error'],
                ['message_key' => 'offer_not_found',      'message_value' => 'Invalid offer',                                   'category' => 'error'],
                ['message_key' => 'offer_cancelled_success', 'message_value' => 'Offer cancelled successfully',                 'category' => 'success'],
                ['message_key' => 'review_submit_success','message_value' => 'Review submitted successfully!',                  'category' => 'success'],
                ['message_key' => 'already_rated_seller', 'message_value' => 'You have already rated this seller',              'category' => 'error'],
                ['message_key' => 'rating_window_expired','message_value' => 'Rating window has expired',                       'category' => 'error'],
                ['message_key' => 'order_not_found',      'message_value' => 'Order not found',                                 'category' => 'error'],
                ['message_key' => 'order_cancel_success', 'message_value' => 'Order cancelled successfully',                   'category' => 'success'],
                ['message_key' => 'payment_success',      'message_value' => 'Payment successful! Order confirmed.',            'category' => 'success'],
                ['message_key' => 'dates_update_success', 'message_value' => 'Rental dates updated successfully!',             'category' => 'success'],
            ]);
        }

        // rejection_templates
        if (!$this->db->tableExists('rejection_templates')) {
            $this->forge->addField([
                'id'            => ['type' => 'INT', 'auto_increment' => true],
                'template_text' => ['type' => 'TEXT'],
                'created_at'    => ['type' => 'DATETIME', 'null' => true],
                'updated_at'    => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('rejection_templates');
        }

        // coupons
        if (!$this->db->tableExists('coupons')) {
            $this->forge->addField([
                'id'             => ['type' => 'INT', 'auto_increment' => true],
                'code'           => ['type' => 'VARCHAR', 'constraint' => 50, 'unique' => true],
                'discount_type'  => ['type' => 'ENUM', 'constraint' => ['percentage', 'fixed'], 'default' => 'percentage'],
                'discount_value' => ['type' => 'DECIMAL', 'constraint' => '10,2'],
                'min_purchase'   => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0],
                'max_discount'   => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true],
                'expires_at'     => ['type' => 'DATETIME', 'null' => true],
                'usage_limit'    => ['type' => 'INT', 'null' => true],
                'is_active'      => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
                'created_at'     => ['type' => 'DATETIME', 'null' => true],
                'updated_at'     => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('coupons');
        }

        // coupon_usage
        if (!$this->db->tableExists('coupon_usage')) {
            $this->forge->addField([
                'id'        => ['type' => 'INT', 'auto_increment' => true],
                'coupon_id' => ['type' => 'INT'],
                'user_id'   => ['type' => 'INT'],
                'used_at'   => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->addForeignKey('coupon_id', 'coupons', 'id', 'CASCADE', 'CASCADE');
            $this->forge->createTable('coupon_usage');
        }

        // pricing_rules
        if (!$this->db->tableExists('pricing_rules')) {
            $this->forge->addField([
                'id'                     => ['type' => 'INT', 'auto_increment' => true],
                'filter_type'            => ['type' => 'VARCHAR', 'constraint' => 50],
                'filter_value'           => ['type' => 'INT', 'null' => true],
                'filter_label'           => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
                'deduction_threshold'    => ['type' => 'DECIMAL', 'constraint' => '5,2', 'default' => 0],
                'depreciation_range_min' => ['type' => 'INT', 'default' => 0],
                'depreciation_range_max' => ['type' => 'INT', 'default' => 0],
                'depreciation_amount'    => ['type' => 'DECIMAL', 'constraint' => '5,2', 'default' => 0],
                'is_active'              => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
                'created_at'             => ['type' => 'DATETIME', 'null' => true],
                'updated_at'             => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('pricing_rules');
        }

        // rental_pricing_rules
        if (!$this->db->tableExists('rental_pricing_rules')) {
            $this->forge->addField([
                'id'                          => ['type' => 'INT', 'auto_increment' => true],
                'filter_type'                 => ['type' => 'VARCHAR', 'constraint' => 50],
                'filter_value'                => ['type' => 'INT', 'null' => true],
                'filter_label'                => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
                'deposit_deduction_threshold' => ['type' => 'DECIMAL', 'constraint' => '5,2', 'default' => 0],
                'depreciation_range_min'      => ['type' => 'INT', 'default' => 0],
                'depreciation_range_max'      => ['type' => 'INT', 'default' => 0],
                'depreciation_amount'         => ['type' => 'DECIMAL', 'constraint' => '5,2', 'default' => 0],
                'deposit_percentage'          => ['type' => 'DECIMAL', 'constraint' => '5,2', 'default' => 0],
                'max_cost_cap_per_day'        => ['type' => 'DECIMAL', 'constraint' => '10,2', 'default' => 0],
                'is_active'                   => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
                'created_at'                  => ['type' => 'DATETIME', 'null' => true],
                'updated_at'                  => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('rental_pricing_rules');
        }

        // offer_history
        if (!$this->db->tableExists('offer_history')) {
            $this->forge->addField([
                'id'             => ['type' => 'INT', 'auto_increment' => true],
                'offer_id'       => ['type' => 'INT'],
                'changed_by'     => ['type' => 'INT', 'null' => true],
                'action'         => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
                'old_start_date' => ['type' => 'DATE', 'null' => true],
                'new_start_date' => ['type' => 'DATE', 'null' => true],
                'old_end_date'   => ['type' => 'DATE', 'null' => true],
                'new_end_date'   => ['type' => 'DATE', 'null' => true],
                'old_price'      => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true],
                'new_price'      => ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true],
                'created_at'     => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('offer_history');
        }

        // registration_attempts
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
                'is_allowed' => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 0],
                'zone_id'    => ['type' => 'INT', 'null' => true],
                'user_id'    => ['type' => 'INT', 'null' => true],
                'created_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('registration_attempts');
        }

        // allowed_zones
        if (!$this->db->tableExists('allowed_zones')) {
            $this->forge->addField([
                'id'           => ['type' => 'INT', 'auto_increment' => true],
                'zone_name'    => ['type' => 'VARCHAR', 'constraint' => 100],
                'zone_polygon' => ['type' => 'LONGTEXT', 'null' => true],
                'is_active'    => ['type' => 'TINYINT', 'constraint' => 1, 'default' => 1],
                'created_by'   => ['type' => 'INT', 'null' => true],
                'created_at'   => ['type' => 'DATETIME', 'null' => true],
                'updated_at'   => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('allowed_zones');
        }

        // colors
        if (!$this->db->tableExists('colors')) {
            $this->forge->addField([
                'id'         => ['type' => 'INT', 'auto_increment' => true],
                'name'       => ['type' => 'VARCHAR', 'constraint' => 100],
                'hex_code'   => ['type' => 'VARCHAR', 'constraint' => 10, 'null' => true],
                'created_at' => ['type' => 'DATETIME', 'null' => true],
                'updated_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('colors');
        }

        // subscription_plans_audit
        if (!$this->db->tableExists('subscription_plans_audit')) {
            $this->forge->addField([
                'id'         => ['type' => 'INT', 'auto_increment' => true],
                'plan_id'    => ['type' => 'INT', 'null' => true],
                'admin_id'   => ['type' => 'INT', 'null' => true],
                'action'     => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
                'changes'    => ['type' => 'TEXT', 'null' => true],
                'created_at' => ['type' => 'DATETIME', 'null' => true],
            ]);
            $this->forge->addKey('id', true);
            $this->forge->createTable('subscription_plans_audit');
        }
    }

    public function down()
    {
        $this->forge->dropTable('subscription_plans_audit', true);
        $this->forge->dropTable('colors', true);
        $this->forge->dropTable('allowed_zones', true);
        $this->forge->dropTable('registration_attempts', true);
        $this->forge->dropTable('offer_history', true);
        $this->forge->dropTable('rental_pricing_rules', true);
        $this->forge->dropTable('pricing_rules', true);
        $this->forge->dropTable('coupon_usage', true);
        $this->forge->dropTable('coupons', true);
        $this->forge->dropTable('rejection_templates', true);
        $this->forge->dropTable('app_messages', true);
    }
}
