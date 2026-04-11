<?php

use CodeIgniter\Database\Migration;

/**
 * Sync migration: adds columns that exist in live DB but were never in a migration file.
 *
 * Tables patched:
 *   brands              → is_blocked, created_by_admin, rejection_reason
 *   offers              → counter_price, delivery_country, delivery_state, delivery_city,
 *                         buyer_change_count, is_rental_blocked
 *   orders              → delivery_country, delivery_state, delivery_city, delivery_photo,
 *                         rental_extension_proof, pickup_time_start, pickup_time_end,
 *                         drop_time_start, drop_time_end, delivery_accepted_at,
 *                         delivery_charge, max_delivery_date, status_updated_at,
 *                         seller_pin_code, buyer_pin_code, dispatched_at
 *   users               → referral_code, referred_by, referral_balance, has_used_referral,
 *                         referral_expires_at, role, is_blocked, blocked_from_user_management,
 *                         bgv_cleared, products_uploaded_count, subscription_tier,
 *                         seller_rating_avg, seller_rating_count, buyer_rating_avg,
 *                         buyer_rating_count, daily_posts_count, weekly_posts_count,
 *                         monthly_posts_count, last_post_date, posting_limit_charges_paid,
 *                         blocked_seller, blocked_buyer, blocked_from_approvals,
 *                         reliability_score, renter_reliability_score
 *   products            → product_number, orignal_brand_id, gender_ids, category_ids,
 *                         sub_category_ids, suggested_rental_cost, allow_alter_fitting,
 *                         dispatch_state, dispatch_city, specifications,
 *                         rental_start_date, rental_end_date, is_featured,
 *                         price_category, required_badges
 *   delivery_persons    → pan_card, aadhar_card, kyc_verified, badges,
 *                         rental_reliability_score, sale_reliability_score, status
 *   listing_types       → usage_label
 *   transactions        → type, payment_status
 *   user_subscriptions  → amount_paid, referral_discount_applied, merchant_transaction_id
 *   cms_pages           → status
 */
