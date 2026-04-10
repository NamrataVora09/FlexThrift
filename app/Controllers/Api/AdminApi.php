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

        $stats = [
            'total_users' => $db->table('users')->countAllResults(),
            'total_products' => $db->table('products')->countAllResults(),
            'pending_products' => $db->table('products')->where('status', 'pending')->countAllResults(),
            'approved_products' => $db->table('products')->where('status', 'approved')->countAllResults(),
            'total_orders' => $db->table('orders')->countAllResults(),
            'total_offers' => $db->table('offers')->countAllResults(),
        ];

        return $this->respond([
            'success' => true,
            'data' => ['user' => ['id' => (int) $user['id'], 'name' => $user['name'], 'role' => $jwtUser['role']], 'stats' => $stats],
        ]);
    }

    public function pendingProducts()
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => true, 'data' => []]);
        }

        $db = \Config\Database::connect();
        $products = $db->table('products p')
            ->select('p.*, u.name as seller_name, u.email as seller_email, lt.usage_label')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->join('listing_types lt', 'lt.type_name = p.listing_type_category', 'left')
            ->where('p.status', 'pending')
            ->orderBy('p.created_at', 'ASC')
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
        $db = \Config\Database::connect();
        $requests = $db->table('product_edit_requests r')
            ->select('r.*, p.title as original_title, p.listing_type, u.name as seller_name, u.reliability_score')
            ->join('products p', 'p.id = r.product_id', 'left')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->where('r.status', 'pending')
            ->orderBy('r.created_at', 'DESC')
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
                (SELECT COUNT(*) FROM offers WHERE product_id = o.product_id AND status = "accepted" AND listing_type = "sell") as is_product_sold,
                (SELECT COUNT(*) FROM offers WHERE product_id = o.product_id AND status = "accepted" AND listing_type = "rent" AND rental_start_date <= o.rental_end_date AND rental_end_date >= o.rental_start_date AND p.listing_type = "rent") as is_rental_blocked,
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

        $action = $current ? 'unblocked' : 'blocked';
        return $this->respond(['success' => true, 'message' => ucfirst($role) . " role {$action} successfully."]);
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
