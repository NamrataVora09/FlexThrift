<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class AdminApi extends ResourceController
{
    protected $format = 'json';

    public function dashboard()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $user = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();

        $pendingProductsQuery = $db->table('products p')
            ->where('p.status', 'pending');
        
        $pendingEditsQuery = $db->table('product_edit_requests r')
            ->join('products p', 'p.id = r.product_id', 'left')
            ->where('r.status', 'pending');

        if ($jwtUser['role'] === 'admin') {
            $pendingProductsQuery->join('users u', 'u.id = p.seller_id', 'left')->where('u.role !=', 'admin');
            $pendingEditsQuery->join('users u', 'u.id = p.seller_id', 'left')->where('u.role !=', 'admin');
        }

        $stats = [
            'total_users' => $db->table('users')->countAllResults(),
            'total_sellers' => $db->table('users')->whereIn('user_type', ['seller', 'both'])->countAllResults(),
            'total_buyers' => $db->table('users')->whereIn('user_type', ['buyer', 'both'])->countAllResults(),
            'total_products' => $db->table('products')->countAllResults(),
            'pending_products' => $pendingProductsQuery->countAllResults(),
            'pending_edits' => $pendingEditsQuery->countAllResults(),
            'total_orders' => $db->table('orders')->countAllResults(),
            'total_offers' => $db->table('offers')->countAllResults(),
            'successful_deals' => $db->table('offers')->where('status', 'accepted')->countAllResults(),
            'active_subscriptions' => $db->table('user_subscriptions')->where('is_active', 1)->where('expires_at >', date('Y-m-d H:i:s'))->countAllResults(),
        ];

        $recentOffers = $db->table('offers o')
            ->select('o.*, p.title as product_title, b.name as buyer_name, s.name as seller_name')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users b', 'b.id = o.buyer_id', 'left')
            ->join('users s', 's.id = p.seller_id', 'left')
            ->orderBy('o.created_at', 'DESC')
            ->limit(5)
            ->get()->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => [
                'user' => ['id' => (int) $user['id'], 'name' => $user['name'], 'role' => $jwtUser['role']], 
                'stats' => $stats,
                'recent_offers' => $recentOffers
            ],
        ]);
    }

    public function pendingProducts()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        // Check rights for regular admins
        if ($jwtUser['role'] === 'admin') {
            $adminUser = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();
            if ($adminUser && ($adminUser['blocked_from_approvals'] ?? 0)) {
                return $this->respond(['success' => true, 'data' => [], 'message' => 'You are blocked from approvals.']);
            }
        } elseif ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $productsQuery = $db->table('products p')
            ->select('p.*, u.name as seller_name, u.email as seller_email, u.seller_rating_avg, u.seller_rating_count, lt.usage_label, u.role as seller_role')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->join('listing_types lt', 'lt.type_name = p.listing_type_category', 'left')
            ->where('p.status', 'pending');

        // If the viewer is a regular admin, don't show products uploaded by other admins
        if ($jwtUser['role'] === 'admin') {
            $productsQuery->where('u.role !=', 'admin');
        }

        $products = $productsQuery->orderBy('p.created_at', 'ASC')
            ->get()->getResultArray();

        foreach ($products as &$product) {
            $product['images'] = $db->table('product_images')
                ->where('product_id', $product['id'])
                ->orderBy('display_order', 'ASC')
                ->get()->getResultArray();
        }

        return $this->respond(['success' => true, 'data' => $products]);
    }

    public function users()
    {
        $db = \Config\Database::connect();
        $users = $db->table('users')
            ->select('id, name, email, mobile, user_type, role, is_blocked, is_verified, reliability_score, created_at, blocked_seller, blocked_buyer')
            ->whereNotIn('role', ['admin', 'super_admin'])
            ->orderBy('created_at', 'DESC')
            ->get()->getResultArray();

        foreach ($users as &$u) {
            $u['products_uploaded_count'] = $db->table('products')->where('seller_id', $u['id'])->countAllResults();
        }

        return $this->respond(['success' => true, 'data' => $users]);
    }

    /**
     * GET /api/v1/admin/user-reports
     * Returns reports assigned to this admin (pending first).
     */
    public function getUserReports()
    {
        $jwtUser = $this->request->jwt_user;
        $adminId = $jwtUser['user_id'];
        $db      = \Config\Database::connect();

        $reports = $db->table('user_reports r')
            ->select('r.*, reporter.name as reporter_name, reporter.email as reporter_email,
                      reported.name as reported_name, reported.email as reported_email,
                      reported.is_blocked, reported.is_suspended,
                      reviewer.name as reviewed_by_name')
            ->join('users reporter', 'reporter.id = r.reporter_id', 'left')
            ->join('users reported', 'reported.id = r.reported_id', 'left')
            ->join('users reviewer', 'reviewer.id = r.reviewed_by', 'left')
            ->where('r.assigned_admin_id', $adminId)
            ->orderByRaw("FIELD(r.status, 'pending', 'reviewed', 'dismissed'), r.created_at DESC")
            ->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $reports]);
    }

    /**
     * POST /api/v1/admin/handle-report/:id
     * Admin reviews a report and optionally blocks/suspends/dismisses.
     * Body: action (block | unsuspend | unblock | dismiss), admin_notes (optional)
     */
    public function handleReport(int $reportId)
    {
        $jwtUser = $this->request->jwt_user;
        $adminId = $jwtUser['user_id'];
        $db      = \Config\Database::connect();

        $report = $db->table('user_reports')
            ->where('id', $reportId)
            ->where('assigned_admin_id', $adminId)
            ->get()->getRowArray();

        if (!$report) {
            return $this->respond(['success' => false, 'message' => 'Report not found or not assigned to you'], 404);
        }

        $input      = $this->request->getPost() ?: ($this->request->getJSON(true) ?: []);
        $action     = $input['action'] ?? 'dismiss';
        $adminNotes = $input['admin_notes'] ?? null;

        $reported = $db->table('users')->where('id', $report['reported_id'])->get()->getRowArray();
        if (!$reported) {
            return $this->respond(['success' => false, 'message' => 'Reported user not found'], 404);
        }

        $actionTaken = 'dismissed';

        if ($action === 'block') {
            $db->table('users')->where('id', $reported['id'])->update([
                'is_blocked' => 1,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
            $actionTaken = 'blocked';
        } elseif ($action === 'unblock') {
            $db->table('users')->where('id', $reported['id'])->update([
                'is_blocked'  => 0,
                'is_suspended' => 0,
                'updated_at'  => date('Y-m-d H:i:s'),
            ]);
            $actionTaken = 'none';
        } elseif ($action === 'unsuspend') {
            $db->table('users')->where('id', $reported['id'])->update([
                'is_suspended'      => 0,
                'suspended_at'      => null,
                'suspension_reason' => null,
                'updated_at'        => date('Y-m-d H:i:s'),
            ]);
            $actionTaken = 'none';
        }

        $db->table('user_reports')->where('id', $reportId)->update([
            'status'      => 'reviewed',
            'reviewed_by' => $adminId,
            'admin_notes' => $adminNotes,
            'action_taken' => $actionTaken,
            'updated_at'  => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Report handled successfully', 'action' => $actionTaken]);
    }

    /**
     * GET /api/v1/admin/get-edit-requests
     * Returns pending edit requests for admin review
     */
    public function getEditRequests()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $builder = $db->table('product_edit_requests r')
            ->select('r.*, p.title as original_title, p.listing_type, u.name as seller_name, u.reliability_score')
            ->join('products p', 'p.id = r.product_id', 'left')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->where('r.status', 'pending');

        if ($jwtUser['role'] === 'admin') {
            $builder->where('u.role !=', 'admin');
        }

        $requests = $builder->orderBy('r.created_at', 'DESC')
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $requests]);
    }

    /**
     * GET /api/v1/admin/get-rejection-templates
     * Returns rejection templates for admin use
     */
    public function getRejectionTemplates()
    {
        $db = \Config\Database::connect();
        $type = $this->request->getGet('type');
        $builder = $db->table('rejection_templates');
        if($type) {
            $builder->where('type', $type);
        }
        $templates = $builder->orderBy('created_at', 'DESC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $templates]);
    }

    /**
     * GET /api/v1/admin/get-product-detail/:id
     * Returns detailed product information for admin review
     */
    public function getProductDetail($id)
    {
        $db = \Config\Database::connect();
        $product = $db->table('products p')
            ->select('p.*, u.name as seller_name, u.email as seller_email, u.mobile as seller_mobile, u.seller_rating_avg, u.seller_rating_count')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->where('p.id', $id)
            ->get()->getRowArray();
        if (!$product) return $this->respond(['success' => false, 'message' => 'Not found'], 404);

        $images = $db->table('product_images')->where('product_id', $id)->get()->getResultArray();
        $product['images'] = $images;
        return $this->respond(['success' => true, 'data' => $product]);
    }

    /**
     * GET /api/v1/admin/get-edit-comparison/:id
     * Returns edit request comparison data for admin review
     */
    public function getEditComparison($id)
    {
        $db = \Config\Database::connect();
        $request = $db->table('product_edit_requests')->where('id', $id)->get()->getRowArray();
        if (!$request) return $this->respond(['success' => false, 'message' => 'Not found'], 404);

        $original = $db->table('products')->where('id', $request['product_id'])->get()->getRowArray();
        $originalImages = $db->table('product_images')->where('product_id', $request['product_id'])->get()->getResultArray();

        return $this->respond([
            'success' => true,
            'request' => $request,
            'original' => $original,
            'original_images' => $originalImages,
        ]);
    }

    /**
     * POST /api/v1/admin/approve-edit-request/:id
     * Approves and merges an edit request
     */
    public function approveEditRequest($id)
    {
        $db = \Config\Database::connect();
        $request = $db->table('product_edit_requests')->where('id', $id)->get()->getRowArray();
        if (!$request) return $this->respond(['success' => false, 'message' => 'Not found'], 404);

        $updatedData = json_decode($request['updated_data'], true) ?: [];
        $db->table('products')->where('id', $request['product_id'])->update($updatedData);

        // Handle new temp images
        $tempImages = json_decode($request['temp_images'] ?? '[]', true);
        foreach ($tempImages as $path) {
            $db->table('product_images')->insert(['product_id' => $request['product_id'], 'image_path' => $path, 'created_at' => date('Y-m-d H:i:s')]);
        }

        // Handle deleted images
        $deletedIds = json_decode($request['deleted_images_ids'] ?? '[]', true);
        if (!empty($deletedIds)) {
            $db->table('product_images')->whereIn('id', $deletedIds)->delete();
        }

        $db->table('product_edit_requests')->where('id', $id)->update(['status' => 'approved', 'updated_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Edit request approved and merged.']);
    }

    /**
     * POST /api/v1/admin/reject-edit-request/:id
     * Rejects an edit request
     */
    public function rejectEditRequest($id)
    {
        $db = \Config\Database::connect();
        $db->table('product_edit_requests')->where('id', $id)->update(['status' => 'rejected', 'updated_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Edit request rejected.']);
    }

    /**
     * GET /api/v1/admin/all-offers
     * Returns all offers on the platform
     */
    public function allOffers()
    {
        $db = \Config\Database::connect();
        $offers = $db->table('offers o')
            ->select('o.*, p.title as product_title, p.listing_type, p.original_price, ub.name as buyer_name, us.name as seller_name')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users ub', 'ub.id = o.buyer_id', 'left')
            ->join('users us', 'us.id = o.seller_id', 'left')
            ->orderBy('o.created_at', 'DESC')
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $offers]);
    }

    /**
     * GET /api/v1/admin/my-offers
     * Returns merged sent and received offers for the current admin
     */
    public function personalOffers()
    {
        $jwtUser = $this->request->jwt_user;
        $db      = \Config\Database::connect();

        // ── Received (admin is seller) – matches SellerApi::offers() ──
        $received = $db->table('offers o')
            ->select('o.*, o.offer_price as offered_price,
                p.title as product_title, p.product_number, p.listing_type, p.original_price,
                p.rental_cost as product_rental_cost, p.rental_deposit as product_rental_deposit,
                p.views_count as product_views, p.dispatch_city, p.dispatch_state,
                (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) as product_image,
                (SELECT ord.status FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != "cancelled" ORDER BY ord.created_at DESC LIMIT 1) as linked_order_status,
                u.name as buyer_name, u.mobile as buyer_mobile, u.email as buyer_email,
                u.buyer_rating_avg, u.buyer_rating_count,
                u.renter_reliability_score as buyer_reliability_score,
                cv.viewed_at as contact_viewed_at,
                "received" as perspective')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users u', 'u.id = o.buyer_id', 'left')
            ->join('contact_views cv', 'cv.user_id = o.buyer_id AND cv.product_id = o.product_id', 'left')
            ->where('o.seller_id', $jwtUser['user_id'])
            ->orderBy('o.created_at', 'DESC')
            ->get()->getResultArray();

        // ── Sent (admin is buyer) – matches BuyerApi::myOffers() ──
        $sent = $db->table('offers o')
            ->select('o.*, o.offer_price as offered_price,
                p.title as product_title, p.listing_type, p.original_price,
                (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) as product_image,
                (SELECT COUNT(*) FROM offers WHERE product_id = o.product_id AND id != o.id AND status = "accepted" AND listing_type = "sell") as is_product_sold,
                (SELECT COUNT(*) FROM offers WHERE product_id = o.product_id AND id != o.id AND status = "accepted" AND listing_type = "rent" AND rental_start_date <= o.rental_end_date AND rental_end_date >= o.rental_start_date AND p.listing_type = "rent") as is_rental_blocked,
                u.name as seller_name, u.seller_rating_avg, u.seller_rating_count,
                "sent" as perspective')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users u', 'u.id = o.seller_id', 'left')
            ->where('o.buyer_id', $jwtUser['user_id'])
            ->orderBy('o.created_at', 'DESC')
            ->get()->getResultArray();

        // Attach offer history
        $historyModel = new \App\Models\OfferHistoryModel();
        foreach ($received as &$o) { $o['history'] = $historyModel->getHistoryByOffer($o['id']); }
        foreach ($sent as &$o)     { $o['history'] = $historyModel->getHistoryByOffer($o['id']); }
        unset($o);

        // Booked dates for rental conflict detection (sent offers)
        $productIds = array_unique(array_column($sent, 'product_id'));
        $bookedDates = [];
        if (!empty($productIds)) {
            $bookedDates = $db->table('orders')
                ->whereIn('product_id', $productIds)
                ->where('order_type', 'rent')
                ->whereNotIn('status', ['cancelled', 'returned'])
                ->select('product_id, rental_start_date, rental_end_date')
                ->get()->getResultArray();
        }

        $all = array_merge($received, $sent);
        usort($all, fn($a, $b) => strcmp($b['created_at'], $a['created_at']));

        return $this->respond([
            'success'              => true,
            'data'                 => $all,
            'bookedDates'          => $bookedDates,
            'acceptanceLimitDays'  => (float) getSystemSetting('offer_acceptance_limit_days', 7),
            'ratingPeriod'         => (float) getSystemSetting('seller_rating_period_days', 7),
            'rejectionWindowHours' => (float) getSystemSetting('seller_rejection_window_hours', 24),
        ]);
    }
    public function toggleUserStatus($userId)
    {
        $db = \Config\Database::connect();
        $user = $db->table('users')->where('id', $userId)->get()->getRowArray();
        if (!$user) return $this->respond(['success' => false, 'message' => 'User not found'], 404);

        $isActive = !$user['is_blocked'] && $user['is_verified'];
        if ($isActive) {
            $db->table('users')->where('id', $userId)->update(['is_blocked' => 1]);
            $msg = 'User suspended successfully.';
        } else {
            $db->table('users')->where('id', $userId)->update(['is_blocked' => 0, 'is_verified' => 1]);
            $msg = 'User activated successfully.';
        }

        return $this->respond(['success' => true, 'message' => $msg]);
    }

    public function toggleRoleBlock($userId, $role)
    {
        $db = \Config\Database::connect();
        $user = $db->table('users')->where('id', $userId)->get()->getRowArray();
        if (!$user) return $this->respond(['success' => false, 'message' => 'User not found'], 404);

        $col = $role === 'seller' ? 'blocked_seller' : 'blocked_buyer';
        $current = $user[$col] ?? 0;
        $db->table('users')->where('id', $userId)->update([$col => $current ? 0 : 1]);

        // Side effects for blocking/unblocking seller
        if ($role === 'seller') {
            if (!$current) { // Just blocked
                $db->table('products')
                   ->where(['seller_id' => $userId, 'status' => 'approved'])
                   ->update(['status' => 'inactive']);
            } else { // Just unblocked
                $db->table('products')
                   ->where(['seller_id' => $userId, 'status' => 'inactive'])
                   ->update(['status' => 'approved']);
            }
        }

        $action = $current ? 'unblocked' : 'blocked';
        return $this->respond(['success' => true, 'message' => ucfirst($role) . " role {$action} successfully."]);
    }

    public function planCheckoutDetails(int $planId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $user = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();

        $plan = $db->table('subscription_plans')->where(['id' => $planId, 'is_active' => 1])->get()->getRowArray();
        if (!$plan) return $this->respond(['success' => false, 'message' => 'Plan not found'], 404);

        $basePrice = (float) $plan['price'];
        $chargeModel = new \App\Models\PlatformChargeModel();
        $activeCharges = $chargeModel->getActiveCharges();

        $totalCharges = 0;
        $breakdown = [];
        foreach ($activeCharges as $charge) {
            $amt = $charge['charge_type'] === 'percentage' ? ($basePrice * $charge['charge_value'] / 100) : (float)$charge['charge_value'];
            $totalCharges += $amt;
            $breakdown[] = ['name' => $charge['charge_name'], 'type' => $charge['charge_type'], 'value' => $charge['charge_value'], 'amount' => $amt];
        }

        $referralDiscount = 0;
        $referralBalance = (float)($user['referral_balance'] ?? 0);
        $hasUsed = (int)($user['has_used_referral'] ?? 0);
        $expiry = $user['referral_expires_at'] ?? null;
        if ($referralBalance > 0 && $hasUsed === 0) {
            if (!$expiry || $expiry === '' || $expiry === '0000-00-00 00:00:00' || strtotime($expiry) > time()) {
                $referralDiscount = $referralBalance;
            }
        }

        return $this->respond([
            'success' => true,
            'data' => [
                'plan' => $plan,
                'user' => ['name' => $user['name'], 'email' => $user['email'], 'mobile' => $user['mobile_number'] ?? '', 'address' => $user['address'] ?? ''],
                'charge_breakdown' => $breakdown,
                'total_charges' => $totalCharges,
                'referral_discount' => $referralDiscount,
                'total' => max(0, $basePrice + $totalCharges - $referralDiscount)
            ]
        ]);
    }

    public function applyCoupon()
    {
        $data = $this->request->getJSON(true);
        $code = strtoupper(trim($data['code'] ?? ''));
        $planId = (int)($data['plan_id'] ?? 0);
        $db = \Config\Database::connect();

        $plan = $db->table('subscription_plans')->where('id', $planId)->get()->getRowArray();
        if (!$plan) return $this->respond(['success' => false, 'message' => 'Plan not found'], 404);

        $coupon = $db->table('coupons')->where(['code' => $code, 'is_active' => 1])->get()->getRowArray();
        if (!$coupon) return $this->respond(['success' => false, 'message' => 'Invalid or expired coupon code.']);

        if ($coupon['valid_until'] && strtotime($coupon['valid_until']) < time()) return $this->respond(['success' => false, 'message' => 'Coupon has expired.']);

        if ((float)$plan['price'] < (float)$coupon['min_order_amount']) return $this->respond(['success' => false, 'message' => 'Min purchase required: ₹' . $coupon['min_order_amount']]);

        $discount = $coupon['discount_type'] === 'percentage' ? ($plan['price'] * $coupon['discount_value'] / 100) : (float)$coupon['discount_value'];
        if ($coupon['max_discount'] && $discount > $coupon['max_discount']) $discount = $coupon['max_discount'];

        return $this->respond(['success' => true, 'message' => 'Coupon applied!', 'data' => ['discount' => round($discount, 2)]]);
    }

    public function initiatePayment()
    {
        $jwtUser = $this->request->jwt_user;
        $userId = $jwtUser['user_id'];
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $planId = (int)($data['plan_id'] ?? 0);
        $couponCode = strtoupper(trim($data['coupon_code'] ?? ''));
        $callbackUrl = trim($data['callback_url'] ?? '');

        $plan = $db->table('subscription_plans')->where(['id' => $planId, 'is_active' => 1])->get()->getRowArray();
        if (!$plan) return $this->respond(['success' => false, 'message' => 'Invalid or inactive plan.'], 404);

        $basePrice = (float)$plan['price'];
        $chargeModel = new \App\Models\PlatformChargeModel();
        $totalCharges = 0;
        foreach ($chargeModel->getActiveCharges() as $c) {
            $totalCharges += $c['charge_type'] === 'percentage' ? ($basePrice * $c['charge_value'] / 100) : (float)$c['charge_value'];
        }

        $discount = 0;
        if ($couponCode) {
            $cpn = $db->table('coupons')->where(['code' => $couponCode, 'is_active' => 1])->get()->getRowArray();
            if ($cpn && $basePrice >= (float)$cpn['min_order_amount'] && (!$cpn['valid_until'] || strtotime($cpn['valid_until']) >= time())) {
                $discount = $cpn['discount_type'] === 'percentage' ? ($basePrice * $cpn['discount_value'] / 100) : (float)$cpn['discount_value'];
                if ($cpn['max_discount'] && $discount > $cpn['max_discount']) $discount = $cpn['max_discount'];
            }
        }

        $user = $db->table('users')->where('id', $userId)->get()->getRowArray();
        $referralDiscount = 0;
        if ((float)($user['referral_balance'] ?? 0) > 0 && (int)($user['has_used_referral'] ?? 0) === 0) {
            $exp = $user['referral_expires_at'] ?? null;
            if (!$exp || $exp === '0000-00-00 00:00:00' || strtotime($exp) > time()) {
                $referralDiscount = (float)$user['referral_balance'];
            }
        }

        $final = max(1, ($basePrice + $totalCharges) - $discount - $referralDiscount);
        $merchantOrderId = 'SUB-ADM-' . $userId . '-' . time();
        $redirectUrl = $callbackUrl ? str_replace('{id}', $merchantOrderId, $callbackUrl) : base_url("admin/payment-callback?id={$merchantOrderId}");

        $payload = ['merchantOrderId' => $merchantOrderId, 'amount' => (int)($final * 100), 'paymentFlow' => ['type' => 'PG_CHECKOUT', 'merchantUrls' => ['redirectUrl' => $redirectUrl]]];

        $db->table('user_subscriptions')->insert([
            'user_id' => $userId, 'plan_id' => $planId, 'starts_at' => date('Y-m-d H:i:s'), 'expires_at' => date('Y-m-d H:i:s'),
            'usage_count' => 0, 'is_active' => 0, 'payment_status' => 'pending', 'amount_paid' => $final,
            'referral_discount_applied' => $referralDiscount, 'merchant_transaction_id' => $merchantOrderId,
        ]);

        $phonepe = new \App\Libraries\PhonePe();
        $res = $phonepe->createPayment($payload);
        if (isset($res['redirectUrl'])) {
            return $this->respond(['success' => true, 'data' => ['redirect_url' => $res['redirectUrl'], 'merchant_order_id' => $merchantOrderId]]);
        }
        return $this->respond(['success' => false, 'message' => 'Payment initiation failed.']);
    }

    public function verifyPayment()
    {
        $id = $this->request->getGet('id');
        $db = \Config\Database::connect();
        $dbSub = $db->table('user_subscriptions')->where('merchant_transaction_id', $id)->get()->getRowArray();
        if (!$dbSub) return $this->respond(['status' => 'error', 'message' => 'Transaction not found'], 404);
        if ($dbSub['is_active'] == 1) return $this->respond(['status' => 'success', 'message' => 'Already active']);

        $phonepe = new \App\Libraries\PhonePe();
        $status = $phonepe->getOrderStatus($id);
        $state = $status['state'] ?? ($status['data']['state'] ?? 'PENDING');

        if ($state === 'COMPLETED') {
            $plan = $db->table('subscription_plans')->where('id', $dbSub['plan_id'])->get()->getRowArray();
            
            // Stacking/Queueing Logic: Find the latest expiry among active/future plans
            $latestActive = $db->table('user_subscriptions')
                ->where('user_id', $dbSub['user_id'])
                ->where('is_active', 1)
                ->where('expires_at >', date('Y-m-d H:i:s'))
                ->orderBy('expires_at', 'DESC')
                ->get()->getRowArray();

            $startsAt = $latestActive ? $latestActive['expires_at'] : date('Y-m-d H:i:s');
            $expiresAt = ((int) $plan['duration_hours'] > 0)
                ? date('Y-m-d H:i:s', strtotime("+{$plan['duration_hours']} hours", strtotime($startsAt)))
                : '2099-12-31 23:59:59';

            $db->table('user_subscriptions')->where('id', $dbSub['id'])->update([
                'is_active' => 1,
                'payment_status' => 'paid',
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
                'updated_at' => date('Y-m-d H:i:s')
            ]);
            
            // Sync with users table (Set to the absolute latest expiry)
            $db->table('users')->where('id', $dbSub['user_id'])->update([
                'subscription_tier' => $plan['name'],
                'subscription_expires_at' => $expiresAt,
                'updated_at' => date('Y-m-d H:i:s')
            ]);
            
            // Mark referral as used if discount was applied
            if ($dbSub['referral_discount_applied'] > 0) {
                $db->table('users')->where('id', $dbSub['user_id'])->update(['has_used_referral' => 1, 'referral_balance' => 0]);
            }
            
            $db->table('transactions')->insert([
                'user_id' => $dbSub['user_id'], 
                'type' => 'subscription', 
                'amount' => $dbSub['amount_paid'], 
                'description' => 'Subscription Stacking: ' . $plan['name'], 
                'payment_method' => 'online', 
                'payment_status' => 'completed', 
                'transaction_id'   => $status['data']['transactionId'] ?? ('ADM-' . time()),
                'created_at' => date('Y-m-d H:i:s')
            ]);
            return $this->respond(['status' => 'success', 'message' => 'Payment verified and plans stacked!']);
        }

        if ($state === 'FAILED' || $state === 'CANCELLED') {
            $db->table('user_subscriptions')->where('id', $dbSub['id'])->update([
                'payment_status' => 'failed',
                'updated_at'     => date('Y-m-d H:i:s'),
            ]);
            return $this->respond(['status' => 'failed', 'message' => 'Payment failed or was cancelled.']);
        }

        return $this->respond(['status' => 'pending', 'message' => 'Payment is being processed…', 'state' => $state]);
    }

    public function userAuditLogs($userId)
    {
        $db = \Config\Database::connect();
        $logs = $db->table('user_audit_trails a')
            ->select('a.*, u.name as admin_name')
            ->join('users u', 'u.id = a.admin_id', 'left')
            ->where('a.user_id', $userId)
            ->orderBy('a.created_at', 'DESC')
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $logs]);
    }
}