class AddMissingColumnsSync extends Migration
{
    public function up(): void
    {
        // ─── cms_pages ────────────────────────────────────────────────
        $this->addColumnIfMissing('cms_pages', 'status', ['type' => 'ENUM', 'constraint' => ['active', 'inactive'], 'null' => true, 'default' => 'active']);
        // ─── brands ───────────────────────────────────────────────────
        $this->addColumnIfMissing('brands', 'is_blocked',       ['type' => 'TINYINT', 'constraint' => 1, 'null' => false, 'default' => 0]);
        $this->addColumnIfMissing('brands', 'created_by_admin', ['type' => 'TINYINT', 'constraint' => 1, 'null' => false, 'default' => 0]);
        $this->addColumnIfMissing('brands', 'rejection_reason', ['type' => 'TEXT', 'null' => true]);

        // ─── offers ───────────────────────────────────────────────────
        $this->addColumnIfMissing('offers', 'counter_price',     ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true]);
        $this->addColumnIfMissing('offers', 'delivery_country',  ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true]);
        $this->addColumnIfMissing('offers', 'delivery_state',    ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true]);
        $this->addColumnIfMissing('offers', 'delivery_city',     ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true]);
        $this->addColumnIfMissing('offers', 'buyer_change_count',['type' => 'INT', 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('offers', 'is_rental_blocked', ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 0]);

        // ─── orders ───────────────────────────────────────────────────
        $this->addColumnIfMissing('orders', 'delivery_country',       ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true]);
        $this->addColumnIfMissing('orders', 'delivery_state',         ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true]);
        $this->addColumnIfMissing('orders', 'delivery_city',          ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true]);
        $this->addColumnIfMissing('orders', 'delivery_photo',         ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true]);
        $this->addColumnIfMissing('orders', 'rental_extension_proof', ['type' => 'TEXT', 'null' => true]);
        $this->addColumnIfMissing('orders', 'pickup_time_start',      ['type' => 'DATETIME', 'null' => true]);
        $this->addColumnIfMissing('orders', 'pickup_time_end',        ['type' => 'DATETIME', 'null' => true]);
        $this->addColumnIfMissing('orders', 'drop_time_start',        ['type' => 'DATETIME', 'null' => true]);
        $this->addColumnIfMissing('orders', 'drop_time_end',          ['type' => 'DATETIME', 'null' => true]);
        $this->addColumnIfMissing('orders', 'delivery_accepted_at',   ['type' => 'DATETIME', 'null' => true]);
        $this->addColumnIfMissing('orders', 'delivery_charge',        ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true, 'default' => 50.00]);
        $this->addColumnIfMissing('orders', 'max_delivery_date',      ['type' => 'DATETIME', 'null' => true]);
        $this->addColumnIfMissing('orders', 'status_updated_at',      ['type' => 'DATETIME', 'null' => true]);
        $this->addColumnIfMissing('orders', 'seller_pin_code',        ['type' => 'VARCHAR', 'constraint' => 10, 'null' => true]);
        $this->addColumnIfMissing('orders', 'buyer_pin_code',         ['type' => 'VARCHAR', 'constraint' => 10, 'null' => true]);
        $this->addColumnIfMissing('orders', 'dispatched_at',          ['type' => 'DATETIME', 'null' => true]);

        // ─── users ────────────────────────────────────────────────────
        $this->addColumnIfMissing('users', 'referral_code',                ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true]);
        $this->addColumnIfMissing('users', 'referred_by',                  ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true]);
        $this->addColumnIfMissing('users', 'referral_balance',             ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true, 'default' => 0.00]);
        $this->addColumnIfMissing('users', 'has_used_referral',            ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'referral_expires_at',          ['type' => 'DATETIME', 'null' => true]);
        $this->addColumnIfMissing('users', 'role',                         ['type' => 'ENUM', 'constraint' => ['buyer', 'seller', 'admin', 'super_admin', 'delivery'], 'null' => true, 'default' => 'buyer']);
        $this->addColumnIfMissing('users', 'is_blocked',                   ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'blocked_from_user_management', ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'bgv_cleared',                  ['type' => 'TINYINT', 'constraint' => 1, 'null' => false, 'default' => 0]);
        $this->addColumnIfMissing('users', 'products_uploaded_count',      ['type' => 'INT', 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'subscription_tier',            ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true, 'default' => 'free']);
        $this->addColumnIfMissing('users', 'seller_rating_avg',            ['type' => 'DECIMAL', 'constraint' => '3,2', 'null' => true, 'default' => 0.00]);
        $this->addColumnIfMissing('users', 'seller_rating_count',          ['type' => 'INT', 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'buyer_rating_avg',             ['type' => 'DECIMAL', 'constraint' => '3,2', 'null' => true, 'default' => 0.00]);
        $this->addColumnIfMissing('users', 'buyer_rating_count',           ['type' => 'INT', 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'daily_posts_count',            ['type' => 'INT', 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'weekly_posts_count',           ['type' => 'INT', 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'monthly_posts_count',          ['type' => 'INT', 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'last_post_date',               ['type' => 'DATE', 'null' => true]);
        $this->addColumnIfMissing('users', 'posting_limit_charges_paid',   ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true, 'default' => 0.00]);
        $this->addColumnIfMissing('users', 'blocked_seller',               ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'blocked_buyer',                ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'blocked_from_approvals',       ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'reliability_score',            ['type' => 'INT', 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('users', 'renter_reliability_score',     ['type' => 'INT', 'null' => true, 'default' => 0]);

        // ─── products ─────────────────────────────────────────────────
        $this->addColumnIfMissing('products', 'orignal_brand_id',     ['type' => 'INT', 'null' => true]);
        $this->addColumnIfMissing('products', 'gender_ids',           ['type' => 'TEXT', 'null' => true]);
        $this->addColumnIfMissing('products', 'category_ids',         ['type' => 'TEXT', 'null' => true]);
        $this->addColumnIfMissing('products', 'sub_category_ids',     ['type' => 'TEXT', 'null' => true]);
        $this->addColumnIfMissing('products', 'suggested_rental_cost',['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true]);
        $this->addColumnIfMissing('products', 'allow_alter_fitting',  ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('products', 'dispatch_state',       ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true]);
        $this->addColumnIfMissing('products', 'dispatch_city',        ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true]);
        $this->addColumnIfMissing('products', 'specifications',       ['type' => 'LONGTEXT', 'null' => true]);
        $this->addColumnIfMissing('products', 'rental_start_date',    ['type' => 'DATE', 'null' => true]);
        $this->addColumnIfMissing('products', 'rental_end_date',      ['type' => 'DATE', 'null' => true]);
        $this->addColumnIfMissing('products', 'is_featured',          ['type' => 'TINYINT', 'constraint' => 1, 'null' => false, 'default' => 0]);
        $this->addColumnIfMissing('products', 'price_category',       ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true, 'default' => 'standard']);
        $this->addColumnIfMissing('products', 'required_badges',      ['type' => 'INT', 'null' => true, 'default' => 0]);

        // ─── delivery_persons ─────────────────────────────────────────
        $this->addColumnIfMissing('delivery_persons', 'pan_card',                  ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true]);
        $this->addColumnIfMissing('delivery_persons', 'aadhar_card',               ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true]);
        $this->addColumnIfMissing('delivery_persons', 'kyc_verified',              ['type' => 'TINYINT', 'constraint' => 1, 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('delivery_persons', 'badges',                    ['type' => 'INT', 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('delivery_persons', 'rental_reliability_score',  ['type' => 'INT', 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('delivery_persons', 'sale_reliability_score',    ['type' => 'INT', 'null' => true, 'default' => 0]);
        $this->addColumnIfMissing('delivery_persons', 'status',                    ['type' => 'ENUM', 'constraint' => ['active', 'inactive'], 'null' => true, 'default' => 'active']);

        // ─── listing_types ────────────────────────────────────────────
        $this->addColumnIfMissing('listing_types', 'usage_label', ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true, 'default' => 'Times Used']);

        // ─── transactions ─────────────────────────────────────────────
        $this->addColumnIfMissing('transactions', 'type',           ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true]);
        $this->addColumnIfMissing('transactions', 'payment_status', ['type' => 'ENUM', 'constraint' => ['pending', 'completed', 'failed'], 'null' => true, 'default' => 'pending']);

        // ─── user_subscriptions ───────────────────────────────────────
        $this->addColumnIfMissing('user_subscriptions', 'amount_paid',                 ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true, 'default' => 0.00]);
        $this->addColumnIfMissing('user_subscriptions', 'referral_discount_applied',   ['type' => 'DECIMAL', 'constraint' => '10,2', 'null' => true, 'default' => 0.00]);
        $this->addColumnIfMissing('user_subscriptions', 'merchant_transaction_id',     ['type' => 'VARCHAR', 'constraint' => 255, 'null' => true]);
    }

    public function down(): void
    {
        // Intentionally left empty — removing these columns could destroy live data.
        // Run a manual rollback only if you know what you are doing.
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private function addColumnIfMissing(string $table, string $column, array $definition): void
    {
        if (!$this->db->tableExists($table)) {
            return;
        }
        $existing = $this->db->getFieldNames($table);
        if (in_array($column, $existing, true)) {
            return;
        }
        $this->db->query("ALTER TABLE `{$table}` ADD COLUMN `{$column}` " . $this->buildColumnSql($definition));
    }

    private function buildColumnSql(array $def): string
    {
        $type = strtoupper($def['type']);

        if ($type === 'ENUM') {
            $values = implode("','", $def['constraint']);
            $sql    = "ENUM('{$values}')";
        } elseif (isset($def['constraint'])) {
            $sql = "{$type}({$def['constraint']})";
        } else {
            $sql = $type;
        }

        $null    = ($def['null'] ?? true) ? ' NULL' : ' NOT NULL';
        $default = '';
        if (array_key_exists('default', $def)) {
            $d = $def['default'];
            if (is_null($d)) {
                $default = ' DEFAULT NULL';
            } elseif (is_numeric($d)) {
                $default = " DEFAULT {$d}";
            } else {
                $default = " DEFAULT '{$d}'";
            }
        }

        return $sql . $null . $default;
    }
}
