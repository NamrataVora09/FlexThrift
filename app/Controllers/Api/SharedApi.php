<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class SharedApi extends ResourceController
{
    protected $format = 'json';

    public function listingTypes()
    {
        $db = \Config\Database::connect();
        $types = $db->table('listing_types')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $types]);
    }

    public function categories(int $listingTypeId)
    {
        $db = \Config\Database::connect();
        $cats = $db->table('categories')
            ->select('id, category_name as name, field_config')
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $cats]);
    }

    public function subcategories(int $categoryId)
    {
        $db = \Config\Database::connect();
        $subs = $db->table('sub_categories')
            ->where('category_id', $categoryId)
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $subs]);
    }

    public function pricingRules()
    {
        $db = \Config\Database::connect();
        $rules = $db->table('pricing_rules')->where('is_active', 1)->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $rules]);
    }

    public function rentalPricingRules()
    {
        $db = \Config\Database::connect();
        $rules = $db->table('rental_pricing_rules')->where('is_active', 1)->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $rules]);
    }

    public function approveProduct(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'], ['admin', 'super_admin', 'superadmin'])) {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $product = $db->table('products p')
            ->select('p.*, u.role as seller_role')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->where('p.id', $id)
            ->get()->getRowArray();
        if (!$product) {
            return $this->respond(['success' => false, 'message' => 'Product not found'], 404);
        }

        // Check approval permissions based on seller role
        $sellerRole = $product['seller_role'];
        if (($sellerRole === 'admin' || $sellerRole === 'super_admin' || $sellerRole === 'superadmin') && !in_array($jwtUser['role'], ['super_admin', 'superadmin'])) {
            return $this->respond(['success' => false, 'message' => 'Only super admin can approve system-user uploaded products'], 403);
        }

        // For normal seller products, check if admin is blocked
        if ($sellerRole !== 'admin' && $jwtUser['role'] === 'admin' && isset($jwtUser['blocked_from_approvals']) && $jwtUser['blocked_from_approvals']) {
            return $this->respond(['success' => false, 'message' => 'You are blocked from approving products'], 403);
        }

        $remarks = $this->request->getJsonVar('remarks') ?? '';

        $db->table('products')->where('id', $id)->update([
            'status' => 'approved',
            'admin_remarks' => $remarks,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Product approved']);
    }

    public function rejectProduct(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'], ['admin', 'super_admin', 'superadmin'])) {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $product = $db->table('products p')
            ->select('p.*, u.role as seller_role')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->where('p.id', $id)
            ->get()->getRowArray();
        if (!$product) {
            return $this->respond(['success' => false, 'message' => 'Product not found'], 404);
        }

        // Check rejection permissions based on seller role
        $sellerRole = $product['seller_role'];
        if (($sellerRole === 'admin' || $sellerRole === 'super_admin' || $sellerRole === 'superadmin') && !in_array($jwtUser['role'], ['super_admin', 'superadmin'])) {
            return $this->respond(['success' => false, 'message' => 'Only super admin can reject system-user uploaded products'], 403);
        }

        // For normal seller products, check if admin is blocked
        if ($sellerRole !== 'admin' && $jwtUser['role'] === 'admin' && isset($jwtUser['blocked_from_approvals']) && $jwtUser['blocked_from_approvals']) {
            return $this->respond(['success' => false, 'message' => 'You are blocked from approving products'], 403);
        }

        $remarks = $this->request->getJsonVar('remarks') ?? '';

        $db->table('products')->where('id', $id)->update([
            'status' => 'rejected',
            'admin_remarks' => $remarks,
        ]);

        return $this->respond(['success' => true, 'message' => 'Product rejected']);
    }

    public function toggleUserStatus(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'], ['admin', 'super_admin'])) {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $user = $db->table('users')->where('id', $id)->get()->getRowArray();
        if (!$user)
            return $this->respond(['success' => false, 'message' => 'User not found'], 404);

        $newStatus = $user['is_blocked'] ? 0 : 1;
        $db->table('users')->where('id', $id)->update(['is_blocked' => $newStatus]);

        return $this->respond([
            'success' => true,
            'message' => $newStatus ? 'User blocked' : 'User unblocked',
            'data' => ['is_blocked' => $newStatus],
        ]);
    }

    /**
     * GET /api/v1/shared/subscriptions/{userType}
     * Get available plans + user's active subscription
     */
    public function subscriptions(string $userType)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $plans = $db->table('subscription_plans')
            ->where('user_type', $userType)
            ->where('is_active', 1)
            ->orderBy('price', 'ASC')
            ->get()->getResultArray();

        $active = $db->table('user_subscriptions us')
            ->select('us.*, sp.name as plan_name, sp.plan_type, sp.limit_value, sp.price')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->where('us.user_id', $jwtUser['user_id'])
            ->where('us.is_active', 1)
            ->where('us.expires_at >=', date('Y-m-d H:i:s'))
            ->orderBy('us.created_at', 'DESC')
            ->get()->getRowArray();

        $history = $db->table('user_subscriptions us')
            ->select('us.*, sp.name as plan_name, sp.plan_type, sp.limit_value, sp.price')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->where('us.user_id', $jwtUser['user_id'])
            ->orderBy('us.created_at', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => ['plans' => $plans, 'active' => $active, 'history' => $history],
        ]);
    }

    /**
     * GET /api/v1/shared/analytics
     * Seller analytics data
     */
    public function analytics()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $userId = $jwtUser['user_id'];

        // Product stats by status
        $statusStats = $db->query("SELECT status, COUNT(*) as count FROM products WHERE seller_id = ? GROUP BY status", [$userId])->getResultArray();

        // Offers over last 30 days
        $offerTrend = $db->query("
            SELECT DATE(created_at) as date, COUNT(*) as count, SUM(CASE WHEN status='accepted' THEN 1 ELSE 0 END) as accepted
            FROM offers WHERE seller_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at) ORDER BY date ASC
        ", [$userId])->getResultArray();

        // Revenue by month
        $revenue = $db->query("
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month,
                   SUM(CASE WHEN status='accepted' THEN offer_price ELSE 0 END) as offer_revenue
            FROM offers WHERE seller_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month ASC
        ", [$userId])->getResultArray();

        // Top products by offers
        $topProducts = $db->table('offers o')
            ->select('p.title, p.listing_type, COUNT(o.id) as offer_count, SUM(CASE WHEN o.status="accepted" THEN 1 ELSE 0 END) as accepted_count')
            ->join('products p', 'p.id = o.product_id')
            ->where('o.seller_id', $userId)
            ->groupBy('o.product_id')
            ->orderBy('offer_count', 'DESC')
            ->limit(5)
            ->get()->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => [
                'status_stats' => $statusStats,
                'offer_trend' => $offerTrend,
                'revenue' => $revenue,
                'top_products' => $topProducts,
            ],
        ]);
    }

    /**
     * GET /api/v1/shared/business-settings
     */
    public function businessSettings()
    {
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'], ['super_admin'])) {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $settings = $db->table('system_settings')->get()->getResultArray();

        $config = [];
        foreach ($settings as $s)
            $config[$s['setting_key']] = $s['setting_value'];

        $groups = [
            'Pricing' => ['sale_base_discount', 'usage_no_dep_max', 'sale_depreciation_per_use', 'sale_max_additional_depreciation'],
            'Rental' => ['fallback_rental_cost_per_day', 'min_rental_days', 'rental_base_deposit_deduction', 'rental_suggested_cost_percent', 'rental_max_cost_cap_per_day'],
            'Commission & Delivery' => ['commission_rate', 'delivery_charge', 'min_order_value'],
            'Referral' => ['referral_reward_amount', 'referral_expiry_days'],
            'Seller' => ['seller_rejection_window_hours'],
            'SMTP' => ['smtp_host', 'smtp_user', 'smtp_pass', 'smtp_port', 'smtp_crypto', 'smtp_from_email', 'smtp_from_name'],
            'Payment Gateway' => ['phonepe_env', 'phonepe_merchant_id', 'phonepe_client_id', 'phonepe_client_secret', 'phonepe_client_version'],
        ];

        // Load app messages
        $appMessages = $db->table('app_messages')->orderBy('category', 'ASC')->orderBy('message_key', 'ASC')->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => ['config' => $config, 'groups' => $groups, 'app_messages' => $appMessages]]);
    }

    /**
     * POST /api/v1/shared/update-app-message/{id}
     */
    public function updateAppMessage($id)
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $value = $data['message_value'] ?? '';

        $db->table('app_messages')->where('id', $id)->update(['message_value' => $value, 'updated_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Message updated']);
    }

    /**
     * POST /api/v1/shared/add-app-message
     */
    public function addAppMessage()
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $key = $data['message_key'] ?? '';
        $value = $data['message_value'] ?? '';
        $category = $data['category'] ?? 'general';

        if (!$key || !$value) {
            return $this->respond(['success' => false, 'message' => 'Key and value are required'], 422);
        }

        // Check duplicate
        $existing = $db->table('app_messages')->where('message_key', $key)->get()->getRowArray();
        if ($existing) {
            return $this->respond(['success' => false, 'message' => 'Message key already exists'], 422);
        }

        $db->table('app_messages')->insert([
            'message_key' => $key,
            'message_value' => $value,
            'category' => $category,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Message added', 'id' => $db->insertID()]);
    }

    /**
     * POST /api/v1/shared/delete-app-message/{id}
     */
    public function deleteAppMessage($id)
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $db->table('app_messages')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Message deleted']);
    }

    /**
     * POST /api/v1/shared/business-settings
     */
    public function saveBusinessSettings()
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);

        foreach ($data as $key => $value) {
            $existing = $db->table('system_settings')->where('setting_key', $key)->get()->getRowArray();
            if ($existing) {
                $db->table('system_settings')->where('setting_key', $key)->update(['setting_value' => $value, 'updated_at' => date('Y-m-d H:i:s')]);
            } else {
                $db->table('system_settings')->insert(['setting_key' => $key, 'setting_value' => $value, 'updated_at' => date('Y-m-d H:i:s')]);
            }
        }

        return $this->respond(['success' => true, 'message' => 'Settings saved']);
    }

    /**
     * GET /api/v1/shared/admin-subscription-plans
     */
    public function adminSubscriptionPlans()
    {
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'], ['super_admin', 'admin'])) {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $plans = $db->table('subscription_plans')->orderBy('user_type', 'ASC')->orderBy('price', 'ASC')->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $plans]);
    }

    /**
     * POST /api/v1/shared/admin-subscription-plans
     */
    public function createSubscriptionPlan()
    {
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'], ['super_admin', 'admin'])) {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $db->table('subscription_plans')->insert([
            'name' => $data['name'],
            'user_type' => $data['user_type'],
            'plan_type' => $data['plan_type'] ?? 'duration',
            'limit_value' => (int) ($data['limit_value'] ?? 0),
            'duration_hours' => (float) ($data['duration_hours'] ?? 0),
            'price' => (float) ($data['price']),
            'base_price' => (float) ($data['base_price'] ?? $data['price']),
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Plan created'], 201);
    }

    /**
     * POST /api/v1/shared/admin-subscription-plans/{id}/toggle
     */
    public function togglePlanStatus(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'], ['super_admin', 'admin'])) {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $plan = $db->table('subscription_plans')->where('id', $id)->get()->getRowArray();
        if (!$plan)
            return $this->respond(['success' => false, 'message' => 'Plan not found'], 404);

        $newStatus = $plan['is_active'] ? 0 : 1;
        $db->table('subscription_plans')->where('id', $id)->update(['is_active' => $newStatus]);

        return $this->respond(['success' => true, 'message' => $newStatus ? 'Plan activated' : 'Plan deactivated']);
    }

    public function updateSubscriptionPlan(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'], ['super_admin', 'admin']))
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);

        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?: $this->request->getPost();

        $db->table('subscription_plans')->where('id', $id)->update([
            'name' => $data['name'],
            'user_type' => $data['user_type'],
            'plan_type' => $data['plan_type'] ?? 'duration',
            'limit_value' => (int) ($data['limit_value'] ?? 0),
            'duration_hours' => (float) ($data['duration_hours'] ?? 0),
            'price' => (float) ($data['price']),
            'base_price' => (float) ($data['base_price'] ?? $data['price']),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Plan updated']);
    }

    public function deleteSubscriptionPlan(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'], ['super_admin', 'admin']))
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);

        $db = \Config\Database::connect();
        $db->table('subscription_plans')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Plan deleted']);
    }

    public function moderationHistory()
    {
        $db = \Config\Database::connect();
        $products = $db->table('products p')
            ->select('p.id, p.title, p.listing_type, p.original_price, p.status, p.admin_remarks, p.updated_at, u.name as seller_name, (SELECT image_path FROM product_images WHERE product_id = p.id ORDER BY display_order ASC LIMIT 1) as primary_image')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->whereIn('p.status', ['approved', 'rejected'])
            ->orderBy('p.updated_at', 'DESC')
            ->limit(100)
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $products]);
    }

    public function brands()
    {
        $db = \Config\Database::connect();
        $brands = $db->table('brands')->orderBy('name', 'ASC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $brands]);
    }

    public function createBrand()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        $db->table('brands')->insert(['name' => $data['name'], 'seller_id' => $this->request->jwt_user['user_id'], 'created_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Brand created'], 201);
    }

    public function originalBrands()
    {
        $db = \Config\Database::connect();
        $brands = $db->table('orignal_brands')->orderBy('brand_name', 'ASC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $brands]);
    }

    public function userSubscriptions()
    {
        $db = \Config\Database::connect();
        $subs = $db->table('user_subscriptions us')
            ->select('us.*, sp.name as plan_name, sp.plan_type, sp.price, u.name as user_name, u.email')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->join('users u', 'u.id = us.user_id')
            ->orderBy('us.created_at', 'DESC')
            ->limit(100)
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $subs]);
    }

    public function coupons()
    {
        $db = \Config\Database::connect();
        $coupons = $db->table('coupons')->orderBy('created_at', 'DESC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $coupons]);
    }

    public function createCoupon()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        $db->table('coupons')->insert([
            'code' => strtoupper($data['code']),
            'discount_type' => $data['discount_type'] ?? 'percentage',
            'discount_value' => $data['discount_value'],
            'min_order_amount' => $data['min_order_amount'] ?? 0,
            'max_discount' => $data['max_discount'] ?? null,
            'usage_limit' => $data['usage_limit'] ?? 0,
            'valid_from' => $data['valid_from'] ?? null,
            'valid_until' => $data['valid_until'] ?? null,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['success' => true, 'message' => 'Coupon created'], 201);
    }

    public function updateCoupon(int $id)
    {
        $data = $this->request->getJSON(true) ?: $this->request->getPost();
        $db = \Config\Database::connect();
        $db->table('coupons')->where('id', $id)->update([
            'code' => strtoupper($data['code']),
            'discount_type' => $data['discount_type'] ?? 'percentage',
            'discount_value' => $data['discount_value'],
            'min_order_amount' => $data['min_order_amount'] ?? 0,
            'max_discount' => $data['max_discount'] ?: null,
            'usage_limit' => $data['usage_limit'] ?: 0,
            'valid_until' => $data['valid_until'] ?: null,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['success' => true, 'message' => 'Coupon updated']);
    }

    public function toggleCoupon(int $id)
    {
        $db = \Config\Database::connect();
        $coupon = $db->table('coupons')->where('id', $id)->get()->getRowArray();
        if (!$coupon)
            return $this->respond(['success' => false, 'message' => 'Not found'], 404);
        $db->table('coupons')->where('id', $id)->update(['is_active' => $coupon['is_active'] ? 0 : 1]);
        return $this->respond(['success' => true, 'message' => 'Coupon toggled']);
    }

    public function deleteCoupon(int $id)
    {
        $db = \Config\Database::connect();
        $db->table('coupons')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Coupon deleted']);
    }

    public function financialReports()
    {
        $db = \Config\Database::connect();
        $summary = [
            'total_transactions' => $db->table('transactions')->countAllResults(),
            'total_revenue' => $db->table('transactions')->selectSum('amount')->get()->getRowArray()['amount'] ?? 0,
            'total_orders' => $db->table('orders')->countAllResults(),
            'order_revenue' => $db->table('orders')->selectSum('final_price')->get()->getRowArray()['final_price'] ?? 0,
        ];
        $monthly = $db->query("
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count, SUM(amount) as total
            FROM transactions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month DESC
        ")->getResultArray();
        $recent = $db->table('transactions t')
            ->select('t.*, u.name as user_name')
            ->join('users u', 'u.id = t.user_id', 'left')
            ->orderBy('t.created_at', 'DESC')
            ->limit(50)
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => ['summary' => $summary, 'monthly' => $monthly, 'recent' => $recent]]);
    }

    public function advertisements()
    {
        $db = \Config\Database::connect();
        $ads = $db->table('advertisements')->orderBy('created_at', 'DESC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $ads]);
    }

    public function zones()
    {
        $db = \Config\Database::connect();
        $zones = $db->table('allowed_zones')->orderBy('zone_name', 'ASC')->get()->getResultArray();
        $pinCodes = $db->table('allowed_pin_codes')->orderBy('pin_code', 'ASC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => ['zones' => $zones, 'pin_codes' => $pinCodes]]);
    }

    public function cmsPages()
    {
        $db = \Config\Database::connect();
        $pages = $db->table('cms_pages')->orderBy('created_at', 'DESC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $pages]);
    }

    public function saveCmsPage()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        if (!empty($data['id'])) {
            $db->table('cms_pages')->where('id', $data['id'])->update(['title' => $data['title'], 'content' => $data['content'], 'updated_at' => date('Y-m-d H:i:s')]);
        } else {
            $db->table('cms_pages')->insert(['slug' => $data['slug'], 'title' => $data['title'], 'content' => $data['content'], 'status' => 'active', 'created_at' => date('Y-m-d H:i:s')]);
        }
        return $this->respond(['success' => true, 'message' => 'Page saved']);
    }

    public function taxonomy()
    {
        $db = \Config\Database::connect();
        $listingTypes = $db->table('listing_types')->get()->getResultArray();
        $categories = $db->table('categories')->select('id, category_name as name, field_config, product_type_id, product_type_ids, applies_to')->get()->getResultArray();
        $subCategories = $db->table('sub_categories')->select('id, name, field_config, category_id, category_ids, applies_to')->get()->getResultArray();
        $productTypes = $db->table('product_types')->get()->getResultArray();
        $genders = $db->table('genders')->get()->getResultArray();
        $colors = $db->table('colors')->get()->getResultArray();
        return $this->respond([
            'success' => true,
            'data' => [
                'listing_types' => $listingTypes,
                'categories' => $categories,
                'sub_categories' => $subCategories,
                'product_types' => $productTypes,
                'genders' => $genders,
                'colors' => $colors,
            ]
        ]);
    }

    public function contactedSellers()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $contacts = $db->table('contact_views cv')
            ->select('cv.*, u.name as seller_name, u.email as seller_email, u.mobile as seller_mobile, p.title as product_title')
            ->join('users u', 'u.id = cv.seller_id', 'left')
            ->join('products p', 'p.id = cv.product_id', 'left')
            ->where('cv.user_id = ' . (int) $jwtUser['user_id'])
            ->orderBy('cv.viewed_at', 'DESC')
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $contacts]);
    }

    /**
     * POST /api/v1/shared/purchase-subscription
     */
    public function purchaseSubscription()
    {
        $jwtUser = $this->request->jwt_user;
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $plan = $db->table('subscription_plans')->where('id', $data['plan_id'])->where('is_active', 1)->get()->getRowArray();
        if (!$plan)
            return $this->respond(['success' => false, 'message' => 'Plan not found'], 404);

        $expiresAt = date('Y-m-d H:i:s', strtotime('+' . ($plan['duration_hours'] ?: 720) . ' hours'));

        $subId = $db->table('user_subscriptions')->insert([
            'user_id' => $jwtUser['user_id'],
            'plan_id' => $plan['id'],
            'is_active' => 1,
            'usage_count' => 0,
            'starts_at' => date('Y-m-d H:i:s'),
            'expires_at' => $expiresAt,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ], true);

        // Record transaction
        $db->table('transactions')->insert([
            'user_id' => $jwtUser['user_id'],
            'type' => 'subscription',
            'amount' => $plan['price'],
            'description' => 'Subscription: ' . $plan['name'],
            'payment_method' => 'online',
            'payment_status' => 'completed',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Subscription activated', 'data' => ['subscription_id' => $subId]]);
    }

    /**
     * POST /api/v1/shared/update-profile
     */
    public function updateProfile()
    {
        $jwtUser = $this->request->jwt_user;
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $updateData = [];
        $allowed = ['name', 'mobile', 'address', 'pin_code', 'city', 'state'];
        foreach ($allowed as $field) {
            if (isset($data[$field]))
                $updateData[$field] = $data[$field];
        }
        if (empty($updateData))
            return $this->respond(['success' => false, 'message' => 'No data to update'], 400);

        $updateData['updated_at'] = date('Y-m-d H:i:s');
        $db->table('users')->where('id', $jwtUser['user_id'])->update($updateData);

        $user = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();
        return $this->respond(['success' => true, 'message' => 'Profile updated', 'data' => $user]);
    }

    /**
     * POST /api/v1/shared/upload-kyc
     */
    public function uploadKyc()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $uploadPath = FCPATH . 'uploads/kyc/';
        if (!is_dir($uploadPath))
            mkdir($uploadPath, 0777, true);

        $updateData = ['updated_at' => date('Y-m-d H:i:s')];

        $panFile = $this->request->getFile('pan_image');
        if ($panFile && $panFile->isValid()) {
            $panName = $panFile->getRandomName();
            $panFile->move($uploadPath, $panName);
            $updateData['pan_image'] = 'uploads/kyc/' . $panName;
        }

        $aadharFile = $this->request->getFile('aadhar_image');
        if ($aadharFile && $aadharFile->isValid()) {
            $aadharName = $aadharFile->getRandomName();
            $aadharFile->move($uploadPath, $aadharName);
            $updateData['aadhar_image'] = 'uploads/kyc/' . $aadharName;
        }

        $panNumber = $this->request->getPost('pan_number');
        $aadharNumber = $this->request->getPost('aadhar_number');
        if ($panNumber)
            $updateData['pan_number'] = $panNumber;
        if ($aadharNumber)
            $updateData['aadhar_number'] = $aadharNumber;

        // For delivery person, update delivery_persons table
        $deliveryPerson = $db->table('delivery_persons')->where('user_id', $jwtUser['user_id'])->get()->getRowArray();
        if ($deliveryPerson) {
            $dpUpdate = ['updated_at' => date('Y-m-d H:i:s')];
            if (isset($updateData['pan_image']))
                $dpUpdate['pan_image'] = $updateData['pan_image'];
            if (isset($updateData['aadhar_image']))
                $dpUpdate['aadhar_image'] = $updateData['aadhar_image'];
            if ($panNumber)
                $dpUpdate['pan_number'] = $panNumber;
            if ($aadharNumber)
                $dpUpdate['aadhar_number'] = $aadharNumber;
            $vehicleType = $this->request->getPost('vehicle_type');
            $vehicleNumber = $this->request->getPost('vehicle_number');
            $licenseNumber = $this->request->getPost('license_number');
            if ($vehicleType)
                $dpUpdate['vehicle_type'] = $vehicleType;
            if ($vehicleNumber)
                $dpUpdate['vehicle_number'] = $vehicleNumber;
            if ($licenseNumber)
                $dpUpdate['license_number'] = $licenseNumber;
            $db->table('delivery_persons')->where('user_id', $jwtUser['user_id'])->update($dpUpdate);
        }

        $db->table('users')->where('id', $jwtUser['user_id'])->update($updateData);

        return $this->respond(['success' => true, 'message' => 'KYC documents uploaded']);
    }

    public function landingContent()
    {
        $db = \Config\Database::connect();
        $rows = $db->table('system_settings')
            ->whereIn('setting_key', [
                'hero_slides',
                'display_categories',
                'cta_title',
                'cta_subtitle',
                'footer_description',
                'section_title_categories',
                'section_title_products',
                'footer_quick_links',
                'footer_policy_links',
                'footer_social_links',
                'how_it_works_steps',
                'stats_banner',
                'trust_features',
                'testimonials',
                'enable_zone_restriction'
            ])
            ->get()->getResultArray();
        $content = [];
        foreach ($rows as $r)
            $content[$r['setting_key']] = $r['setting_value'];
        return $this->respond(['success' => true, 'data' => $content]);
    }

    public function featuredProducts()
    {
        $db = \Config\Database::connect();
        $products = $db->table('products p')
            ->select('p.*, u.name as seller_name, ob.brand_name as brand_name, (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id LIMIT 1) as image')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->join('orignal_brands ob', 'ob.id = p.brand_id AND ob.is_active = 1', 'left')
            ->where('p.status', 'approved')
            ->where('p.is_featured', 1)
            ->orderBy('p.updated_at', 'DESC')
            ->limit(12)
            ->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $products]);
    }
}
