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

        $plansBuilder = $db->table('subscription_plans')
            ->where('is_active', 1);

        if (!in_array($jwtUser['role'], ['admin', 'super_admin', 'superadmin'])) {
            $plansBuilder->where('user_type', $userType);
        }

        $plans = $plansBuilder->orderBy('price', 'ASC')
            ->get()->getResultArray();

        // Auto-deactivate expired subscriptions for this user (globally)
        $expiredIds = $db->table('user_subscriptions us')
            ->select('us.id')
            ->where('us.user_id', $jwtUser['user_id'])
            ->where('us.is_active', 1)
            ->where('us.expires_at <', date('Y-m-d H:i:s'))
            ->get()->getResultArray();
        if (!empty($expiredIds)) {
            $db->table('user_subscriptions')
                ->whereIn('id', array_column($expiredIds, 'id'))
                ->update(['is_active' => 0]);
        }

        // We'll fetch active plans for both types to support dual view for admins
        $activeQuery = $db->table('user_subscriptions us')
            ->select('us.*, sp.name as plan_name, sp.plan_type, sp.limit_value, sp.price, sp.duration_hours, sp.user_type as plan_user_type')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->where('us.user_id', $jwtUser['user_id'])
            ->where('us.is_active', 1)
            ->where('us.payment_status', 'paid')
            ->where('us.expires_at >=', date('Y-m-d H:i:s'));

        // For regular users: only show plans that have already started
        if (!in_array($jwtUser['role'], ['admin', 'super_admin', 'superadmin'])) {
            $activeQuery->where('us.starts_at <=', date('Y-m-d H:i:s'));
        }

        $activeSeller = (clone $activeQuery)->where('sp.user_type', 'seller')->orderBy('us.expires_at', 'ASC')->get()->getRowArray();
        $activeBuyer = (clone $activeQuery)->where('sp.user_type', 'buyer')->orderBy('us.expires_at', 'ASC')->get()->getRowArray();

        // Primary active plan based on current portal context
        $active = ($userType === 'seller') ? $activeSeller : $activeBuyer;

        $historyQuery = $db->table('user_subscriptions us')
            ->select('us.*, sp.name as plan_name, sp.plan_type, sp.limit_value, sp.price, sp.duration_hours, sp.user_type as plan_user_type')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->where('us.user_id', $jwtUser['user_id'])
            ->where('us.payment_status', 'paid');

        if (!in_array($jwtUser['role'], ['admin', 'super_admin', 'superadmin'])) {
            $historyQuery->where('sp.user_type', $userType);
        }

        $history = $historyQuery->orderBy('us.created_at', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        // Unlock card settings for this user type
        $keys = [
            "{$userType}_unlock_label",
            "{$userType}_unlock_title",
            "{$userType}_unlock_btn",
            "{$userType}_unlock_items",
        ];
        $rows = $db->table('system_settings')->whereIn('setting_key', $keys)->get()->getResultArray();
        $unlockCard = [];
        foreach ($rows as $r) $unlockCard[$r['setting_key']] = $r['setting_value'];

        return $this->respond([
            'success' => true,
            'data' => [
                'plans' => $plans,
                'active' => $active,
                'active_seller' => $activeSeller,
                'active_buyer' => $activeBuyer,
                'history' => $history,
                'unlock_card' => $unlockCard
            ],
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
        $range = $this->request->getGet('range') ?? 'all_time';
        $isAdmin = in_array($jwtUser['role'], ['admin', 'super_admin', 'superadmin']);

        // Helper for date filter
        $dateFilter = "";
        $trendWhere = "";

        switch ($range) {
            case 'current_week': 
                $start = date('Y-m-d 00:00:00', strtotime('monday this week'));
                $dateFilter = "AND o.created_at >= '$start'"; 
                $trendWhere = "AND o.created_at >= '$start'";
                break;
            case 'last_week': 
                $start = date('Y-m-d 00:00:00', strtotime('monday last week'));
                $end = date('Y-m-d 23:59:59', strtotime('sunday last week'));
                $dateFilter = "AND o.created_at >= '$start' AND o.created_at <= '$end'"; 
                $trendWhere = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                break;
            case 'last_2_weeks': 
                $start = date('Y-m-d 00:00:00', strtotime('monday -2 weeks'));
                $end = date('Y-m-d 23:59:59', strtotime('sunday last week'));
                $dateFilter = "AND o.created_at >= '$start' AND o.created_at <= '$end'"; 
                $trendWhere = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                break;
            case 'current_month': 
                $start = date('Y-m-01 00:00:00');
                $dateFilter = "AND o.created_at >= '$start'"; 
                $trendWhere = "AND o.created_at >= '$start'";
                break;
            case 'last_month': 
                $start = date('Y-m-01 00:00:00', strtotime('first day of last month'));
                $end = date('Y-m-t 23:59:59', strtotime('last day of last month'));
                $dateFilter = "AND o.created_at >= '$start' AND o.created_at <= '$end'"; 
                $trendWhere = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                break;
            case 'last_2_months': 
                $start = date('Y-m-01 00:00:00', strtotime('first day of -2 months'));
                $end = date('Y-m-t 23:59:59', strtotime('last day of last month'));
                $dateFilter = "AND o.created_at >= '$start' AND o.created_at <= '$end'"; 
                $trendWhere = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                break;
            case 'current_quarter': 
                $month = date('n');
                $quarter = ceil($month / 3);
                $startMonth = ($quarter - 1) * 3 + 1;
                $start = date('Y-' . str_pad($startMonth, 2, '0', STR_PAD_LEFT) . '-01 00:00:00');
                $dateFilter = "AND o.created_at >= '$start'"; 
                $trendWhere = "AND o.created_at >= '$start'";
                break;
            case 'last_quarter': 
                $month = date('n');
                $quarter = ceil($month / 3) - 1;
                $year = date('Y');
                if ($quarter == 0) { $quarter = 4; $year--; }
                $startMonth = ($quarter - 1) * 3 + 1;
                $endMonth = $startMonth + 2;
                $start = "$year-" . str_pad($startMonth, 2, '0', STR_PAD_LEFT) . "-01 00:00:00";
                $end = date('Y-m-t 23:59:59', strtotime("$year-" . str_pad($endMonth, 2, '0', STR_PAD_LEFT) . "-01"));
                $dateFilter = "AND o.created_at >= '$start' AND o.created_at <= '$end'"; 
                $trendWhere = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                break;
            case 'last_2_quarters': 
                $month = date('n');
                $currQ = ceil($month / 3);
                
                // End: last day of last quarter
                $lastQ = $currQ - 1;
                $lastQYear = date('Y');
                if ($lastQ == 0) { $lastQ = 4; $lastQYear--; }
                $endMonth = $lastQ * 3;
                $end = date('Y-m-t 23:59:59', strtotime("$lastQYear-" . str_pad($endMonth, 2, '0', STR_PAD_LEFT) . "-01"));
                
                // Start: first day of 2nd quarter back
                $startQ = $currQ - 2;
                $startQYear = date('Y');
                if ($startQ <= 0) { $startQ += 4; $startQYear--; }
                $startMonth = ($startQ - 1) * 3 + 1;
                $start = "$startQYear-" . str_pad($startMonth, 2, '0', STR_PAD_LEFT) . "-01 00:00:00";
                
                $dateFilter = "AND o.created_at >= '$start' AND o.created_at <= '$end'"; 
                $trendWhere = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                break;
            case 'current_year': 
                $start = date('Y-01-01 00:00:00');
                $dateFilter = "AND o.created_at >= '$start'"; 
                $trendWhere = "AND o.created_at >= '$start'";
                break;
            case 'last_year': 
                $year = (int)date('Y') - 1;
                $start = "$year-01-01 00:00:00";
                $end = "$year-12-31 23:59:59";
                $dateFilter = "AND o.created_at >= '$start' AND o.created_at <= '$end'"; 
                $trendWhere = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                break;
            case 'last_2_years': 
                $currYear = (int)date('Y');
                $start = ($currYear - 2) . "-01-01 00:00:00";
                $end = ($currYear - 1) . "-12-31 23:59:59";
                $dateFilter = "AND o.created_at >= '$start' AND o.created_at <= '$end'"; 
                $trendWhere = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                break;
            case 'all_time': default: 
                $dateFilter = ""; 
                $trendWhere = "AND o.created_at >= DATE_SUB(NOW(), INTERVAL 10 YEAR)";
                break;
        }

        // Force all roles to see only their personal 'Received' (Seller) perspective
        $whereSeller = "seller_id = " . (int)$userId;
        $whereOffers = "o.seller_id = " . (int)$userId;
        $whereProducts = "p.seller_id = " . (int)$userId;

        // Product stats by status
        $statusStats = $db->query("SELECT p.status, COUNT(*) as count FROM products p WHERE $whereProducts GROUP BY p.status")->getResultArray();

        // Offers trend (respecting range)
        $offerTrend = $db->query("
            SELECT DATE(o.created_at) as date, COUNT(*) as count, SUM(CASE WHEN o.status='accepted' THEN 1 ELSE 0 END) as accepted
            FROM offers o WHERE $whereOffers $trendWhere
            GROUP BY DATE(o.created_at) ORDER BY date ASC
        ")->getResultArray();

        // Revenue and Sales count (Bar Chart)
        $dailyRanges = ['current_week', 'last_week', 'last_2_weeks', 'current_month', 'last_month', 'last_2_months'];
        $groupBy = (in_array($range, $dailyRanges)) ? 'DATE(o.created_at)' : "DATE_FORMAT(o.created_at, '%Y-%m')";
        $labelAlias = (in_array($range, $dailyRanges)) ? 'date' : 'month';
        
        $monthlyStats = $db->query("
            SELECT $groupBy as $labelAlias,
                   SUM(CASE WHEN o.status='accepted' THEN o.offer_price ELSE 0 END) as revenue,
                   SUM(CASE WHEN o.status='accepted' THEN 1 ELSE 0 END) as sales_count,
                   COUNT(o.id) as offer_count
            FROM offers o WHERE $whereOffers $dateFilter
            GROUP BY $groupBy ORDER BY $labelAlias ASC
        ")->getResultArray();

        // Revenue distribution by listing type category (Pie Chart)
        $revenueByListingType = $db->query("
            SELECT p.listing_type_category as listing_type, SUM(o.offer_price) as revenue
            FROM offers o
            JOIN products p ON p.id = o.product_id
            WHERE $whereOffers AND o.status = 'accepted' $dateFilter
            GROUP BY p.listing_type_category
        ")->getResultArray();

        // Total stats for cards
        $totalProducts = $db->table('products p')
            ->where('p.seller_id', $userId)
            ->countAllResults();
        
        // Filter total offers by date range and scope to received only
        $totalOffersQuery = $db->table('offers o');
        $totalOffersQuery->where('o.seller_id', $userId);
        if ($dateFilter) {
            $totalOffersQuery->where(ltrim($dateFilter, 'AND '));
        }
        $totalOffers = $totalOffersQuery->countAllResults();
        
        $user = $db->table('users')->select('reliability_score')->where('id', $userId)->get()->getRowArray();
        $scorePoints = (int)($user['reliability_score'] ?? 0);

        // Top 10 products by offers (with date filter)
        $topProductsQuery = $db->table('products p')
            ->select('p.title, p.listing_type_category as listing_type, COUNT(o.id) as offer_count, SUM(CASE WHEN o.status="accepted" THEN 1 ELSE 0 END) as accepted_count, SUM(CASE WHEN o.status="accepted" THEN o.offer_price ELSE 0 END) as total_revenue')
            ->join('offers o', "o.product_id = p.id $dateFilter", 'left');

        $topProductsQuery->where('p.seller_id', $userId);

        $topProductsByOffers = (clone $topProductsQuery)
            ->groupBy('p.id')
            ->orderBy('offer_count', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        $topProductsByRevenue = (clone $topProductsQuery)
            ->groupBy('p.id')
            ->orderBy('total_revenue', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => [
                'status_stats' => $statusStats,
                'offer_trend' => $offerTrend,
                'monthly_stats' => $monthlyStats,
                'revenue_by_listing_type' => $revenueByListingType,
                'top_products_by_offers' => $topProductsByOffers,
                'top_products_by_revenue' => $topProductsByRevenue,
                'total_products' => $totalProducts,
                'total_offers' => $totalOffers,
                'score_points' => $scorePoints,
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
            'General' => ['support_email', 'support_phone', 'support_hours'],
            'Pricing' => ['sale_base_discount', 'usage_no_dep_max', 'sale_depreciation_per_use', 'sale_max_additional_depreciation'],
            'Rental' => ['fallback_rental_cost_per_day', 'min_rental_days', 'rental_base_deposit_deduction', 'rental_max_cost_cap_per_day'],
            'Commission & Delivery' => ['commission_rate', 'delivery_charge', 'min_order_value'],
            'Referral' => ['referral_enabled', 'referral_referrer_reward', 'referral_receiver_reward', 'referral_max_discount_percent', 'referral_expiry_days', 'referral_min_purchase'],
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
     * GET /api/v1/shared/faqs
     */
    public function faqs()
    {
        $db = \Config\Database::connect();
        $faqs = $db->table('faqs')->orderBy('display_order', 'ASC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $faqs]);
    }

    /**
     * GET /api/v1/shared/support-info
     */
    public function supportInfo()
    {
        $db = \Config\Database::connect();
        $keys = ['support_email', 'support_phone', 'support_hours'];
        $rows = $db->table('system_settings')->whereIn('setting_key', $keys)->get()->getResultArray();
        $data = [];
        foreach ($rows as $r) $data[$r['setting_key']] = $r['setting_value'];
        return $this->respond(['success' => true, 'data' => $data]);
    }

    /**
     * POST /api/v1/shared/faqs
     */
    public function createFaq()
    {
        if ($this->request->jwt_user['role'] !== 'super_admin') return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $db->table('faqs')->insert([
            'question' => $data['question'],
            'answer' => $data['answer'],
            'display_order' => (int)($data['display_order'] ?? 0),
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['success' => true, 'message' => 'FAQ created']);
    }

    /**
     * POST /api/v1/shared/faqs/{id}/update
     */
    public function updateFaq($id)
    {
        if ($this->request->jwt_user['role'] !== 'super_admin') return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $db->table('faqs')->where('id', $id)->update([
            'question' => $data['question'],
            'answer' => $data['answer'],
            'display_order' => (int)($data['display_order'] ?? 0),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['success' => true, 'message' => 'FAQ updated']);
    }

    /**
     * POST /api/v1/shared/faqs/{id}/delete
     */
    public function deleteFaq($id)
    {
        if ($this->request->jwt_user['role'] !== 'super_admin') return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        $db = \Config\Database::connect();
        $db->table('faqs')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'FAQ deleted']);
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

        $isFeatured = ($jwtUser['role'] === 'super_admin') ? (int) ($data['is_featured'] ?? 0) : 0;
        $userType = $data['user_type'];

        if ($isFeatured) {
            $db->table('subscription_plans')->where('user_type', $userType)->update(['is_featured' => 0]);
        }

        $db->table('subscription_plans')->insert([
            'name' => $data['name'],
            'user_type' => $userType,
            'plan_type' => $data['plan_type'] ?? 'duration',
            'limit_value' => (int) ($data['limit_value'] ?? 0),
            'duration_hours' => (float) ($data['duration_hours'] ?? 0),
            'price' => (float) ($data['price']),
            'base_price' => (float) ($data['base_price'] ?? $data['price']),
            'features' => $data['features'] ?? null,
            'is_active' => 1,
            'is_featured' => $isFeatured,
            'is_most_selected' => (int) ($data['is_most_selected'] ?? 0),
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

    public function toggleMostSelected(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $plan = $db->table('subscription_plans')->where('id', $id)->get()->getRowArray();
        if (!$plan) return $this->respond(['success' => false, 'message' => 'Plan not found'], 404);

        $newVal = (int) ($plan['is_most_selected'] ?? 0) ? 0 : 1;
        $db->table('subscription_plans')->where('id', $id)->update(['is_most_selected' => $newVal, 'updated_at' => date('Y-m-d H:i:s')]);

        return $this->respond(['success' => true, 'message' => $newVal ? 'Marked as Most Selected' : 'Removed Most Selected', 'is_most_selected' => $newVal]);
    }

    public function togglePlanFeatured(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $plan = $db->table('subscription_plans')->where('id', $id)->get()->getRowArray();
        if (!$plan) return $this->respond(['success' => false, 'message' => 'Plan not found'], 404);

        $newFeatured = (int) ($plan['is_featured'] ?? 0) ? 0 : 1;

        if ($newFeatured) {
            $db->table('subscription_plans')->where('user_type', $plan['user_type'])->update(['is_featured' => 0]);
        }

        $db->table('subscription_plans')->where('id', $id)->update(['is_featured' => $newFeatured, 'updated_at' => date('Y-m-d H:i:s')]);

        return $this->respond(['success' => true, 'message' => $newFeatured ? 'Plan marked as premium' : 'Premium removed', 'is_featured' => $newFeatured]);
    }

    public function updateSubscriptionPlan(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'], ['super_admin', 'admin']))
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);

        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?: $this->request->getPost();

        $isFeatured = ($jwtUser['role'] === 'super_admin') ? (int) ($data['is_featured'] ?? 0) : null;
        $userType = $data['user_type'];

        if ($isFeatured) {
            $db->table('subscription_plans')->where('user_type', $userType)->where('id !=', $id)->update(['is_featured' => 0]);
        }

        $updateData = [
            'name' => $data['name'],
            'user_type' => $userType,
            'plan_type' => $data['plan_type'] ?? 'duration',
            'limit_value' => (int) ($data['limit_value'] ?? 0),
            'duration_hours' => (float) ($data['duration_hours'] ?? 0),
            'price' => (float) ($data['price']),
            'base_price' => (float) ($data['base_price'] ?? $data['price']),
            'features' => $data['features'] ?? null,
            'updated_at' => date('Y-m-d H:i:s'),
        ];
        if ($isFeatured !== null) $updateData['is_featured'] = $isFeatured;
        if (isset($data['is_most_selected'])) $updateData['is_most_selected'] = (int) $data['is_most_selected'];

        $db->table('subscription_plans')->where('id', $id)->update($updateData);

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
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        
        $trxTable = $db->table('transactions')->whereIn('payment_status', ['paid', 'completed']);
        $ordTable = $db->table('orders')->where('payment_status', 'paid');

        if (!in_array($jwtUser['role'], ['super_admin', 'superadmin'])) {
            $trxTable->where('user_id', $jwtUser['user_id']);
            $ordTable->where('buyer_id', $jwtUser['user_id']);
        }

        $summary = [
            'total_transactions' => (clone $trxTable)->countAllResults(),
            'total_revenue' => (clone $trxTable)->selectSum('amount')->get()->getRowArray()['amount'] ?? 0,
            'total_orders' => (clone $ordTable)->countAllResults(),
            'order_revenue' => (clone $ordTable)->selectSum('final_price')->get()->getRowArray()['final_price'] ?? 0,
        ];

        $whereClause = "";
        if (!in_array($jwtUser['role'], ['super_admin', 'superadmin'])) {
            $whereClause = " AND user_id = " . $db->escape($jwtUser['user_id']);
        }

        $monthly = $db->query("
            SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as count, SUM(amount) as total
            FROM transactions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH) 
            AND payment_status IN ('paid', 'completed') {$whereClause}
            GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month DESC
        ")->getResultArray();

        $recentBuilder = $db->table('transactions t')
            ->select('t.*, u.name as user_name')
            ->join('users u', 'u.id = t.user_id', 'left')
            ->orderBy('t.created_at', 'DESC')
            ->limit(50);

        if (!in_array($jwtUser['role'], ['super_admin', 'superadmin'])) {
            $recentBuilder->where('t.user_id', $jwtUser['user_id']);
        }

        $recent = $recentBuilder->get()->getResultArray();

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
        $pages = $db->table('cms_pages')->where('status', 'active')->orderBy('created_at', 'DESC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $pages]);
    }

    public function cmsPage($slug)
    {
        $db = \Config\Database::connect();
        $page = $db->table('cms_pages')->where('slug', $slug)->where('status', 'active')->get()->getRowArray();
        if (!$page) return $this->respond(['success' => false, 'message' => 'Page not found.'], 404);
        return $this->respond(['success' => true, 'data' => $page]);
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
        $categories = $db->table('categories')->select('id, category_name as name, field_config, product_type_id, product_type_ids, applies_to, created_at')->get()->getResultArray();
        $subCategories = $db->table('sub_categories')->select('id, name, field_config, category_id, category_ids, applies_to, created_at')->get()->getResultArray();
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
            ->select('cv.*, u.name as seller_name, u.email as seller_email, u.mobile as seller_mobile, u.city as seller_city, u.state as seller_state, u.pin_code as seller_pin_code, p.title as product_title')
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

        // Stacking Logic: Find the latest expiry among active plans for the same user type
        $latestActive = $db->table('user_subscriptions us')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->where('us.user_id', $jwtUser['user_id'])
            ->where('us.is_active', 1)
            ->where('sp.user_type', $plan['user_type'])
            ->where('us.expires_at >', date('Y-m-d H:i:s'))
            ->orderBy('us.expires_at', 'DESC')
            ->get()->getRowArray();

        $durationHours = (float)($plan['duration_hours'] ?: 720);
        $startsAt = $latestActive ? $latestActive['expires_at'] : date('Y-m-d H:i:s');
        $baseTime = $latestActive ? strtotime($latestActive['expires_at']) : time();
        $expiresAt = date('Y-m-d H:i:s', $baseTime + ($durationHours * 3600));

        $subId = $db->table('user_subscriptions')->insert([
            'user_id' => $jwtUser['user_id'],
            'plan_id' => $plan['id'],
            'is_active' => 1,
            'payment_status' => 'paid',
            'usage_count' => 0,
            'starts_at' => $startsAt,
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
        $data = $this->request->getJSON(true) ?: $this->request->getPost();
        $db = \Config\Database::connect();

        $updateData = [];
        $allowed = ['name', 'mobile', 'alternate_mobile', 'gender', 'address', 'pin_code', 'city', 'state'];
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
     * POST /api/v1/shared/upload-profile-image
     */
    public function uploadProfileImage()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $file = $this->request->getFile('profile_image');
        if (!$file || !$file->isValid()) {
            return $this->respond(['success' => false, 'message' => 'No valid image uploaded'], 400);
        }

        $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!in_array($file->getMimeType(), $allowedTypes)) {
            return $this->respond(['success' => false, 'message' => 'Only JPG, PNG, WEBP images are allowed'], 400);
        }

        $uploadPath = FCPATH . 'uploads/profiles/';
        if (!is_dir($uploadPath)) mkdir($uploadPath, 0777, true);

        // Delete old profile image if exists
        $existing = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();
        if (!empty($existing['profile_image'])) {
            $oldPath = FCPATH . $existing['profile_image'];
            if (file_exists($oldPath)) @unlink($oldPath);
        }

        $newName = $file->getRandomName();
        $file->move($uploadPath, $newName);
        $imagePath = 'uploads/profiles/' . $newName;

        $db->table('users')->where('id', $jwtUser['user_id'])->update([
            'profile_image' => $imagePath,
            'updated_at'    => date('Y-m-d H:i:s'),
        ]);

        return $this->respond([
            'success' => true,
            'message' => 'Profile image updated',
            'data'    => ['path' => $imagePath],
        ]);
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
                'enable_zone_restriction',
                'aot_sections',
                'category_cards',
                'buyer_dashboard_subtitle',
                'seller_dashboard_subtitle',
                'global_system_lock'
            ])
            ->get()->getResultArray();
        $content = [];
        foreach ($rows as $r)
            $content[$r['setting_key']] = $r['setting_value'];

        // Override dashboard subtitles with values from app_messages (General category)
        // This allows super admins to configure them via Business Settings → App Messages
        $subtitleKeys = ['seller_dashboard_subtitle', 'buyer_dashboard_subtitle'];
        $msgRows = $db->table('app_messages')
            ->whereIn('message_key', $subtitleKeys)
            ->get()
            ->getResultArray();
        foreach ($msgRows as $m) {
            if (!empty($m['message_value'])) {
                $content[$m['message_key']] = $m['message_value'];
            }
        }

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

    public function transactionsReports()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $range = $this->request->getGet('range') ?? 'all';

        // 1. Base query for transactions (for Table and overall Stats)
        $txBuilder = $db->table('transactions t')
            ->select('t.*, u.name as user_name, sp.user_type as plan_type')
            ->join('users u', 'u.id = t.user_id', 'left')
            ->join('user_subscriptions us', 'us.merchant_transaction_id = t.transaction_id AND t.transaction_id != ""', 'left')
            ->join('subscription_plans sp', 'sp.id = us.plan_id', 'left')
            ->orderBy('t.created_at', 'DESC');

        // Always scope to the logged-in user's transactions
        $txBuilder->where('t.user_id', $jwtUser['user_id']);

        // Apply Range Filter to transactions
        switch ($range) {
            case 'current_week': $txBuilder->where('t.created_at >=', date('Y-m-d 00:00:00', strtotime('monday this week'))); break;
            case 'last_week': $txBuilder->where('t.created_at >=', date('Y-m-d 00:00:00', strtotime('monday last week')))->where('t.created_at <=', date('Y-m-d 23:59:59', strtotime('sunday last week'))); break;
            case 'last_2_weeks': $txBuilder->where('t.created_at >=', date('Y-m-d 00:00:00', strtotime('monday -2 weeks')))->where('t.created_at <=', date('Y-m-d 23:59:59', strtotime('sunday last week'))); break;
            case 'current_month': $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00')); break;
            case 'last_month': $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of last month')))->where('t.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month'))); break;
            case 'last_2_months': $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -2 months')))->where('t.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month'))); break;
            case 'current_quarter': $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00', strtotime('-2 months'))); break;
            case 'last_quarter': $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -3 months')))->where('t.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month'))); break;
            case 'last_2_quarters': $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -6 months')))->where('t.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month'))); break;
            case 'current_year': $txBuilder->where('t.created_at >=', date('Y-01-01 00:00:00')); break;
            case 'last_year': $txBuilder->where('t.created_at >=', date('Y-01-01 00:00:00', strtotime('first day of january last year')))->where('t.created_at <=', date('Y-12-31 23:59:59', strtotime('last day of december last year'))); break;
            case 'last_2_years': $txBuilder->where('t.created_at >=', date('Y-01-01 00:00:00', strtotime('first day of january -2 years')))->where('t.created_at <=', date('Y-12-31 23:59:59', strtotime('last day of december last year'))); break;
            case 'all_time': default: break;
        }

        $allTransactions = $txBuilder->get()->getResultArray();
        $successfulTxs = array_filter($allTransactions, fn($t) => in_array($t['payment_status'], ['paid', 'completed', 'success']));

        // Fetch all active plans for fallback lookup
        $allPlans = $db->table('subscription_plans')->where('is_active', 1)->get()->getResultArray();

        // Fetch user info for return data
        $user = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();
        $userType = $user['user_type'] ?? $jwtUser['role'];

        // Populate plan_type fallback if join failed
        foreach ($allTransactions as &$tx) {
            if ($tx['type'] === 'subscription') {
                // If join gave us nothing, or if it matched an empty transaction_id (which we now avoid in JOIN), use fallback
                if (empty($tx['plan_type']) || empty($tx['transaction_id'])) {
                    $desc = $tx['description'] ?? '';
                    if (str_contains($desc, ':')) {
                        $parts = explode(':', $desc);
                        $planName = trim($parts[1] ?? '');
                        if ($planName) {
                            foreach ($allPlans as $p) {
                                if ($p['name'] === $planName) {
                                    $tx['plan_type'] = $p['user_type'];
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }

        // 2. Fetch Subscription specific data (for Plan Breakdown)
        $subBuilder = $db->table('user_subscriptions us')
            ->select('us.*, sp.name as plan_name, sp.user_type as plan_user_type')
            ->join('subscription_plans sp', 'sp.id = us.plan_id', 'left');

        if (!in_array($jwtUser['role'], ['super_admin', 'superadmin'])) {
            $subBuilder->where('us.user_id', $jwtUser['user_id']);
        }
        
        // Apply same range filter to subscriptions
        switch ($range) {
            case 'current_week': $subBuilder->where('us.created_at >=', date('Y-m-d 00:00:00', strtotime('monday this week'))); break;
            case 'last_week': $subBuilder->where('us.created_at >=', date('Y-m-d 00:00:00', strtotime('monday last week')))->where('us.created_at <=', date('Y-m-d 23:59:59', strtotime('sunday last week'))); break;
            case 'last_2_weeks': $subBuilder->where('us.created_at >=', date('Y-m-d 00:00:00', strtotime('monday -2 weeks')))->where('us.created_at <=', date('Y-m-d 23:59:59', strtotime('sunday last week'))); break;
            case 'current_month': $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00')); break;
            case 'last_month': $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of last month')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month'))); break;
            case 'last_2_months': $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -2 months')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month'))); break;
            case 'current_quarter': $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('-2 months'))); break;
            case 'last_quarter': $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -3 months')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month'))); break;
            case 'last_2_quarters': $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -6 months')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month'))); break;
            case 'current_year': $subBuilder->where('us.created_at >=', date('Y-01-01 00:00:00')); break;
            case 'last_year': $subBuilder->where('us.created_at >=', date('Y-01-01 00:00:00', strtotime('first day of january last year')))->where('us.created_at <=', date('Y-12-31 23:59:59', strtotime('last day of december last year'))); break;
            case 'last_2_years': $subBuilder->where('us.created_at >=', date('Y-01-01 00:00:00', strtotime('first day of january -2 years')))->where('us.created_at <=', date('Y-12-31 23:59:59', strtotime('last day of december last year'))); break;
            case 'all_time': default: break;
        }

        $subs = $subBuilder->where('us.payment_status', 'paid')->get()->getResultArray();
        
        // 3. Calculate Summary Stats from successful transactions
        $totalTxs = count($successfulTxs);
        $totalRevenue = array_reduce($successfulTxs, fn($carry, $item) => $carry + (float)$item['amount'], 0);
        
        // Bifurcation (Buyer vs Seller)
        $buyerSpent = 0; $sellerSpent = 0;
        foreach ($successfulTxs as $tx) {
            // Orders are always buyer revenue. Subscriptions depend on plan type.
            if ($tx['type'] === 'subscription') {
                // Find corresponding sub to get plan_user_type
                $txId = $tx['transaction_id'] ?? '';
                $sId = $tx['subscription_id'] ?? 0;
                $s = array_values(array_filter($subs, fn($sb) => ($txId && $sb['merchant_transaction_id'] === $txId) || $sb['id'] == $sId))[0] ?? null;
                
                // Fallback: Link by plan name in description
                if (!$s && !empty($tx['description'])) {
                    // Extract name from "Subscription Stacking: [Name]" or "Subscription Purchase: [Name]"
                    $parts = explode(':', $tx['description']);
                    $planNameFromDesc = trim($parts[1] ?? '');
                    if ($planNameFromDesc) {
                        $s = array_values(array_filter($subs, fn($sb) => $sb['plan_name'] === $planNameFromDesc))[0] ?? null;
                    }
                }

                if ($s && $s['plan_user_type'] === 'seller') {
                    $sellerSpent += (float)$tx['amount'];
                } else {
                    $buyerSpent += (float)$tx['amount'];
                }
            } else {
                // Orders/other
                $buyerSpent += (float)$tx['amount'];
            }
        }

        // 4. Plan Breakdown (remain subscription based)
        $planBreakdown = []; $planTypes = [];
        foreach ($allPlans as $p) {
            $planBreakdown[$p['name']] = 0;
            $planTypes[$p['name']] = $p['user_type'];
        }
        foreach ($subs as $s) {
            if (isset($planBreakdown[$s['plan_name']])) $planBreakdown[$s['plan_name']]++;
        }

        return $this->respond([
            'success' => true,
            'data' => [
                'summary' => [
                    'total_subscriptions' => $totalTxs, // Renaming semantically in frontend if needed, but keeping key for compat
                    'total_spent' => $totalRevenue,
                    'total_discount' => array_reduce($subs, fn($carry, $item) => $carry + (float)$item['referral_discount_applied'], 0),
                    'total_plans' => $db->table('subscription_plans')->countAll(),
                ],
                'charts' => [
                    'amount_discount' => [
                        'buyer' => ['spent' => $buyerSpent, 'discount' => array_reduce($subs, fn($c, $i) => $c + (($i['plan_user_type'] === 'buyer') ? (float)$i['referral_discount_applied'] : 0), 0)],
                        'seller' => ['spent' => $sellerSpent, 'discount' => array_reduce($subs, fn($c, $i) => $c + (($i['plan_user_type'] === 'seller') ? (float)$i['referral_discount_applied'] : 0), 0)],
                    ],
                    'monthly_stats' => $this->getMonthlyStats($successfulTxs, $subs, $range),
                    'plan_breakdown' => [
                        'labels' => array_keys($planBreakdown),
                        'values' => array_values($planBreakdown),
                        'colors' => array_map(fn($name) => ($planTypes[$name] === 'buyer' ? '#008080' : '#d96459'), array_keys($planBreakdown))
                    ]
                ],
                'transactions' => $allTransactions,
                'user_role' => $jwtUser['role'],
                'user_type' => $userType
            ]
        ]);
    }

    private function getMonthlyStats($transactions, $subs, $range = 'all_time')
    {
        $stats = [];
        usort($transactions, fn($a, $b) => strtotime($a['created_at']) - strtotime($b['created_at']));

        $shortRanges = ['current_week', 'last_week', 'last_2_weeks', 'current_month', 'last_month', 'last_2_months'];
        $isShort = in_array($range, $shortRanges);
        $format = $isShort ? 'd M' : 'M Y';

        foreach ($transactions as $tx) {
            $label = date($format, strtotime($tx['created_at']));
            if (!isset($stats[$label])) {
                $stats[$label] = ['buyer_spent' => 0, 'seller_spent' => 0, 'buyer_count' => 0, 'seller_count' => 0, 'discount' => 0];
            }
            
            $amt = (float)$tx['amount'];
            if ($tx['type'] === 'subscription') {
                $txId = $tx['transaction_id'] ?? '';
                $sId = $tx['subscription_id'] ?? 0;
                $s = array_values(array_filter($subs, fn($sb) => ($txId && $sb['merchant_transaction_id'] === $txId) || $sb['id'] == $sId))[0] ?? null;
                
                // Fallback: Link by plan name in description
                if (!$s && !empty($tx['description'])) {
                    $parts = explode(':', $tx['description']);
                    $planNameFromDesc = trim($parts[1] ?? '');
                    if ($planNameFromDesc) {
                        $s = array_values(array_filter($subs, fn($sb) => $sb['plan_name'] === $planNameFromDesc))[0] ?? null;
                    }
                }

                if ($s && $s['plan_user_type'] === 'seller') {
                    $stats[$label]['seller_spent'] += $amt;
                    $stats[$label]['seller_count']++;
                    $stats[$label]['discount'] += (float)$s['referral_discount_applied'];
                } else {
                    $stats[$label]['buyer_spent'] += $amt;
                    $stats[$label]['buyer_count']++;
                    if ($s) $stats[$label]['discount'] += (float)$s['referral_discount_applied'];
                }
            } else {
                $stats[$label]['buyer_spent'] += $amt;
                $stats[$label]['buyer_count']++;
            }
        }

        return [
            'labels' => array_keys($stats),
            'buyer_spent' => array_values(array_map(fn($m) => $m['buyer_spent'], $stats)),
            'seller_spent' => array_values(array_map(fn($m) => $m['seller_spent'], $stats)),
            'buyer_count' => array_values(array_map(fn($m) => $m['buyer_count'], $stats)),
            'seller_count' => array_values(array_map(fn($m) => $m['seller_count'], $stats)),
            'discount' => array_values(array_map(fn($m) => $m['discount'], $stats))
        ];
    }
}
