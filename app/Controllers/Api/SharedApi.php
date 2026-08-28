<?php

namespace App\Controllers\Api;

use App\Controllers\Api\BaseApiController;

class SharedApi extends BaseApiController
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

        // Clean up physically deleted images on the disk now that the edit is approved
        if (!empty($product['previous_data'])) {
            $prev = json_decode($product['previous_data'], true);
            if (isset($prev['_images']) && is_array($prev['_images'])) {
                $currImages = $db->table('product_images')->where('product_id', $id)->get()->getResultArray();
                $currPaths = array_column($currImages, 'image_path');
                foreach ($prev['_images'] as $oldPath) {
                    if (!in_array($oldPath, $currPaths)) {
                        $fullPath = FCPATH . $oldPath;
                        if (is_file($fullPath)) {
                            unlink($fullPath);
                        }
                    }
                }
            }
        }

        $db->table('products')->where('id', $id)->update([
            'status' => 'approved',
            'admin_remarks' => $remarks,
            'pending_reason' => null,
            'edit_request' => null,
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
            'pending_reason' => null,
            'edit_request' => null,
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
            $this->recalibrateUserSubscriptions($jwtUser['user_id'], $userType);
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
        log_message('error', 'Active Query SQL: ' . $activeQuery->getCompiledSelect(false));

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
        foreach ($rows as $r)
            $unlockCard[$r['setting_key']] = $r['setting_value'];

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
                if ($quarter == 0) {
                    $quarter = 4;
                    $year--;
                }
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
                if ($lastQ == 0) {
                    $lastQ = 4;
                    $lastQYear--;
                }
                $endMonth = $lastQ * 3;
                $end = date('Y-m-t 23:59:59', strtotime("$lastQYear-" . str_pad($endMonth, 2, '0', STR_PAD_LEFT) . "-01"));

                // Start: first day of 2nd quarter back
                $startQ = $currQ - 2;
                $startQYear = date('Y');
                if ($startQ <= 0) {
                    $startQ += 4;
                    $startQYear--;
                }
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
                $year = (int) date('Y') - 1;
                $start = "$year-01-01 00:00:00";
                $end = "$year-12-31 23:59:59";
                $dateFilter = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                $trendWhere = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                break;
            case 'last_2_years':
                $currYear = (int) date('Y');
                $start = ($currYear - 2) . "-01-01 00:00:00";
                $end = ($currYear - 1) . "-12-31 23:59:59";
                $dateFilter = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                $trendWhere = "AND o.created_at >= '$start' AND o.created_at <= '$end'";
                break;
            case 'all_time':
            default:
                $dateFilter = "";
                $trendWhere = "AND o.created_at >= DATE_SUB(NOW(), INTERVAL 10 YEAR)";
                break;
        }

        // Force all roles to see only their personal 'Received' (Seller) perspective
        $whereSeller = "seller_id = " . (int) $userId;
        $whereOffers = "o.seller_id = " . (int) $userId;
        $whereProducts = "p.seller_id = " . (int) $userId;

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

        $user = $db->table('users')->select('seller_rating_count')->where('id', $userId)->get()->getRowArray();
        $scorePoints = (int) ($user['seller_rating_count'] ?? 0);

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
            'General' => ['site_name', 'support_email', 'support_phone', 'support_hours'],
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
     * SuperAdmin may only edit message_value. Key is immutable, value cannot be blank.
     */
    public function updateAppMessage($id)
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $value = trim($data['message_value'] ?? '');

        if ($value === '') {
            return $this->respond(['success' => false, 'message' => 'Message value cannot be blank'], 400);
        }

        $existing = $db->table('app_messages')->where('id', $id)->get()->getRowArray();
        if (!$existing) {
            return $this->respond(['success' => false, 'message' => 'Error message not found'], 404);
        }

        $placeholderError = $this->validateMessagePlaceholders($existing['message_value'], $value);
        if ($placeholderError !== null) {
            return $this->respond(['success' => false, 'message' => $placeholderError], 400);
        }

        $db->table('app_messages')->where('id', $id)->update(['message_value' => $value, 'updated_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Message updated']);
    }

    /**
     * POST /api/v1/shared/add-app-message — DISABLED
     * Message keys are system-defined and cannot be created via the API.
     */
    public function addAppMessage()
    {
        return $this->respond([
            'success' => false,
            'message' => 'Creating new message keys is not allowed. Message keys are system-defined.',
        ], 403);
    }

    /**
     * POST /api/v1/shared/delete-app-message/{id} — DISABLED
     * Message keys are system-defined and cannot be deleted via the API.
     */
    public function deleteAppMessage($id)
    {
        return $this->respond([
            'success' => false,
            'message' => 'Deleting message keys is not allowed. Message keys are system-defined.',
        ], 403);
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

        // Validate certain integer fields (Referral Tab integer fields, no decimals allowed)
        $intFields = [
            'referral_referrer_reward',
            'referral_receiver_reward',
            'referral_max_discount_percent',
            'referral_min_purchase'
        ];

        // Validate certain float fields (positive floats)
        $floatFields = [
            'offer_acceptance_limit_days',
            'offer_acceptance_limit_val',
            'seller_rating_period_days',
            'seller_rating_period_val',
            'seller_rejection_window_hours',
            'seller_rejection_window_val',
            'buyer_rating_period_days',
            'buyer_rating_period_val',
            'min_rental_days',
            'min_rental_val',
            'referral_expiry_days',
            'referral_expiry_val'
        ];

        foreach ($data as $key => $value) {
            if (in_array($key, $intFields)) {
                $valInt = filter_var($value, FILTER_VALIDATE_INT);
                // Also ensure there is no decimal point in input string to block 25.0
                if ($valInt === false || $valInt < 0 || strpos((string) $value, '.') !== false) {
                    $fieldName = str_replace('_', ' ', $key);
                    $fieldName = ucwords($fieldName);
                    return $this->respond(['success' => false, 'message' => "{$fieldName} must be a whole number (no decimals allowed)."], 400);
                }
                $value = (string) $valInt;
            } elseif (in_array($key, $floatFields)) {
                $valFloat = filter_var($value, FILTER_VALIDATE_FLOAT);
                if ($valFloat === false || $valFloat <= 0) {
                    $fieldName = str_replace('_', ' ', $key);
                    $fieldName = ucwords($fieldName);
                    return $this->respond(['success' => false, 'message' => "{$fieldName} must be a number greater than 0."], 400);
                }
                $value = (string) $valFloat;
            }

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
        foreach ($rows as $r)
            $data[$r['setting_key']] = $r['setting_value'];
        return $this->respond(['success' => true, 'data' => $data]);
    }

    /**
     * POST /api/v1/shared/faqs
     */
    public function createFaq()
    {
        if ($this->request->jwt_user['role'] !== 'super_admin')
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $db->table('faqs')->insert([
            'question' => $data['question'],
            'answer' => $data['answer'],
            'display_order' => (int) ($data['display_order'] ?? 0),
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
        if ($this->request->jwt_user['role'] !== 'super_admin')
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $db->table('faqs')->where('id', $id)->update([
            'question' => $data['question'],
            'answer' => $data['answer'],
            'display_order' => (int) ($data['display_order'] ?? 0),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['success' => true, 'message' => 'FAQ updated']);
    }

    /**
     * POST /api/v1/shared/faqs/{id}/delete
     */
    public function deleteFaq($id)
    {
        if ($this->request->jwt_user['role'] !== 'super_admin')
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
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
        if (!$plan)
            return $this->respond(['success' => false, 'message' => 'Plan not found'], 404);

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
        if (!$plan)
            return $this->respond(['success' => false, 'message' => 'Plan not found'], 404);

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
        if ($isFeatured !== null)
            $updateData['is_featured'] = $isFeatured;
        if (isset($data['is_most_selected']))
            $updateData['is_most_selected'] = (int) $data['is_most_selected'];

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
        $brands = $db->table('brands')->orderBy('brand_name', 'ASC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $brands]);
    }

    public function createBrand()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();
        $db->table('brands')->insert(['brand_name' => $data['brand_name'] ?? $data['name'] ?? '', 'seller_id' => $this->request->jwt_user['user_id'], 'created_at' => date('Y-m-d H:i:s')]);
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
        // Map database column names to frontend expected names & support legacy keys
        foreach ($coupons as &$coupon) {
            $minAmount = $coupon['min_order_amount'] ?? $coupon['min_purchase'] ?? 0;
            $validUntil = $coupon['valid_until'] ?? $coupon['expires_at'] ?? null;

            $usedInTable = $db->table('coupon_usage')->where('coupon_id', $coupon['id'])->countAllResults();
            $usedInSubs = $db->table('user_subscriptions')->where('coupon_id', $coupon['id'])->where('payment_status', 'paid')->countAllResults();
            $usedCount = max((int) ($coupon['used_count'] ?? 0), $usedInTable, $usedInSubs);

            $coupon['min_order_amount'] = $minAmount;
            $coupon['min_purchase'] = $minAmount;
            $coupon['valid_until'] = $validUntil;
            $coupon['expires_at'] = $validUntil;
            $coupon['used_count'] = (string) $usedCount;
        }
        return $this->respond(['success' => true, 'data' => $coupons]);
    }

    public function createCoupon()
    {
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $code = strtoupper(trim($data['code'] ?? ''));

        // Prevent duplicate coupon codes
        $existing = $db->table('coupons')->where('code', $code)->get()->getRowArray();
        if ($existing) {
            return $this->respond(['success' => false, 'message' => 'Coupon code already exists. Use a different code.'], 409);
        }

        // Handle expiry date - if only date is provided, set it to end of that day
        $rawExpiry = $data['valid_until'] ?? $data['expires_at'] ?? null;
        $expiresAt = null;
        if (!empty($rawExpiry)) {
            $expiresAt = $rawExpiry;
            // If it's just a date (YYYY-MM-DD), append 23:59:59 to make it end of day
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $expiresAt)) {
                $expiresAt .= ' 23:59:59';
            }
        }

        $fields = $db->getFieldNames('coupons');
        $minAmt = (float) ($data['min_order_amount'] ?? $data['min_purchase'] ?? 0);

        // usage_limit: 0 or empty means unlimited — store NULL so per-user check is skipped
        $rawLimit = $data['usage_limit'] ?? null;
        $usageLimit = ($rawLimit !== null && $rawLimit !== '' && (int) $rawLimit > 0)
            ? (int) $rawLimit
            : null;

        $insertData = [
            'code' => $code,
            'discount_type' => $data['discount_type'] ?? 'percentage',
            'discount_value' => $data['discount_value'] ?? 0,
            'max_discount' => ($data['max_discount'] ?? null) ?: null,
            'usage_limit' => $usageLimit,
            'is_active' => 1,
        ];

        if (in_array('min_order_amount', $fields))
            $insertData['min_order_amount'] = $minAmt;
        if (in_array('min_purchase', $fields))
            $insertData['min_purchase'] = $minAmt;
        if (in_array('valid_until', $fields))
            $insertData['valid_until'] = $expiresAt;
        if (in_array('expires_at', $fields))
            $insertData['expires_at'] = $expiresAt;
        if (in_array('created_at', $fields))
            $insertData['created_at'] = date('Y-m-d H:i:s');

        $db->table('coupons')->insert($insertData);
        return $this->respond(['success' => true, 'message' => 'Coupon created'], 201);
    }

    public function updateCoupon(int $id)
    {
        $data = $this->request->getJSON(true) ?: $this->request->getPost();
        $db = \Config\Database::connect();

        // Ensure the coupon being edited actually exists
        $existing = $db->table('coupons')->where('id', $id)->get()->getRowArray();
        if (!$existing) {
            return $this->respond(['success' => false, 'message' => 'Coupon not found'], 404);
        }

        $code = strtoupper(trim($data['code'] ?? ''));

        // Prevent duplicate coupon codes on a DIFFERENT coupon
        if ($code !== '') {
            $duplicate = $db->table('coupons')
                ->where('code', $code)
                ->where('id !=', $id)
                ->get()->getRowArray();
            if ($duplicate) {
                return $this->respond(['success' => false, 'message' => 'Coupon code already exists. Use a different code.'], 409);
            }
        }

        // Handle expiry date - if only date is provided, set it to end of that day
        $rawExpiry = $data['valid_until'] ?? $data['expires_at'] ?? null;
        $expiresAt = null;
        if (!empty($rawExpiry)) {
            $expiresAt = $rawExpiry;
            // If it's just a date (YYYY-MM-DD), append 23:59:59 to make it end of day
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $expiresAt)) {
                $expiresAt .= ' 23:59:59';
            }
        }

        $fields = $db->getFieldNames('coupons');
        $minAmt = (float) ($data['min_order_amount'] ?? $data['min_purchase'] ?? 0);

        // usage_limit: 0 or empty means unlimited — store NULL so per-user check is skipped
        $rawLimit = $data['usage_limit'] ?? null;
        $usageLimit = ($rawLimit !== null && $rawLimit !== '' && (int) $rawLimit > 0)
            ? (int) $rawLimit
            : null;

        $updateData = [
            'code' => $code,
            'discount_type' => $data['discount_type'] ?? 'percentage',
            'discount_value' => $data['discount_value'] ?? 0,
            'max_discount' => ($data['max_discount'] ?? null) ?: null,
            'usage_limit' => $usageLimit,
        ];

        if (in_array('min_order_amount', $fields))
            $updateData['min_order_amount'] = $minAmt;
        if (in_array('min_purchase', $fields))
            $updateData['min_purchase'] = $minAmt;
        if (in_array('valid_until', $fields))
            $updateData['valid_until'] = $expiresAt;
        if (in_array('expires_at', $fields))
            $updateData['expires_at'] = $expiresAt;
        if (in_array('updated_at', $fields))
            $updateData['updated_at'] = date('Y-m-d H:i:s');

        $db->table('coupons')->where('id', $id)->update($updateData);

        if ($db->affectedRows() === 0) {
            // No rows updated — could be a DB constraint violation or no real change
            // Re-fetch to confirm the row still matches what we sent
            $after = $db->table('coupons')->where('id', $id)->get()->getRowArray();
            if (!$after) {
                return $this->respond(['success' => false, 'message' => 'Update failed: coupon not found after update.'], 500);
            }
        }

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
        $today = date('Y-m-d');

        $builder = $db->table('advertisements')
            ->where('is_active', 1)
            ->groupStart()
            ->where('start_date IS NULL')
            ->orWhere('start_date <=', $today)
            ->groupEnd()
            ->groupStart()
            ->where('end_date IS NULL')
            ->orWhere('end_date >=', $today)
            ->groupEnd()
            ->orderBy('created_at', 'DESC');

        $position = $this->request->getGet('position');
        if ($position) {
            $builder->where('position', $position);
        }

        $page = $this->request->getGet('page');
        if ($page && $page !== 'all' && $position !== 'rows') {
            $pagesToMatch = [$page, 'all'];
            if ($page === 'portal_seller_dashboard' || $page === 'seller') {
                $pagesToMatch[] = 'seller';
                $pagesToMatch[] = 'portal_seller_dashboard';
            }
            if ($page === 'portal_buyer_dashboard' || $page === 'buyer') {
                $pagesToMatch[] = 'buyer';
                $pagesToMatch[] = 'portal_buyer_dashboard';
            }
            if ($page === 'portal_admin_dashboard' || $page === 'admin') {
                $pagesToMatch[] = 'admin';
                $pagesToMatch[] = 'portal_admin_dashboard';
            }
            $builder->whereIn('display_page', array_unique($pagesToMatch));
        }

        $ads = $builder->get()->getResultArray();
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
        if (!$page)
            return $this->respond(['success' => false, 'message' => 'Page not found.'], 404);
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

        // Check if gender_config column exists, if not select without it
        $hasGenderConfig = $db->fieldExists('gender_config', 'listing_types');
        $selectFields = $hasGenderConfig ? 'id, type_name, gender_config, field_config, created_at' : 'id, type_name, field_config, created_at';
        $listingTypes = $db->table('listing_types')->select($selectFields)->get()->getResultArray();
        $categories = $db->table('categories')->select('id, category_name as name, field_config, product_type_id, product_type_ids, applies_to, created_at')->get()->getResultArray();
        $subCategories = $db->table('sub_categories')->select('id, name, field_config, category_id, category_ids, applies_to, created_at')->get()->getResultArray();
        $productTypes = $db->table('product_types')->get()->getResultArray();
        $genders = $db->table('genders')->get()->getResultArray();
        $colors = $db->table('colors')->get()->getResultArray();
        $attributes = $db->table('attributes')->select('*')->orderBy('created_at', 'DESC')->get()->getResultArray();
        $validationRules = $db->table('validation_rules')->where('is_active', 1)->get()->getResultArray();

        // Get valid gender names for filtering
        $validGenderNames = array_map('strtolower', array_column($genders, 'name'));

        // Filter out deleted genders from categories' applies_to
        foreach ($categories as &$cat) {
            $catAppliesTo = json_decode($cat['applies_to'] ?? '[]', true);
            if (is_array($catAppliesTo)) {
                $catAppliesTo = array_filter($catAppliesTo, function ($gender) use ($validGenderNames) {
                    return in_array(strtolower($gender), $validGenderNames);
                });
                $cat['applies_to'] = json_encode(array_values($catAppliesTo));
            }
        }

        // Filter out deleted genders from sub-categories' applies_to
        foreach ($subCategories as &$subCat) {
            $subCatAppliesTo = json_decode($subCat['applies_to'] ?? '[]', true);
            if (is_array($subCatAppliesTo)) {
                $subCatAppliesTo = array_filter($subCatAppliesTo, function ($gender) use ($validGenderNames) {
                    return in_array(strtolower($gender), $validGenderNames);
                });
                $subCat['applies_to'] = json_encode(array_values($subCatAppliesTo));
            }
        }

        // Get entity assignments for each attribute
        $assignments = $db->table('attribute_assignments')->get()->getResultArray();
        $assignmentMap = [];
        foreach ($assignments as $assignment) {
            if (!isset($assignmentMap[$assignment['attribute_id']])) {
                $assignmentMap[$assignment['attribute_id']] = [];
            }
            $assignmentMap[$assignment['attribute_id']][] = [
                'entity_type' => $assignment['entity_type'],
                'entity_id' => $assignment['entity_id'],
            ];
        }

        // Parse allowed_values JSON and add entity linking for each attribute
        foreach ($attributes as &$attr) {
            $attr['allowed_values'] = !empty($attr['allowed_values']) ? json_decode($attr['allowed_values'], true) : [];
            // Ensure allowed_values is always an array
            if (!is_array($attr['allowed_values'])) {
                $attr['allowed_values'] = [];
            }

            // Ensure required field exists and is a number
            if (!isset($attr['required'])) {
                $attr['required'] = 0;
            }

            // Ensure type field exists
            if (!isset($attr['type'])) {
                $attr['type'] = 'text';
            }

            // Ensure placeholder field exists
            if (!isset($attr['placeholder'])) {
                $attr['placeholder'] = '';
            }

            // Initialize entity linking fields
            $attr['entity_types'] = [];
            $attr['entity_type'] = null;
            $attr['entity_ids'] = [];
            $attr['entity_id'] = null;
            $attr['listing_type_id'] = null;
            $attr['category_id'] = null;
            $attr['sub_category_id'] = null;

            // Add entity linking information
            if (isset($assignmentMap[$attr['id']]) && !empty($assignmentMap[$attr['id']])) {
                // Group entity IDs by entity type
                $entityIdsByType = [
                    'listing_type' => [],
                    'category' => [],
                    'sub_category' => []
                ];

                foreach ($assignmentMap[$attr['id']] as $assignment) {
                    $entityType = $assignment['entity_type'];
                    $entityId = $assignment['entity_id'];
                    if (isset($entityIdsByType[$entityType])) {
                        $entityIdsByType[$entityType][] = $entityId;
                    }
                }

                // Extract all unique entity_types
                $entityTypes = array_unique(array_column($assignmentMap[$attr['id']], 'entity_type'));
                $attr['entity_types'] = array_values($entityTypes);

                // Return entity IDs grouped by type for frontend
                $attr['entity_ids'] = array_merge(
                    $entityIdsByType['listing_type'],
                    $entityIdsByType['category'],
                    $entityIdsByType['sub_category']
                );

                // For backward compatibility, set single entity_type to first one
                $attr['entity_type'] = $attr['entity_types'][0] ?? null;

                // Map entity_type to the appropriate ID column for frontend compatibility (backward compatibility)
                $attr['listing_type_id'] = $entityIdsByType['listing_type'][0] ?? null;
                $attr['category_id'] = $entityIdsByType['category'][0] ?? null;
                $attr['sub_category_id'] = $entityIdsByType['sub_category'][0] ?? null;
            }
        }

        return $this->respond([
            'success' => true,
            'data' => [
                'listing_types' => $listingTypes,
                'categories' => $categories,
                'sub_categories' => $subCategories,
                'product_types' => $productTypes,
                'genders' => $genders,
                'colors' => $colors,
                'attributes' => $attributes,
                'validation_rules' => $validationRules,
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

        // Role & Block validation
        $user = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$user) {
            return $this->respond(['success' => false, 'message' => 'User not found'], 404);
        }

        // 1. Account global block check
        if (!empty($user['is_blocked'])) {
            return $this->respond(['success' => false, 'message' => 'Your account is blocked. Please contact support.'], 403);
        }

        // 2. Role-specific block check (applies to ALL users including admins if superadmin blocked their role)
        if ($plan['user_type'] === 'seller' && !empty($user['blocked_seller'])) {
            return $this->respond(['success' => false, 'message' => 'Your seller role is blocked by superadmin. You cannot purchase a seller subscription plan.'], 403);
        }
        if ($plan['user_type'] === 'buyer' && !empty($user['blocked_buyer'])) {
            return $this->respond(['success' => false, 'message' => 'Your buyer role is blocked by superadmin. You cannot purchase a buyer subscription plan.'], 403);
        }

        // 3. User role/type check (unblocked admins/superadmins are exempt from user_type restriction)
        $userRole = $user['role'] ?? '';
        $userType = $user['user_type'] ?? '';
        $isGlobalAdmin = in_array($userRole, ['admin', 'super_admin', 'superadmin']) || in_array($userType, ['admin', 'super_admin', 'superadmin']);

        if (!$isGlobalAdmin) {
            if ($plan['user_type'] === 'seller') {
                if ($userRole !== 'seller' && $userType !== 'seller' && $userType !== 'both') {
                    return $this->respond(['success' => false, 'message' => 'Seller subscription plan requires seller role. Please enable seller role to purchase this plan.'], 403);
                }
            } elseif ($plan['user_type'] === 'buyer') {
                if ($userRole !== 'buyer' && $userType !== 'buyer' && $userType !== 'both') {
                    return $this->respond(['success' => false, 'message' => 'Buyer subscription plan requires buyer role. Please enable buyer role to purchase this plan.'], 403);
                }
            }
        }

        // Stacking Logic: Find the latest expiry among active plans for the same user type
        $latestActive = $db->table('user_subscriptions us')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->where('us.user_id', $jwtUser['user_id'])
            ->where('us.is_active', 1)
            ->where('sp.user_type', $plan['user_type'])
            ->where('us.expires_at >', date('Y-m-d H:i:s'))
            ->orderBy('us.expires_at', 'DESC')
            ->get()->getRowArray();

        $durationHours = (float) ($plan['duration_hours'] ?: 720);
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

        $this->recalibrateUserSubscriptions($jwtUser['user_id'], $plan['user_type']);

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

        $currentUser = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$currentUser) {
            return $this->respond(['success' => false, 'message' => 'User not found'], 404);
        }

        $requiredFields = [
            'name' => 'Name',
            'mobile' => 'Mobile number',
            'alternate_mobile' => 'Alternate mobile number',
            'email' => 'Email',
            'gender' => 'Gender',
            'address' => 'Address',
            'pin_code' => 'Pin code',
            'city' => 'City',
            'state' => 'State',
        ];

        foreach ($requiredFields as $field => $label) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                return $this->respond(['success' => false, 'message' => "{$label} is mandatory and cannot be empty."], 400);
            }
        }

        $name = trim((string) $data['name']);
        $mobile = trim((string) $data['mobile']);
        $alternateMobile = trim((string) $data['alternate_mobile']);
        $email = strtolower(trim((string) $data['email']));
        $gender = trim((string) $data['gender']);
        $address = trim((string) $data['address']);
        $pinCode = trim((string) $data['pin_code']);
        $city = trim((string) $data['city']);
        $state = trim((string) $data['state']);

        // 1. Email format check — must contain @, a domain, and a valid TLD (e.g. .com, .in, .org)
        $emailRegex = '/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,6}$/';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match($emailRegex, $email)) {
            return $this->respond(['success' => false, 'message' => 'Invalid email address. Please enter a valid email (e.g. example@gmail.com).'], 400);
        }

        // 1a. Mobile number format check (must be exactly 10 digits)
        if (!preg_match('/^[6-9]\d{9}$/', $mobile)) {
            return $this->respond(['success' => false, 'message' => 'Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9.'], 400);
        }

        // 1b. Alternate mobile number format check (must be exactly 10 digits)
        if (!preg_match('/^[6-9]\d{9}$/', $alternateMobile)) {
            return $this->respond(['success' => false, 'message' => 'Alternate mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9.'], 400);
        }

        // 1c. Pin code format check (must be exactly 6 digits)
        if (!preg_match('/^\d{6}$/', $pinCode)) {
            return $this->respond(['success' => false, 'message' => 'Pin code must be a valid 6-digit number.'], 400);
        }

        // 2. Primary mobile vs Alternate mobile check
        if ($mobile === $alternateMobile) {
            return $this->respond(['success' => false, 'message' => 'Alternate mobile number cannot be the same as primary mobile number.'], 400);
        }

        // 3. Primary mobile uniqueness check (check both mobile and alternate_mobile columns for other users)
        $mobileAsPrimary = $db->table('users')
            ->where('mobile', $mobile)
            ->where('id !=', $jwtUser['user_id'])
            ->countAllResults();
        $mobileAsAlternate = $db->table('users')
            ->where('alternate_mobile', $mobile)
            ->where('id !=', $jwtUser['user_id'])
            ->countAllResults();
        if ($mobileAsPrimary > 0 || $mobileAsAlternate > 0) {
            return $this->respond(['success' => false, 'message' => 'Mobile number is already registered by another user.'], 400);
        }

        // 4. Alternate mobile uniqueness check (check both mobile and alternate_mobile columns for other users)
        $altAsPrimary = $db->table('users')
            ->where('mobile', $alternateMobile)
            ->where('id !=', $jwtUser['user_id'])
            ->countAllResults();
        $altAsAlternate = $db->table('users')
            ->where('alternate_mobile', $alternateMobile)
            ->where('id !=', $jwtUser['user_id'])
            ->countAllResults();
        if ($altAsPrimary > 0 || $altAsAlternate > 0) {
            return $this->respond(['success' => false, 'message' => 'Alternate mobile number is already registered by another user.'], 400);
        }

        // 5. Email uniqueness check for all users
        $emailExists = $db->table('users')
            ->where('email', $email)
            ->where('id !=', $jwtUser['user_id'])
            ->countAllResults();
        if ($emailExists > 0) {
            return $this->respond(['success' => false, 'message' => 'Email is already registered by another user.'], 400);
        }

        $updateData = [
            'name' => $name,
            'mobile' => $mobile,
            'alternate_mobile' => $alternateMobile,
            'email' => $email,
            'gender' => $gender,
            'address' => $address,
            'pin_code' => $pinCode,
            'city' => $city,
            'state' => $state,
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        $db->table('users')->where('id', $jwtUser['user_id'])->update($updateData);

        $user = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();
        return $this->respond(['success' => true, 'message' => 'Profile updated successfully', 'data' => $user]);
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
        if (!is_dir($uploadPath))
            mkdir($uploadPath, 0777, true);

        // Delete old profile image if exists
        $existing = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();
        if (!empty($existing['profile_image'])) {
            $oldPath = FCPATH . $existing['profile_image'];
            if (file_exists($oldPath))
                @unlink($oldPath);
        }

        $newName = $file->getRandomName();
        $file->move($uploadPath, $newName);
        // Compress & resize profile image to max 800×800 px at quality 80
        compressAndResizeImage($uploadPath . $newName, 800, 800, 80);
        $imagePath = 'uploads/profiles/' . $newName;

        $db->table('users')->where('id', $jwtUser['user_id'])->update([
            'profile_image' => $imagePath,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond([
            'success' => true,
            'message' => 'Profile image updated',
            'data' => ['path' => $imagePath],
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
                'footer_sections',
                'footer_category_links',
                'footer_section_titles',
                'how_it_works_steps',
                'stats_banner',
                'trust_features',
                'testimonials',
                'enable_zone_restriction',
                'aot_sections',
                'category_cards',
                'buyer_dashboard_subtitle',
                'seller_dashboard_subtitle',
                'global_system_lock',
                'site_name',
                'registration_terms'
            ])
            ->get()->getResultArray();
        $content = [];
        foreach ($rows as $r)
            $content[$r['setting_key']] = $r['setting_value'];

        // Fetch all app_messages to provide to SystemContext
        $appMessages = $db->table('app_messages')->get()->getResultArray();
        $content['app_messages'] = $appMessages;

        // Override dashboard subtitles with specific values from app_messages if they exist
        foreach ($appMessages as $m) {
            if (in_array($m['message_key'], ['seller_dashboard_subtitle', 'buyer_dashboard_subtitle']) && !empty($m['message_value'])) {
                $content[$m['message_key']] = $m['message_value'];
            }
        }

        return $this->respond(['success' => true, 'data' => $content]);
    }

    public function featuredProducts()
    {
        // PERFORMANCE: Cache the featured-products list for 60 seconds using
        // CI4's built-in file cache. This endpoint is hit on every homepage
        // load and the result rarely changes mid-session.
        $cache = \Config\Services::cache();
        $cacheKey = 'featured_products_v1';

        $products = $cache->get($cacheKey);

        if ($products === null) {
            $db = \Config\Database::connect();
            // Select only the columns the homepage card actually uses
            // (avoids transmitting large description/config blobs on every home visit)
            $products = $db->table('products p')
                ->select(
                    'p.id, p.title, p.price, p.original_price, p.rental_cost, ' .
                    'p.listing_type, p.listing_type_category, p.category, ' .
                    'p.dispatch_city, p.dispatch_state, p.is_featured, p.updated_at, ' .
                    'u.name as seller_name, ' .
                    'ob.brand_name as orignal_brand, ' .
                    'b.brand_name as seller_brand, ' .
                    '(SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id LIMIT 1) as image'
                )
                ->join('users u', 'u.id = p.seller_id', 'left')
                ->join('orignal_brands ob', 'ob.id = p.orignal_brand_id AND ob.is_active = 1 AND ob.is_blocked = 0', 'left')
                ->join('brands b', 'b.id = p.brand_id AND b.is_active = 1 AND b.is_blocked = 0', 'left')
                ->where('p.status', 'approved')
                ->where('p.is_featured', 1)
                ->orderBy('p.updated_at', 'DESC')
                ->limit(12)
                ->get()->getResultArray();

            $cache->save($cacheKey, $products, 60); // cache for 60 seconds
        }

        return $this->respond(['success' => true, 'data' => $products]);
    }

    public function transactionsReports()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $range = $this->request->getGet('range') ?? 'all';

        // 1. Base query for transactions (for Table and overall Stats)
        $txBuilder = $db->table('transactions t')
            ->select('t.*, u.name as user_name, sp.user_type as plan_type, us.starts_at, us.expires_at')
            ->join('users u', 'u.id = t.user_id', 'left')
            ->join('user_subscriptions us', 'us.merchant_transaction_id = t.transaction_id AND t.transaction_id != ""', 'left')
            ->join('subscription_plans sp', 'sp.id = us.plan_id', 'left')
            ->orderBy('t.created_at', 'DESC');

        // Scope query to user unless admin/super_admin
        if (!in_array($jwtUser['role'], ['super_admin', 'superadmin', 'admin'])) {
            $txBuilder->where('t.user_id', $jwtUser['user_id']);
        }

        // Apply Range Filter to transactions
        switch ($range) {
            case 'current_week':
                $txBuilder->where('t.created_at >=', date('Y-m-d 00:00:00', strtotime('monday this week')));
                break;
            case 'last_week':
                $txBuilder->where('t.created_at >=', date('Y-m-d 00:00:00', strtotime('monday last week')))->where('t.created_at <=', date('Y-m-d 23:59:59', strtotime('sunday last week')));
                break;
            case 'last_2_weeks':
                $txBuilder->where('t.created_at >=', date('Y-m-d 00:00:00', strtotime('monday -2 weeks')))->where('t.created_at <=', date('Y-m-d 23:59:59', strtotime('sunday last week')));
                break;
            case 'current_month':
                $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00'));
                break;
            case 'last_month':
                $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of last month')))->where('t.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'last_2_months':
                $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -2 months')))->where('t.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'current_quarter':
                $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00', strtotime('-2 months')));
                break;
            case 'last_quarter':
                $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -3 months')))->where('t.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'last_2_quarters':
                $txBuilder->where('t.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -6 months')))->where('t.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'current_year':
                $txBuilder->where('t.created_at >=', date('Y-01-01 00:00:00'));
                break;
            case 'last_year':
                $txBuilder->where('t.created_at >=', date('Y-01-01 00:00:00', strtotime('first day of january last year')))->where('t.created_at <=', date('Y-12-31 23:59:59', strtotime('last day of december last year')));
                break;
            case 'last_2_years':
                $txBuilder->where('t.created_at >=', date('Y-01-01 00:00:00', strtotime('first day of january -2 years')))->where('t.created_at <=', date('Y-12-31 23:59:59', strtotime('last day of december last year')));
                break;
            case 'all_time':
            default:
                break;
        }

        $allTransactions = $txBuilder->get()->getResultArray();

        // Synthesize virtual transaction rows for free-plan activations
        // (amount_paid = 0, no merchant_transaction_id → never written to transactions table)
        $freeSubBuilder = $db->table('user_subscriptions us')
            ->select('us.*, sp.name as plan_name_from_plan, sp.user_type as plan_user_type')
            ->join('subscription_plans sp', 'sp.id = us.plan_id', 'left')
            ->where('us.amount_paid', 0)
            ->whereIn('us.payment_status', ['paid', 'completed', 'success'])
            ->where('(us.merchant_transaction_id IS NULL OR us.merchant_transaction_id = "")');

        if (!in_array($jwtUser['role'], ['super_admin', 'superadmin', 'admin'])) {
            $freeSubBuilder->where('us.user_id', $jwtUser['user_id']);
        }

        // Apply same date-range filter on the free-sub query
        switch ($range) {
            case 'current_week':
                $freeSubBuilder->where('us.created_at >=', date('Y-m-d 00:00:00', strtotime('monday this week')));
                break;
            case 'last_week':
                $freeSubBuilder->where('us.created_at >=', date('Y-m-d 00:00:00', strtotime('monday last week')))->where('us.created_at <=', date('Y-m-d 23:59:59', strtotime('sunday last week')));
                break;
            case 'last_2_weeks':
                $freeSubBuilder->where('us.created_at >=', date('Y-m-d 00:00:00', strtotime('monday -2 weeks')))->where('us.created_at <=', date('Y-m-d 23:59:59', strtotime('sunday last week')));
                break;
            case 'current_month':
                $freeSubBuilder->where('us.created_at >=', date('Y-m-01 00:00:00'));
                break;
            case 'last_month':
                $freeSubBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of last month')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'last_2_months':
                $freeSubBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -2 months')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'current_quarter':
                $freeSubBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('-2 months')));
                break;
            case 'last_quarter':
                $freeSubBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -3 months')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'last_2_quarters':
                $freeSubBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -6 months')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'current_year':
                $freeSubBuilder->where('us.created_at >=', date('Y-01-01 00:00:00'));
                break;
            case 'last_year':
                $freeSubBuilder->where('us.created_at >=', date('Y-01-01 00:00:00', strtotime('first day of january last year')))->where('us.created_at <=', date('Y-12-31 23:59:59', strtotime('last day of december last year')));
                break;
            case 'last_2_years':
                $freeSubBuilder->where('us.created_at >=', date('Y-01-01 00:00:00', strtotime('first day of january -2 years')))->where('us.created_at <=', date('Y-12-31 23:59:59', strtotime('last day of december last year')));
                break;
            default:
                break;
        }

        $freeSubRows = $freeSubBuilder->get()->getResultArray();
        $user = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();

        foreach ($freeSubRows as $fs) {
            $allTransactions[] = [
                'id' => 'free-' . $fs['id'],
                'order_id' => null,
                'user_id' => $fs['user_id'],
                'user_name' => $user['name'] ?? '',
                'transaction_type' => 'debit',
                'amount' => 0,
                'description' => 'Free Plan: ' . ($fs['plan_name_from_plan'] ?? 'Unknown'),
                'payment_method' => 'free',
                'transaction_id' => null,
                'type' => 'subscription',
                'payment_status' => 'paid',
                'plan_type' => $fs['plan_user_type'] ?? null,
                'starts_at' => $fs['starts_at'],
                'expires_at' => $fs['expires_at'],
                'created_at' => $fs['created_at'],
            ];
        }

        // Re-sort combined list by created_at DESC
        usort($allTransactions, fn($a, $b) => strtotime($b['created_at']) - strtotime($a['created_at']));

        $successfulTxs = array_filter($allTransactions, fn($t) => in_array($t['payment_status'], ['paid', 'completed', 'success']));


        // Fetch all active plans for fallback lookup
        $allPlans = $db->table('subscription_plans')->where('is_active', 1)->get()->getResultArray();

        // Fetch user info for return data (already fetched above as $user)
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

        // 2. Fetch Subscription specific data (for Plan Breakdown & Discounts)
        $subBuilder = $db->table('user_subscriptions us')
            ->select('us.*, sp.name as plan_name, sp.user_type as plan_user_type, sp.price as plan_price')
            ->join('subscription_plans sp', 'sp.id = us.plan_id', 'left');

        if (!in_array($jwtUser['role'], ['super_admin', 'superadmin', 'admin'])) {
            $subBuilder->where('us.user_id', $jwtUser['user_id']);
        }

        // Apply same range filter to subscriptions
        switch ($range) {
            case 'current_week':
                $subBuilder->where('us.created_at >=', date('Y-m-d 00:00:00', strtotime('monday this week')));
                break;
            case 'last_week':
                $subBuilder->where('us.created_at >=', date('Y-m-d 00:00:00', strtotime('monday last week')))->where('us.created_at <=', date('Y-m-d 23:59:59', strtotime('sunday last week')));
                break;
            case 'last_2_weeks':
                $subBuilder->where('us.created_at >=', date('Y-m-d 00:00:00', strtotime('monday -2 weeks')))->where('us.created_at <=', date('Y-m-d 23:59:59', strtotime('sunday last week')));
                break;
            case 'current_month':
                $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00'));
                break;
            case 'last_month':
                $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of last month')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'last_2_months':
                $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -2 months')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'current_quarter':
                $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('-2 months')));
                break;
            case 'last_quarter':
                $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -3 months')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'last_2_quarters':
                $subBuilder->where('us.created_at >=', date('Y-m-01 00:00:00', strtotime('first day of -6 months')))->where('us.created_at <=', date('Y-m-t 23:59:59', strtotime('last day of last month')));
                break;
            case 'current_year':
                $subBuilder->where('us.created_at >=', date('Y-01-01 00:00:00'));
                break;
            case 'last_year':
                $subBuilder->where('us.created_at >=', date('Y-01-01 00:00:00', strtotime('first day of january last year')))->where('us.created_at <=', date('Y-12-31 23:59:59', strtotime('last day of december last year')));
                break;
            case 'last_2_years':
                $subBuilder->where('us.created_at >=', date('Y-01-01 00:00:00', strtotime('first day of january -2 years')))->where('us.created_at <=', date('Y-12-31 23:59:59', strtotime('last day of december last year')));
                break;
            case 'all_time':
            default:
                break;
        }

        $subs = $subBuilder->whereIn('us.payment_status', ['paid', 'completed', 'success'])->get()->getResultArray();

        // 3. Calculate Summary Stats from successful transactions
        $totalTxs = count($successfulTxs);
        $totalRevenue = array_reduce($successfulTxs, fn($carry, $item) => $carry + (float) $item['amount'], 0);

        // Bifurcation (Buyer vs Seller)
        $buyerSpent = 0;
        $sellerSpent = 0;
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
                    $sellerSpent += (float) $tx['amount'];
                } else {
                    $buyerSpent += (float) $tx['amount'];
                }
            } else {
                // Orders/other
                $buyerSpent += (float) $tx['amount'];
            }
        }

        // 4. Plan Breakdown (remain subscription based)
        $planBreakdown = [];
        $planTypes = [];
        foreach ($allPlans as $p) {
            $planBreakdown[$p['name']] = 0;
            $planTypes[$p['name']] = $p['user_type'];
        }
        foreach ($subs as $s) {
            if (isset($planBreakdown[$s['plan_name']]))
                $planBreakdown[$s['plan_name']]++;
        }

        return $this->respond([
            'success' => true,
            'data' => [
                'summary' => [
                    'total_subscriptions' => $totalTxs, // Renaming semantically in frontend if needed, but keeping key for compat
                    'total_spent' => $totalRevenue,
                    'total_discount' => array_reduce($subs, fn($carry, $item) => $carry + $this->calculateSubscriptionDiscount($item), 0),
                    'total_plans' => $db->table('subscription_plans')->countAll(),
                ],
                'charts' => [
                    'amount_discount' => [
                        'buyer' => ['spent' => $buyerSpent, 'discount' => array_reduce($subs, fn($c, $i) => $c + (($i['plan_user_type'] === 'buyer') ? $this->calculateSubscriptionDiscount($i) : 0), 0)],
                        'seller' => ['spent' => $sellerSpent, 'discount' => array_reduce($subs, fn($c, $i) => $c + (($i['plan_user_type'] === 'seller') ? $this->calculateSubscriptionDiscount($i) : 0), 0)],
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

    private function calculateSubscriptionDiscount(array $s): float
    {
        $referralDisc = (float) ($s['referral_discount_applied'] ?? 0);
        $couponDisc = 0.0;

        if (!empty($s['coupon_discount_type']) && isset($s['coupon_discount_value'])) {
            $basePrice = (float) ($s['plan_price'] ?? 0);
            $type = $s['coupon_discount_type'];
            $val = (float) $s['coupon_discount_value'];
            $maxDisc = (isset($s['coupon_max_discount']) && $s['coupon_max_discount'] !== null) ? (float) $s['coupon_max_discount'] : 0.0;

            if ($type === 'percentage') {
                $couponDisc = ($basePrice * $val) / 100;
                if ($maxDisc > 0 && $couponDisc > $maxDisc) {
                    $couponDisc = $maxDisc;
                }
            } else {
                $couponDisc = $val;
            }
        }

        $totalCalculated = $couponDisc + $referralDisc;
        if ($totalCalculated > 0) {
            return $totalCalculated;
        }

        $planPrice = (float) ($s['plan_price'] ?? 0);
        $amtPaid = (float) ($s['amount_paid'] ?? 0);
        return ($planPrice > 0 && $amtPaid < $planPrice) ? ($planPrice - $amtPaid) : 0;

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

            $amt = (float) $tx['amount'];
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
                    $stats[$label]['discount'] += $this->calculateSubscriptionDiscount($s);
                } else {
                    $stats[$label]['buyer_spent'] += $amt;
                    $stats[$label]['buyer_count']++;
                    if ($s)
                        $stats[$label]['discount'] += $this->calculateSubscriptionDiscount($s);
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

    /**
     * GET /api/v1/shared/seo-settings/(:any)
     */
    public function getSeoSettingByPage($pageKey = null)
    {
        $rawKey = urldecode($pageKey ?? $this->request->getGet('route') ?? '');
        if (empty($rawKey)) {
            return $this->respond(['success' => false, 'message' => 'No page key or route provided'], 400);
        }

        $seoModel = new \App\Models\SeoSettingModel();

        // 1. Try exact page_key match first
        $setting = $seoModel->getByPageKey($rawKey);

        // 2. If not found by page_key, try route path match
        if (!$setting) {
            $routePath = '/' . ltrim($rawKey, '/');
            $setting = $seoModel->where('route', $routePath)->first();
        }

        // 3. Fallback: sanitize route path matching without leading/trailing query params
        if (!$setting) {
            $cleanRoute = '/' . trim(explode('?', $rawKey)[0], '/');
            $setting = $seoModel->where('route', $cleanRoute)->first();
        }

        if (!$setting) {
            return $this->respond(['success' => false, 'message' => 'SEO settings not found for this page'], 404);
        }

        return $this->respond(['success' => true, 'data' => $setting]);
    }
}
