<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class SuperAdminApi extends ResourceController
{
    protected $format = 'json';

    // ── Fee / Charges Management ──────────────────────
    public function platformCharges()
    {
        $db = \Config\Database::connect();
        $charges = $db->table('platform_charges')->orderBy('created_at', 'DESC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $charges]);
    }

    public function createCharge()
    {
        $db = \Config\Database::connect();
        $data = $this->request->getPost() ?: $this->request->getJSON(true) ?: [];
        if (empty($data['charge_name'])) return $this->respond(['success' => false, 'message' => 'Charge name is required.'], 400);
        $db->table('platform_charges')->insert([
            'charge_name' => $data['charge_name'],
            'charge_type' => $data['charge_type'] ?? 'percentage',
            'charge_value' => $data['charge_value'] ?? 0,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['success' => true, 'message' => 'Charge created.']);
    }

    public function updateCharge($id)
    {
        $db = \Config\Database::connect();
        $data = $this->request->getPost() ?: $this->request->getJSON(true) ?: [];
        $update = [];
        if (isset($data['charge_name'])) $update['charge_name'] = $data['charge_name'];
        if (isset($data['charge_type'])) $update['charge_type'] = $data['charge_type'];
        if (isset($data['charge_value'])) $update['charge_value'] = $data['charge_value'];
        if (isset($data['is_active'])) $update['is_active'] = $data['is_active'];
        $update['updated_at'] = date('Y-m-d H:i:s');
        $db->table('platform_charges')->where('id', $id)->update($update);
        return $this->respond(['success' => true, 'message' => 'Charge updated.']);
    }

    public function deleteCharge($id)
    {
        $db = \Config\Database::connect();
        $db->table('platform_charges')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Charge deleted.']);
    }

    // ── Pricing Rules ─────────────────────────────────
    public function allPricingRules()
    {
        $db = \Config\Database::connect();
        $rules = $db->table('pricing_rules')->orderBy('filter_type', 'ASC')->orderBy('filter_label', 'ASC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $rules]);
    }

    public function allRentalPricingRules()
    {
        $db = \Config\Database::connect();
        $rules = $db->table('rental_pricing_rules')->orderBy('filter_type', 'ASC')->orderBy('filter_label', 'ASC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $rules]);
    }

    private function resolveFilterLabel(string $filterType, int $filterValue): string
    {
        $db = \Config\Database::connect();
        if ($filterType === 'listing_type') {
            $row = $db->table('listing_types')->where('id', $filterValue)->get()->getRowArray();
            return $row['type_name'] ?? 'Unknown';
        } elseif ($filterType === 'category') {
            $row = $db->table('categories')->where('id', $filterValue)->get()->getRowArray();
            return $row['category_name'] ?? 'Unknown';
        } elseif ($filterType === 'sub_category') {
            $row = $db->table('sub_categories')->where('id', $filterValue)->get()->getRowArray();
            return $row['name'] ?? 'Unknown';
        }
        return '';
    }

    public function savePricingRule()
    {
        $db = \Config\Database::connect();
        $data = $this->request->getPost() ?: $this->request->getJSON(true) ?: [];
        $id = $data['id'] ?? null;
        $filterType = $data['filter_type'] ?? '';
        $filterValue = (int) ($data['filter_value'] ?? 0);
        $filterLabel = $this->resolveFilterLabel($filterType, $filterValue);

        $row = [
            'filter_type'            => $filterType,
            'filter_value'           => $filterValue,
            'filter_label'           => $filterLabel,
            'deduction_threshold'    => (float) ($data['deduction_threshold'] ?? 0),
            'depreciation_range_min' => (int) ($data['depreciation_range_min'] ?? 0),
            'depreciation_range_max' => (int) ($data['depreciation_range_max'] ?? 0),
            'depreciation_amount'    => (float) ($data['depreciation_amount'] ?? 0),
            'is_active'              => 1,
        ];

        if ($id) {
            $existing = $this->checkOverlappingRules('pricing_rules', $filterType, $filterValue, $row['depreciation_range_min'], $row['depreciation_range_max'], $id);
            if ($existing) {
                return $this->respond(['success' => false, 'message' => "Overlap detected with existing rule (Range: {$existing['depreciation_range_min']} - " . ($existing['depreciation_range_max'] > 0 ? $existing['depreciation_range_max'] : '∞') . ")"], 400);
            }
            $db->table('pricing_rules')->where('id', $id)->update($row);
            return $this->respond(['success' => true, 'message' => 'Pricing rule updated', 'id' => $id]);
        } else {
            $existing = $this->checkOverlappingRules('pricing_rules', $filterType, $filterValue, $row['depreciation_range_min'], $row['depreciation_range_max']);
            if ($existing) {
                return $this->respond(['success' => false, 'message' => "Overlap detected with existing rule (Range: {$existing['depreciation_range_min']} - " . ($existing['depreciation_range_max'] > 0 ? $existing['depreciation_range_max'] : '∞') . ")"], 400);
            }

            // Sync deduction_threshold across all existing rows in the same filter group
            $db->table('pricing_rules')
               ->where('filter_type', $filterType)
               ->where('filter_value', $filterValue)
               ->update(['deduction_threshold' => $row['deduction_threshold']]);

            $db->table('pricing_rules')->insert($row);
            $row['id'] = $db->insertID();
            return $this->respond(['success' => true, 'message' => 'Pricing rule created', 'id' => $row['id'], 'data' => $row]);
        }
    }

    private function checkOverlappingRules($table, $filterType, $filterValue, $min, $max, $excludeId = null)
    {
        $db = \Config\Database::connect();
        $builder = $db->table($table)
            ->where('filter_type', $filterType)
            ->where('filter_value', $filterValue);

        if ($excludeId) {
            $builder->where('id !=', $excludeId);
        }

        $maxVal = (int) $max;
        $minVal = (int) $min;

        // Overlap if: (new_min <= existing_max OR existing_max == 0) AND (existing_min <= new_max OR new_max == 0)
        $builder->groupStart();
            $builder->groupStart()
                ->where('depreciation_range_max >=', $minVal)
                ->orWhere('depreciation_range_max', 0)
            ->groupEnd();

            if ($maxVal > 0) {
                $builder->where('depreciation_range_min <=', $maxVal);
            }
        $builder->groupEnd();

        return $builder->get()->getRowArray();
    }


    public function deletePricingRule($id)
    {
        $db = \Config\Database::connect();
        $db->table('pricing_rules')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Pricing rule deleted']);
    }

    public function togglePricingRule($id)
    {
        $model = new \App\Models\PricingRuleModel();
        $rule = $model->find((int) $id);
        if (!$rule) return $this->respond(['success' => false, 'message' => 'Rule not found'], 404);
        $newStatus = $rule['is_active'] ? 0 : 1;
        $model->update((int) $id, ['is_active' => $newStatus]);
        return $this->respond(['success' => true, 'message' => 'Rule toggled', 'is_active' => $newStatus]);
    }

    public function saveRentalPricingRule()
    {
        $db = \Config\Database::connect();
        $data = $this->request->getPost() ?: $this->request->getJSON(true) ?: [];
        $id = $data['id'] ?? null;
        $filterType = $data['filter_type'] ?? '';
        $filterValue = (int) ($data['filter_value'] ?? 0);
        $filterLabel = $this->resolveFilterLabel($filterType, $filterValue);

        $row = [
            'filter_type'                  => $filterType,
            'filter_value'                 => $filterValue,
            'filter_label'                 => $filterLabel,
            'deposit_deduction_threshold'  => (float) ($data['deposit_deduction_threshold'] ?? 0),
            'depreciation_range_min'       => (int) ($data['depreciation_range_min'] ?? 0),
            'depreciation_range_max'       => (int) ($data['depreciation_range_max'] ?? 0),
            'depreciation_amount'          => (float) ($data['depreciation_amount'] ?? 0),
            'deposit_percentage'           => (float) ($data['deposit_percentage'] ?? 0),
            'max_cost_cap_per_day'         => (float) ($data['max_cost_cap_per_day'] ?? 0),
            'is_active'                    => 1,
        ];

        if ($id) {
            $existing = $this->checkOverlappingRules('rental_pricing_rules', $filterType, $filterValue, $row['depreciation_range_min'], $row['depreciation_range_max'], $id);
            if ($existing) {
                return $this->respond(['success' => false, 'message' => "Overlap detected with existing rule (Range: {$existing['depreciation_range_min']} - " . ($existing['depreciation_range_max'] > 0 ? $existing['depreciation_range_max'] : '∞') . ")"], 400);
            }
            $db->table('rental_pricing_rules')->where('id', $id)->update($row);
            return $this->respond(['success' => true, 'message' => 'Rental rule updated', 'id' => $id]);
        } else {
            $existing = $this->checkOverlappingRules('rental_pricing_rules', $filterType, $filterValue, $row['depreciation_range_min'], $row['depreciation_range_max']);
            if ($existing) {
                return $this->respond(['success' => false, 'message' => "Overlap detected with existing rule (Range: {$existing['depreciation_range_min']} - " . ($existing['depreciation_range_max'] > 0 ? $existing['depreciation_range_max'] : '∞') . ")"], 400);
            }
            $db->table('rental_pricing_rules')->insert($row);
            $row['id'] = $db->insertID();
            return $this->respond(['success' => true, 'message' => 'Rental rule created', 'id' => $row['id'], 'data' => $row]);
        }
    }

    public function deleteRentalPricingRule($id)
    {
        $db = \Config\Database::connect();
        $db->table('rental_pricing_rules')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Rental rule deleted']);
    }

    public function toggleRentalPricingRule($id)
    {
        $model = new \App\Models\RentalPricingRuleModel();
        $rule = $model->find((int) $id);
        if (!$rule) return $this->respond(['success' => false, 'message' => 'Rule not found'], 404);
        $newStatus = $rule['is_active'] ? 0 : 1;
        $model->update((int) $id, ['is_active' => $newStatus]);
        return $this->respond(['success' => true, 'message' => 'Rental rule toggled', 'is_active' => $newStatus]);
    }

    public function bulkDeletePricingRules()
    {
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?: $this->request->getPost() ?: [];
        $type = $data['type'] ?? 'sale';
        $table = ($type === 'rental') ? 'rental_pricing_rules' : 'pricing_rules';

        $db->query("DELETE FROM `{$table}`");

        return $this->respond(['success' => true, 'message' => 'All ' . $type . ' rules deleted']);
    }

    public function bulkTogglePricingRules()
    {
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?: $this->request->getPost() ?: [];
        $type = $data['type'] ?? 'sale';
        $action = $data['action'] ?? 'activate';
        $newStatus = ($action === 'deactivate') ? 0 : 1;
        $table = ($type === 'rental') ? 'rental_pricing_rules' : 'pricing_rules';

        $db->query("UPDATE `{$table}` SET `is_active` = {$newStatus}");

        return $this->respond(['success' => true, 'message' => 'All ' . $type . ' rules ' . ($newStatus ? 'activated' : 'deactivated')]);
    }

    // ── Rejection Templates ───────────────────────────
    public function getRejectionTemplates()
    {
        $db = \Config\Database::connect();
        $type = $this->request->getGet('type');
        $builder = $db->table('rejection_templates');
        if ($type) {
            $builder->where('type', $type);
        }
        $templates = $builder->orderBy('created_at', 'DESC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $templates]);
    }

    public function addRejectionTemplate()
    {
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?: $this->request->getPost() ?: [];
        $text = trim($data['template_text'] ?? '');
        $type = $data['type'] ?? 'Products';
        if (empty($text)) return $this->respond(['success' => false, 'message' => 'Template text is required'], 400);
        $db->table('rejection_templates')->insert([
            'template_text' => $text,
            'type'          => $type,
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['success' => true, 'message' => 'Template added', 'id' => $db->insertID()]);
    }

    public function updateRejectionTemplate($id)
    {
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?: $this->request->getPost() ?: [];
        $text = trim($data['template_text'] ?? '');
        $type = $data['type'] ?? 'Products';
        if (empty($text)) return $this->respond(['success' => false, 'message' => 'Template text is required'], 400);
        $db->table('rejection_templates')->where('id', (int)$id)->update([
            'template_text' => $text,
            'type'          => $type,
            'updated_at'    => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['success' => true, 'message' => 'Template updated']);
    }

    public function deleteRejectionTemplate($id)
    {
        $db = \Config\Database::connect();
        $db->table('rejection_templates')->where('id', (int)$id)->delete();
        return $this->respond(['success' => true, 'message' => 'Template deleted']);
    }

    // ── Offers ────────────────────────────────────────
    public function allOffers()
    {
        $db = \Config\Database::connect();
        $offers = $db->query("
            SELECT o.*,
                p.title as product_title, p.listing_type, p.original_price, p.product_number,
                p.dispatch_city, p.dispatch_state,
                (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) as product_image,
                ub.name as buyer_name, ub.email as buyer_email, ub.mobile as buyer_mobile,
                ub.buyer_rating_avg, ub.buyer_rating_count,
                us.name as seller_name, us.email as seller_email, us.mobile as seller_mobile,
                us.seller_rating_avg, us.seller_rating_count,
                (SELECT ord.id            FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as order_id,
                (SELECT ord.order_number  FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as order_number,
                (SELECT ord.status        FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as order_status,
                (SELECT ord.payment_status FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as payment_status,
                (SELECT ord.final_price   FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as order_amount,
                (SELECT ord.deposit_amount FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as order_deposit,
                (SELECT ord.delivery_type  FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as delivery_type,
                (SELECT ord.self_delivery  FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as self_delivery,
                (SELECT ord.delivery_address FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as order_delivery_address,
                (SELECT ord.delivery_pin_code FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as order_delivery_pin_code,
                (SELECT ord.dispatched_at  FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as dispatched_at,
                (SELECT ord.delivery_date  FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as delivery_date,
                (SELECT ord.return_date    FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as return_date,
                (SELECT ord.delivery_photo FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != 'cancelled' ORDER BY ord.created_at DESC LIMIT 1) as delivery_photo
            FROM offers o
            LEFT JOIN products p ON p.id = o.product_id
            LEFT JOIN users ub ON ub.id = o.buyer_id
            LEFT JOIN users us ON us.id = o.seller_id
            ORDER BY o.created_at DESC
        ")->getResultArray();
        return $this->respond(['success' => true, 'data' => $offers]);
    }

    /**
     * GET /api/v1/superadmin/personal-offers
     * Returns merged sent and received offers for the current superadmin
     * with full rich data matching PHP seller/buyer views
     */
    public function personalOffers()
    {
        $jwtUser = $this->request->jwt_user;
        $db      = \Config\Database::connect();

        // ── Received (superadmin is seller) – matches SellerApi::offers() ──
        $received = $db->table('offers o')
            ->select('o.*, o.offer_price as offered_price,
                p.title as product_title, p.product_number, p.listing_type, p.original_price,
                p.rental_cost as product_rental_cost, p.rental_deposit as product_rental_deposit,
                p.views_count as product_views, p.dispatch_city, p.dispatch_state,
                (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) as product_image,
                (SELECT ord.status FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != \'cancelled\' ORDER BY ord.created_at DESC LIMIT 1) as linked_order_status,
                u.name as buyer_name, u.mobile as buyer_mobile, u.email as buyer_email,
                u.buyer_rating_avg, u.buyer_rating_count,
                u.renter_reliability_score as buyer_reliability_score,
                (SELECT MAX(cv.viewed_at) FROM contact_views cv WHERE cv.user_id = o.buyer_id AND cv.product_id = o.product_id) as contact_viewed_at,
                \'received\' as perspective')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users u', 'u.id = o.buyer_id', 'left')
            ->where('o.seller_id', $jwtUser['user_id'])
            ->orderBy('o.created_at', 'DESC')
            ->get()->getResultArray();

        // ── Sent (superadmin is buyer) – matches BuyerApi::myOffers() ──
        $sent = $db->table('offers o')
            ->select('o.*, o.offer_price as offered_price,
                p.title as product_title, p.listing_type, p.original_price,
                (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) as product_image,
                (SELECT COUNT(*) FROM offers WHERE product_id = o.product_id AND id != o.id AND status = \'accepted\' AND listing_type = \'sell\') as is_product_sold,
                (SELECT COUNT(*) FROM offers WHERE product_id = o.product_id AND id != o.id AND status = \'accepted\' AND listing_type = \'rent\' AND rental_start_date <= o.rental_end_date AND rental_end_date >= o.rental_start_date AND p.listing_type = \'rent\') as is_rental_blocked,
                u.name as seller_name, u.seller_rating_avg, u.seller_rating_count,
                \'sent\' as perspective')
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

    public function dashboard()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $user = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();

        $stats = [
            'total_users' => $db->table('users')->countAllResults(),
            'buyers' => $db->table('users')->where('user_type', 'buyer')->whereNotIn('role', ['admin', 'super_admin'])->countAllResults(),
            'sellers' => $db->table('users')->where('user_type', 'seller')->whereNotIn('role', ['admin', 'super_admin'])->countAllResults(),
            'both' => $db->table('users')->where('user_type', 'both')->whereNotIn('role', ['admin', 'super_admin'])->countAllResults(),
            'delivery' => $db->table('users')->where('user_type', 'delivery')->countAllResults(),
            'admins' => $db->table('users')->where('role', 'admin')->countAllResults(),
            'total_products' => $db->table('products')->countAllResults(),
            'pending_products' => $db->table('products')->where('status', 'pending')->countAllResults(),
            'approved_products' => $db->table('products')->where('status', 'approved')->countAllResults(),
            'total_offers' => $db->table('offers')->countAllResults(),
            'pending_offers' => $db->table('offers')->where('status', 'pending')->countAllResults(),
            'accepted_offers' => $db->table('offers')->where('status', 'accepted')->countAllResults(),
        ];

        // Registration chart (last 30 days)
        $registrations = $db->query("
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        ")->getResultArray();

        // User distribution for doughnut chart
        $userDistribution = [
            'labels' => ['Buyers', 'Sellers', 'Both', 'Admins'],
            'data' => [$stats['buyers'], $stats['sellers'], $stats['both'], $stats['admins']],
        ];

        // Recent registrations (last 10 users)
        $recentUsers = $db->table('users')
            ->select('id, name, email, user_type, created_at')
            ->orderBy('created_at', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        // Platform activity (last 10 audit entries)
        $activities = $db->table('user_audit_trails a')
            ->select('a.action_type, a.action_details, a.created_at, u.name as user_name')
            ->join('users u', 'u.id = a.user_id', 'left')
            ->orderBy('a.created_at', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        foreach ($activities as &$act) {
            $details = json_decode($act['action_details'], true);
            $summary = 'Activity logged';
            if (is_array($details)) {
                if (isset($details['details']) && is_string($details['details'])) {
                    $summary = $details['details'];
                } elseif (isset($details['changes']) && is_array($details['changes'])) {
                    $summary = 'Updated ' . count($details['changes']) . ' system settings';
                } elseif (isset($details['role'])) {
                    $summary = 'Role: ' . $details['role'];
                } else {
                    $summary = strtoupper(str_replace('_', ' ', $act['action_type']));
                }
            } else {
                $summary = $act['action_details'] ?? $summary;
            }
            $act['display_summary'] = $summary;
        }
        unset($act);

        return $this->respond([
            'success' => true,
            'data' => [
                'user' => ['id' => (int) $user['id'], 'name' => $user['name'], 'role' => $jwtUser['role']],
                'stats' => $stats,
                'registrations' => $registrations,
                'userDistribution' => $userDistribution,
                'recentUsers' => $recentUsers,
                'activities' => $activities,
            ],
        ]);
    }

    public function users()
    {
        $db = \Config\Database::connect();
        $search = $this->request->getGet('search');
        $type = $this->request->getGet('type');
        $status = $this->request->getGet('status');

        $builder = $db->table('users')
            ->select('id, name, email, mobile, user_type, role, is_blocked, is_verified, reliability_score, buyer_rating_avg, buyer_rating_count, seller_rating_avg, seller_rating_count, blocked_seller, blocked_buyer, created_at');

        if ($search) {
            $builder->groupStart()
                ->like('name', $search)
                ->orLike('email', $search)
                ->orLike('mobile', $search)
                ->groupEnd();
        }

        if ($type && $type !== 'all') {
            $builder->where('user_type', $type);
        }

        if ($status === 'active') {
            $builder->where('is_blocked', 0)->where('is_verified', 1);
        } elseif ($status === 'suspended') {
            $builder->where('is_blocked', 1);
        } elseif ($status === 'unverified') {
            $builder->where('is_verified', 0)->where('is_blocked', 0);
        }

        $users = $builder->whereNotIn('role', ['admin', 'super_admin'])->orderBy('created_at', 'DESC')->get()->getResultArray();

        // Attach product count per user
        foreach ($users as &$u) {
            $u['products_uploaded_count'] = $db->table('products')->where('seller_id', $u['id'])->countAllResults();
        }
        unset($u);

        return $this->respond(['success' => true, 'data' => $users]);
    }

    public function admins()
    {
        $db = \Config\Database::connect();
        $search = $this->request->getGet('search');
        $status = $this->request->getGet('status');

        $builder = $db->table('users')
            ->select('id, name, email, mobile, role, is_blocked, is_verified, blocked_from_approvals, blocked_from_user_management, blocked_seller, blocked_buyer, created_at')
            ->where('role', 'admin');

        if ($search) {
            $builder->groupStart()
                ->like('name', $search)
                ->orLike('email', $search)
                ->orLike('mobile', $search)
                ->groupEnd();
        }

        if ($status === 'active') {
            $builder->where('is_blocked', 0)->where('is_verified', 1);
        } elseif ($status === 'suspended') {
            $builder->where('is_blocked', 1);
        } elseif ($status === 'unverified') {
            $builder->where('is_verified', 0)->where('is_blocked', 0);
        }

        $admins = $builder->orderBy('created_at', 'DESC')->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $admins]);
    }

    public function createAdmin()
    {
        $db = \Config\Database::connect();
        
        // Support both JSON and Post data
        $json = $this->request->getJSON(true);
        $name = $json['name'] ?? $this->request->getPost('name');
        $email = $json['email'] ?? $this->request->getPost('email');
        $mobile = $json['mobile'] ?? $this->request->getPost('mobile');
        $password = $json['password'] ?? $this->request->getPost('password');

        if (!$name || !$email || !$password) {
            return $this->respond(['success' => false, 'message' => 'Name, email and password are required.'], 400);
        }

        $exists = $db->table('users')->where('email', $email)->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Email already exists.'], 400);
        }

        $db->table('users')->insert([
            'name' => $name,
            'email' => $email,
            'mobile' => $mobile,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'user_type' => 'buyer',
            'role' => 'admin',
            'is_verified' => 1,
            'reliability_score' => 0,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Admin created successfully.']);
    }

    public function toggleAdminStatus($id)
    {
        $db = \Config\Database::connect();
        $admin = $db->table('users')->where('id', $id)->where('role', 'admin')->get()->getRowArray();
        if (!$admin) return $this->respond(['success' => false, 'message' => 'Admin not found.'], 404);

        $newBlocked = $admin['is_blocked'] ? 0 : 1;
        $db->table('users')->where('id', $id)->update(['is_blocked' => $newBlocked]);

        return $this->respond(['success' => true, 'message' => $newBlocked ? 'Admin suspended.' : 'Admin activated.']);
    }

    public function deleteAdmin($id)
    {
        $db = \Config\Database::connect();
        $admin = $db->table('users')->where('id', $id)->where('role', 'admin')->get()->getRowArray();
        if (!$admin) return $this->respond(['success' => false, 'message' => 'Admin not found.'], 404);

        $db->table('users')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Admin deleted successfully.']);
    }

    public function toggleAdminRights($id, $type)
    {
        $db = \Config\Database::connect();
        
        // Map type to column name
        $columnMap = [
            'approval' => 'blocked_from_approvals',
            'user_mgmt' => 'blocked_from_user_management',
            'seller' => 'blocked_seller',
            'buyer' => 'blocked_buyer',
        ];
        
        $col = $columnMap[$type] ?? null;
        if (!$col) return $this->respond(['success' => false, 'message' => 'Invalid type.'], 400);
        
        $admin = $db->table('users')->where('id', $id)->get()->getRowArray();
        if (!$admin) return $this->respond(['success' => false, 'message' => 'Admin not found.'], 404);

        $current = $admin[$col] ?? 0;
        $newValue = $current ? 0 : 1;
        $db->table('users')->where('id', $id)->update([$col => $newValue]);

        return $this->respond(['success' => true, 'message' => 'Rights updated successfully.']);
    }

    public function bulkToggleAdminRights()
    {
        $db = \Config\Database::connect();
        $type = $this->request->getPost('type');
        $action = $this->request->getPost('action');

        $col = $type === 'approval' ? 'blocked_from_approvals' : 'blocked_from_user_management';
        $value = $action === 'revoke' ? 1 : 0;

        $db->table('users')->where('role', 'admin')->update([$col => $value]);
        $typeLabel = $type === 'approval' ? 'Approval' : 'User management';
        $actionLabel = $action === 'grant' ? 'granted to' : 'revoked from';

        return $this->respond(['success' => true, 'message' => "{$typeLabel} rights {$actionLabel} all administrators."]);
    }

    // ── Taxonomy CRUD ──────────────────────────────────
    public function addListingType()
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('name');
        $gender = $this->request->getPost('gender_config') ?? 'optional';
        if (!$name) return $this->respond(['success' => false, 'message' => 'Name is required.'], 400);
        $usageLabel = $this->request->getPost('usage_label') ?? 'Times Used';
        $data = [
            'type_name' => $name,
            'usage_label' => $usageLabel,
            'field_config' => json_encode(['gender' => $gender]),
            'created_at' => date('Y-m-d H:i:s'),
        ];
        $file = $this->request->getFile('image');
        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $path = FCPATH . 'uploads/listing-types/';
            if (!is_dir($path)) mkdir($path, 0777, true);
            $file->move($path, $newName);
            $data['image'] = 'uploads/listing-types/' . $newName;
        }
        $db->table('listing_types')->insert($data);
        return $this->respond(['success' => true, 'message' => 'Listing type added.']);
    }

    public function addGender()
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('name');
        if (!$name) return $this->respond(['success' => false, 'message' => 'Name is required.'], 400);
        $db->table('genders')->insert(['name' => $name, 'created_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Gender added.']);
    }

    public function addProductType()
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('name');
        $ltId = $this->request->getPost('listing_type_id');
        if (!$name || !$ltId) return $this->respond(['success' => false, 'message' => 'Name and listing type are required.'], 400);
        $db->table('product_types')->insert(['name' => $name, 'listing_type_id' => $ltId, 'created_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Product type added.']);
    }

    public function addCategory()
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('category_name');
        $ptIds = $this->request->getPost('product_type_ids') ?? [];
        $appliesTo = $this->request->getPost('applies_to') ?? [];
        if (!$name) return $this->respond(['success' => false, 'message' => 'Name is required.'], 400);
        $db->table('categories')->insert([
            'category_name' => $name,
            'product_type_ids' => json_encode($ptIds),
            'applies_to' => json_encode($appliesTo),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['success' => true, 'message' => 'Category added.']);
    }

    public function addSubCategory()
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('name');
        $catIds = $this->request->getPost('category_ids') ?? [];
        $appliesTo = $this->request->getPost('applies_to') ?? [];
        if (!$name) return $this->respond(['success' => false, 'message' => 'Name is required.'], 400);
        $db->table('sub_categories')->insert([
            'name' => $name,
            'category_ids' => json_encode($catIds),
            'applies_to' => json_encode($appliesTo),
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        return $this->respond(['success' => true, 'message' => 'Sub-category added.']);
    }

    public function addColor()
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('name');
        $hex = $this->request->getPost('hex_code');
        if (!$name) return $this->respond(['success' => false, 'message' => 'Name is required.'], 400);
        $db->table('colors')->insert(['name' => $name, 'hex_code' => $hex ?? '#000000', 'created_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Color added.']);
    }

    public function updateListingType($id)
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('type_name') ?? $this->request->getPost('name');
        $gender = $this->request->getPost('gender_config') ?? 'optional';
        $attrs = $this->request->getPost('attributes');
        $config = ['gender' => $gender];
        if ($attrs) $config['attributes'] = json_decode($attrs, true) ?: [];
        $usageLabel = $this->request->getPost('usage_label') ?? 'Times Used';
        $data = ['type_name' => $name, 'usage_label' => $usageLabel, 'field_config' => json_encode($config)];
        $file = $this->request->getFile('image');
        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $path = FCPATH . 'uploads/listing-types/';
            if (!is_dir($path)) mkdir($path, 0777, true);
            $file->move($path, $newName);
            $data['image'] = 'uploads/listing-types/' . $newName;
        }
        $db->table('listing_types')->where('id', $id)->update($data);
        return $this->respond(['success' => true, 'message' => 'Listing type updated.']);
    }

    public function updateGender($id)
    {
        $db = \Config\Database::connect();
        $db->table('genders')->where('id', $id)->update(['name' => $this->request->getPost('name')]);
        return $this->respond(['success' => true, 'message' => 'Gender updated.']);
    }

    public function updateProductType($id)
    {
        $db = \Config\Database::connect();
        $db->table('product_types')->where('id', $id)->update([
            'name' => $this->request->getPost('name'),
            'listing_type_id' => $this->request->getPost('listing_type_id'),
        ]);
        return $this->respond(['success' => true, 'message' => 'Product type updated.']);
    }

    public function updateCategory($id)
    {
        $db = \Config\Database::connect();
        $ptIds = $this->request->getPost('product_type_ids') ?? [];
        $appliesTo = $this->request->getPost('applies_to') ?? [];
        $attrs = $this->request->getPost('attributes');
        $data = [
            'category_name' => $this->request->getPost('category_name'),
            'product_type_ids' => json_encode($ptIds),
            'product_type_id' => !empty($ptIds) ? $ptIds[0] : null,
            'applies_to' => json_encode($appliesTo),
        ];
        if ($attrs !== null) {
            $data['field_config'] = json_encode(['attributes' => json_decode($attrs, true) ?: []]);
        }
        $db->table('categories')->where('id', $id)->update($data);
        return $this->respond(['success' => true, 'message' => 'Category updated.']);
    }

    public function updateSubCategory($id)
    {
        $db = \Config\Database::connect();
        $catIds = $this->request->getPost('category_ids') ?? [];
        $appliesTo = $this->request->getPost('applies_to') ?? [];
        $attrs = $this->request->getPost('attributes');
        $data = [
            'name' => $this->request->getPost('name'),
            'category_ids' => json_encode($catIds),
            'category_id' => !empty($catIds) ? $catIds[0] : null,
            'applies_to' => json_encode($appliesTo),
        ];
        if ($attrs !== null) {
            $data['field_config'] = json_encode(['attributes' => json_decode($attrs, true) ?: []]);
        }
        $db->table('sub_categories')->where('id', $id)->update($data);
        return $this->respond(['success' => true, 'message' => 'Sub-category updated.']);
    }

    public function updateColor($id)
    {
        $db = \Config\Database::connect();
        $db->table('colors')->where('id', $id)->update([
            'name' => $this->request->getPost('name'),
            'hex_code' => $this->request->getPost('hex_code'),
        ]);
        return $this->respond(['success' => true, 'message' => 'Color updated.']);
    }

    public function removeTaxonomy($table, $id)
    {
        $allowed = ['listing_types', 'genders', 'product_types', 'categories', 'sub_categories', 'colors'];
        if (!in_array($table, $allowed)) return $this->respond(['success' => false, 'message' => 'Invalid table.'], 400);
        $db = \Config\Database::connect();
        $db->table($table)->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Item deleted.']);
    }

    // ── Original Brands (Industry Giants) ─────────────────────────
    public function originalBrandsList()
    {
        $db = \Config\Database::connect();
        $brands = $db->table('orignal_brands')
            ->select('*')
            ->orderBy('created_at', 'DESC')
            ->get()->getResultArray();

        foreach ($brands as &$b) {
            $listingTypeNames = [];
            if (!empty($b['listing_type_ids'])) {
                try {
                    $ltIds = json_decode($b['listing_type_ids'], true);
                    if (is_array($ltIds)) {
                        foreach ($ltIds as $ltId) {
                            $lt = $db->table('listing_types')->where('id', $ltId)->select('type_name')->get()->getRowArray();
                            if ($lt) $listingTypeNames[] = $lt['type_name'];
                        }
                    }
                } catch (\Exception $e) {}
            }
            if (empty($listingTypeNames) && !empty($b['listing_type_id'])) {
                $lt = $db->table('listing_types')->where('id', $b['listing_type_id'])->select('type_name')->get()->getRowArray();
                if ($lt) $listingTypeNames[] = $lt['type_name'];
            }
            $b['listing_type_names'] = $listingTypeNames;
            $b['listing_type_ids'] = !empty($b['listing_type_ids']) ? json_decode($b['listing_type_ids'], true) : [];
        }

        return $this->respond(['success' => true, 'data' => $brands]);
    }

    // ── Seller Brands (Individual Shops) ──────────────────────────
    public function sellerBrands()
    {
        $db = \Config\Database::connect();
        $brands = $db->table('brands b')
            ->select('b.*, u.name as seller_name, u.mobile as seller_mobile, lt.type_name as listing_type_name')
            ->join('users u', 'u.id = b.seller_id', 'left')
            ->join('listing_types lt', 'lt.id = b.listing_type_id', 'left')
            ->orderBy('b.created_at', 'DESC')
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $brands]);
    }

    public function createSellerBrand()
    {
        $db = \Config\Database::connect();
        $data = [
            'brand_name' => $this->request->getPost('brand_name'),
            'seller_id' => $this->request->getPost('seller_id'),
            'listing_type_id' => $this->request->getPost('listing_type_id'),
            'description' => $this->request->getPost('description') ?? '',
            'created_by_admin' => 1,
            'created_at' => date('Y-m-d H:i:s'),
        ];
        if (!$data['brand_name'] || !$data['seller_id']) {
            return $this->respond(['success' => false, 'message' => 'Brand name and Seller are required.'], 400);
        }
        $db->table('brands')->insert($data);
        return $this->respond(['success' => true, 'message' => 'Seller brand created and assigned.']);
    }

    public function updateSellerBrand($id)
    {
        $db = \Config\Database::connect();
        $data = [];
        $name = $this->request->getPost('brand_name');
        if ($name) $data['brand_name'] = $name;
        $sellerId = $this->request->getPost('seller_id');
        if ($sellerId !== null) $data['seller_id'] = $sellerId ?: null;
        $ltId = $this->request->getPost('listing_type_id');
        if ($ltId !== null) $data['listing_type_id'] = $ltId ?: null;
        $desc = $this->request->getPost('description');
        if ($desc !== null) $data['description'] = $desc;
        $isBlocked = $this->request->getPost('is_blocked');
        if ($isBlocked !== null) $data['is_blocked'] = $isBlocked;

        if (empty($data)) return $this->respond(['success' => false, 'message' => 'No data to update.'], 400);
        $db->table('brands')->where('id', $id)->update($data);
        return $this->respond(['success' => true, 'message' => 'Seller brand updated.']);
    }

    public function deleteSellerBrand($id)
    {
        $db = \Config\Database::connect();
        $db->table('products')->where('brand_id', $id)->update(['brand_id' => null]);
        $db->table('brands')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Seller brand deleted.']);
    }

    public function createBrand()
    {
        $db = \Config\Database::connect();
        $data = [
            'brand_name' => $this->request->getPost('brand_name'),
            'seller_id' => $this->request->getPost('seller_id'),
            'description' => $this->request->getPost('description') ?? '',
            'created_at' => date('Y-m-d H:i:s'),
        ];
        $ltId = $this->request->getPost('listing_type_id');
        if ($ltId) $data['listing_type_id'] = $ltId;
        $db->table('orignal_brands')->insert($data);
        return $this->respond(['success' => true, 'message' => 'Brand created successfully.']);
    }

    public function updateBrand($id)
    {
        $db = \Config\Database::connect();
        $data = [];
        $name = $this->request->getPost('brand_name');
        if ($name) $data['brand_name'] = $name;
        $sellerId = $this->request->getPost('seller_id');
        if ($sellerId !== null) $data['seller_id'] = $sellerId ?: null;
        $ltId = $this->request->getPost('listing_type_id');
        if ($ltId !== null) $data['listing_type_id'] = $ltId ?: null;
        $desc = $this->request->getPost('description');
        if ($desc !== null) $data['description'] = $desc;
        if (empty($data)) return $this->respond(['success' => false, 'message' => 'No data to update.'], 400);
        $db->table('orignal_brands')->where('id', $id)->update($data);
        return $this->respond(['success' => true, 'message' => 'Brand updated.']);
    }

    public function deleteOriginalBrandLegacy($id)
    {
        $db = \Config\Database::connect();
        $db->table('products')->where('orignal_brand_id', $id)->update(['orignal_brand_id' => null]);
        $db->table('orignal_brands')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Original brand deleted.']);
    }

    public function deactivateOriginalBrand($id)
    {
        $db = \Config\Database::connect();
        $db->table('orignal_brands')->where('id', $id)->update(['is_active' => 0]);
        return $this->respond(['success' => true, 'message' => 'Original brand deactivated.']);
    }

    public function activateOriginalBrand($id)
    {
        $db = \Config\Database::connect();
        $db->table('orignal_brands')->where('id', $id)->update(['is_active' => 1]);
        return $this->respond(['success' => true, 'message' => 'Original brand activated.']);
    }

    public function blockOriginalBrand($id)
    {
        $db = \Config\Database::connect();
        $reason = trim($this->request->getPost('reason') ?? '');
        if (!$reason) $reason = 'Brand Blocked';
        
        $db->table('orignal_brands')->where('id', $id)->update([
            'is_blocked' => 1,
            'rejection_reason' => $reason
        ]);
        
        // Reject all products of that original brand
        $db->table('products')
            ->where('orignal_brand_id', $id)
            ->update([
                'status' => 'rejected', 
                'admin_remarks' => 'Original Brand Blocked: ' . $reason
            ]);
            
        return $this->respond(['success' => true, 'message' => 'Original brand blocked.']);
    }

    public function unblockOriginalBrand($id)
    {
        $db = \Config\Database::connect();
        $db->table('orignal_brands')->where('id', $id)->update(['is_blocked' => 0, 'rejection_reason' => null]);
        return $this->respond(['success' => true, 'message' => 'Original brand unblocked.']);
    }

    // ── Seller Brand Actions ─────────────────────────────

    public function deactivateSellerBrand($id)
    {
        $db = \Config\Database::connect();
        $db->table('brands')->where('id', $id)->update(['is_active' => 0]);
        return $this->respond(['success' => true, 'message' => 'Seller brand deactivated.']);
    }

    public function activateSellerBrand($id)
    {
        $db = \Config\Database::connect();
        $db->table('brands')->where('id', $id)->update(['is_active' => 1]);
        return $this->respond(['success' => true, 'message' => 'Seller brand activated.']);
    }

    public function blockSellerBrand($id)
    {
        $db = \Config\Database::connect();
        $reason = trim($this->request->getPost('reason') ?? '');
        if (!$reason) $reason = 'Brand Blocked';
        
        $db->table('brands')->where('id', $id)->update([
            'is_blocked' => 1,
            'rejection_reason' => $reason
        ]);
        
        // Reject all products of that seller brand
        $db->table('products')
            ->where('brand_id', $id)
            ->update([
                'status' => 'rejected', 
                'admin_remarks' => 'Seller Brand Blocked: ' . $reason
            ]);
            
        return $this->respond(['success' => true, 'message' => 'Seller brand blocked and products rejected.']);
    }

    public function unblockSellerBrand($id)
    {
        $db = \Config\Database::connect();
        $db->table('brands')->where('id', $id)->update(['is_blocked' => 0, 'rejection_reason' => null]);
        return $this->respond(['success' => true, 'message' => 'Seller brand unblocked.']);
    }

    public function sellersList()
    {
        $db = \Config\Database::connect();
        $sellers = $db->table('users')
            ->select('id, name, email, user_type')
            // Include sellers, hybrid users, and all admin/super_admin roles
            ->groupStart()
                ->whereIn('user_type', ['seller', 'both'])
                ->orWhereIn('role', ['admin', 'super_admin'])
            ->groupEnd()
            ->where('is_blocked', 0)
            ->orderBy('name', 'ASC')
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $sellers]);
    }

    public function getProductsByUser($userId)
    {
        $db = \Config\Database::connect();
        $products = $db->table('products')
            ->select('products.id, products.title, products.product_number, products.brand_id, products.status, pt.listing_type_id')
            ->join('product_types pt', 'pt.id = products.product_type', 'left')
            ->where('products.seller_id', $userId)
            ->whereIn('products.status', ['approved', 'pending'])
            ->orderBy('products.title', 'ASC')
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'products' => $products]);
    }

    public function bulkTagProducts()
    {
        $db = \Config\Database::connect();
        $productIds = $this->request->getPost('product_ids') ?? [];
        $untagIds   = $this->request->getPost('untag_ids') ?? [];
        $brandId    = $this->request->getPost('brand_id');
        $isOriginal = $this->request->getPost('is_original') ?? 0;
        
        $column = $isOriginal ? 'orignal_brand_id' : 'brand_id';
        
        if (!$brandId) return $this->respond(['success' => false, 'message' => 'No brand selected.'], 400);
        // Tag selected products
        foreach ($productIds as $pid) {
            $db->table('products')->where('id', (int)$pid)->update([$column => $brandId]);
        }
        // Untag deselected products that belonged to this brand
        if (!empty($untagIds)) {
            $db->table('products')
               ->where($column, $brandId)
               ->whereIn('id', array_map('intval', $untagIds))
               ->update([$column => null]);
        }
        return $this->respond(['success' => true, 'message' => count($productIds) . ' tagged, ' . count($untagIds) . ' untagged.']);
    }

    // ── User Subscriptions ──────────────────────────────────
    public function userSubscriptions()
    {
        $db = \Config\Database::connect();
        $subs = $db->table('user_subscriptions us')
            ->select('us.*, sp.name as plan_name, sp.plan_type, sp.user_type as plan_for, sp.price, u.name as user_name, u.email, u.user_type')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->join('users u', 'u.id = us.user_id')
            ->orderBy('us.created_at', 'DESC')
            ->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $subs]);
    }

    public function assignSubscription()
    {
        $db = \Config\Database::connect();
        $userId = $this->request->getPost('user_id') ?? $this->request->getJSON(true)['user_id'] ?? null;
        $planId = $this->request->getPost('plan_id') ?? $this->request->getJSON(true)['plan_id'] ?? null;
        if (!$userId || !$planId) return $this->respond(['success' => false, 'message' => 'User and plan are required.'], 400);

        $plan = $db->table('subscription_plans')->where('id', $planId)->get()->getRowArray();
        if (!$plan) return $this->respond(['success' => false, 'message' => 'Plan not found.'], 404);

        // Stacking Logic: Find the latest expiry among active plans for the same user type
        $latestActive = $db->table('user_subscriptions us')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->where('us.user_id', $userId)
            ->where('us.is_active', 1)
            ->where('sp.user_type', $plan['user_type'])
            ->where('us.expires_at >', date('Y-m-d H:i:s'))
            ->orderBy('us.expires_at', 'DESC')
            ->get()->getRowArray();

        $durationHours = (float)($plan['duration_hours'] ?: 720);
        $startsAt = $latestActive ? $latestActive['expires_at'] : date('Y-m-d H:i:s');
        $baseTime = $latestActive ? strtotime($latestActive['expires_at']) : time();
        $expiresAt = $durationHours > 0
            ? date('Y-m-d H:i:s', $baseTime + $durationHours * 3600)
            : '2099-12-31 23:59:59';

        $db->table('user_subscriptions')->insert([
            'user_id' => $userId,
            'plan_id' => $planId,
            'usage_count' => 0,
            'is_active' => 1,
            'starts_at' => $startsAt,
            'expires_at' => $expiresAt,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Plan assigned successfully.']);
    }

    // ── Product Inspection & Edit Requests ──────────────────
    public function getProductImages($id)
    {
        $db = \Config\Database::connect();
        $images = $db->table('product_images')->where('product_id', $id)->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $images]);
    }

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

    public function getEditComparison($id)
    {
        $db = \Config\Database::connect();
        $request = $db->table('product_edit_requests')->where('id', $id)->get()->getRowArray();
        if (!$request) return $this->respond(['success' => false, 'message' => 'Not found'], 404);

        $original = $db->table('products')->where('id', $request['product_id'])->get()->getRowArray();
        $originalImages = $db->table('product_images')->where('product_id', $request['product_id'])->get()->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => [
                'request' => $request,
                'original' => $original,
                'original_images' => $originalImages,
            ]
        ]);
    }

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

    public function rejectEditRequest($id)
    {
        $db = \Config\Database::connect();
        $db->table('product_edit_requests')->where('id', $id)->update(['status' => 'rejected', 'updated_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Edit request rejected.']);
    }

    // ── Zones ──────────────────────────────────
    public function zones()
    {
        $db = \Config\Database::connect();
        $zones = $db->table('allowed_zones')->orderBy('created_at', 'DESC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $zones]);
    }

    public function addZone()
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('zone_name');
        $polygon = $this->request->getPost('zone_polygon');
        if (!$name || !$polygon) return $this->respond(['success' => false, 'message' => 'Zone name and polygon are required.'], 400);
        $db->table('allowed_zones')->insert(['zone_name' => $name, 'zone_polygon' => $polygon, 'is_active' => 1, 'created_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Zone saved successfully.']);
    }

    public function toggleZone($id)
    {
        $db = \Config\Database::connect();
        $zone = $db->table('allowed_zones')->where('id', $id)->get()->getRowArray();
        if (!$zone) return $this->respond(['success' => false, 'message' => 'Not found'], 404);
        $db->table('allowed_zones')->where('id', $id)->update(['is_active' => $zone['is_active'] ? 0 : 1]);
        return $this->respond(['success' => true, 'message' => 'Zone status toggled.']);
    }

    public function deleteZone($id)
    {
        $db = \Config\Database::connect();
        $db->table('allowed_zones')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Zone deleted.']);
    }

    // ── Heatmap ──────────────────────────────────
    public function registrationAttempts()
    {
        $db = \Config\Database::connect();
        // Try registration_attempts table first, fallback to users table
        if ($db->tableExists('registration_attempts')) {
            $data = $db->table('registration_attempts')
                ->orderBy('created_at', 'DESC')
                ->limit(200)
                ->get()->getResultArray();
        } else {
            // Fallback: use users table with location data
            $data = $db->table('users')
                ->select('id, name, email, mobile, user_type, address, city, state, pin_code, latitude, longitude, is_verified as is_allowed, created_at')
                ->whereNotIn('role', ['admin', 'super_admin'])
                ->orderBy('created_at', 'DESC')
                ->limit(200)
                ->get()->getResultArray();
        }
        return $this->respond(['success' => true, 'data' => $data]);
    }

    // ── Reports ──────────────────────────────────
    public function reports()
    {
        $db = \Config\Database::connect();
        $period = $this->request->getGet('period') ?? 'monthly';
        $now = date('Y-m-d H:i:s');

        if ($period === 'daily') $from = date('Y-m-d 00:00:00');
        elseif ($period === 'weekly') $from = date('Y-m-d 00:00:00', strtotime('-7 days'));
        else $from = date('Y-m-d 00:00:00', strtotime('-30 days'));

        $report = [
            'total_orders' => $db->table('orders')->where('created_at >=', $from)->countAllResults(),
            'total_revenue' => $db->table('orders')->selectSum('final_price')->where('created_at >=', $from)->get()->getRowArray()['final_price'] ?? 0,
            'new_users' => $db->table('users')->where('created_at >=', $from)->countAllResults(),
            'new_products' => $db->table('products')->where('created_at >=', $from)->countAllResults(),
        ];

        $orders = $db->table('orders o')
            ->select('o.*, p.title as product_name')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->where('o.created_at >=', $from)
            ->orderBy('o.created_at', 'DESC')
            ->limit(50)
            ->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => ['report' => $report, 'orders' => $orders]]);
    }

    // ── System Settings ──────────────────────────────────
    public function systemSettings()
    {
        $db = \Config\Database::connect();
        $rows = $db->table('system_settings')->get()->getResultArray();
        $settings = [];
        foreach ($rows as $r) $settings[$r['setting_key']] = $r['setting_value'];
        return $this->respond(['success' => true, 'data' => $settings]);
    }

    public function updateSettings()
    {
        $db = \Config\Database::connect();
        $data = $this->request->getPost() ?: $this->request->getJSON(true) ?: [];
        foreach ($data as $key => $value) {
            $exists = $db->table('system_settings')->where('setting_key', $key)->countAllResults();
            if ($exists) $db->table('system_settings')->where('setting_key', $key)->update(['setting_value' => $value, 'updated_at' => date('Y-m-d H:i:s')]);
            else $db->table('system_settings')->insert(['setting_key' => $key, 'setting_value' => $value, 'updated_at' => date('Y-m-d H:i:s')]);
        }
        return $this->respond(['success' => true, 'message' => 'Settings saved successfully.']);
    }

    /* Mark all expired-pending offers as 'missed' in the DB */
    public function markMissedOffers()
    {
        $db = \Config\Database::connect();
        $row = $db->table('system_settings')->where('setting_key', 'offer_acceptance_limit_days')->get()->getRowArray();
        $limitDays = isset($row['setting_value']) ? (int) $row['setting_value'] : 7;
        $cutoff = date('Y-m-d H:i:s', strtotime("-{$limitDays} days"));
        $affected = $db->table('offers')
            ->where('status', 'pending')
            ->where('created_at <', $cutoff)
            ->update(['status' => 'missed', 'updated_at' => date('Y-m-d H:i:s')]);
        $count = $db->affectedRows();
        return $this->respond(['success' => true, 'message' => "Marked {$count} expired offers as missed."]);
    }

    public function bulkDeleteRejected()
    {
        $db = \Config\Database::connect();
        $from = $this->request->getPost('from_date');
        $to = $this->request->getPost('to_date');
        if (!$from || !$to) return $this->respond(['success' => false, 'message' => 'Both dates required.'], 400);

        $products = $db->table('products')->where('status', 'rejected')->where('updated_at >=', $from)->where('updated_at <=', $to . ' 23:59:59')->get()->getResultArray();
        $count = count($products);
        foreach ($products as $p) {
            $db->table('product_images')->where('product_id', $p['id'])->delete();
            $db->table('products')->where('id', $p['id'])->delete();
        }
        return $this->respond(['success' => true, 'message' => "$count rejected products deleted."]);
    }

    // ── CMS Pages ──────────────────────────────────
    public function cmsPages()
    {
        $db = \Config\Database::connect();
        $pages = $db->table('cms_pages')->orderBy('title', 'ASC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $pages]);
    }

    public function createCmsPage()
    {
        $db = \Config\Database::connect();
        $slug = $this->request->getPost('slug') ?? $this->request->getJSON(true)['slug'] ?? '';
        $title = $this->request->getPost('title') ?? $this->request->getJSON(true)['title'] ?? '';
        $content = $this->request->getPost('content') ?? $this->request->getJSON(true)['content'] ?? '';

        if (!$slug || !$title) return $this->respond(['success' => false, 'message' => 'Slug and title are required.'], 400);

        $exists = $db->table('cms_pages')->where('slug', $slug)->countAllResults();
        if ($exists) return $this->respond(['success' => false, 'message' => 'A page with this slug already exists.'], 400);

        $db->table('cms_pages')->insert([
            'slug' => strtolower(preg_replace('/[^a-z0-9\-]/', '', str_replace(' ', '-', strtolower($slug)))),
            'title' => $title,
            'content' => $content,
            'status' => 'active',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'CMS page created successfully.']);
    }

    public function deleteCmsPage($id)
    {
        $db = \Config\Database::connect();
        $page = $db->table('cms_pages')->where('id', $id)->get()->getRowArray();
        if (!$page) return $this->respond(['success' => false, 'message' => 'Page not found.'], 404);
        $db->table('cms_pages')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'CMS page deleted successfully.']);
    }

    public function cmsPage($slug)
    {
        $db = \Config\Database::connect();
        $page = $db->table('cms_pages')->where('slug', $slug)->get()->getRowArray();
        if (!$page) return $this->respond(['success' => false, 'message' => 'Page not found.'], 404);
        return $this->respond(['success' => true, 'data' => $page]);
    }

    public function updateCmsPage($slug)
    {
        $db = \Config\Database::connect();
        $content = $this->request->getPost('content') ?? $this->request->getJSON(true)['content'] ?? '';
        $title = $this->request->getPost('title') ?? $this->request->getJSON(true)['title'] ?? '';
        $status = $this->request->getPost('status') ?? $this->request->getJSON(true)['status'] ?? null;
        $data = ['content' => $content, 'updated_at' => date('Y-m-d H:i:s')];
        if ($title) $data['title'] = $title;
        if ($status) $data['status'] = $status;
        $db->table('cms_pages')->where('slug', $slug)->update($data);
        return $this->respond(['success' => true, 'message' => 'Page updated successfully.']);
    }

    // ── Financial Reports ──────────────────────────────────
    public function financialReports()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $period = $this->request->getGet('period') ?? '30d';
        $from = null;

        if ($period === 'custom') {
            $from = $this->request->getGet('from');
            $to = $this->request->getGet('to') ?? date('Y-m-d');
        } else {
            $to = date('Y-m-d');
            switch ($period) {
                case 'today': $from = date('Y-m-d'); break;
                case '7d': $from = date('Y-m-d', strtotime('-7 days')); break;
                case '30d': $from = date('Y-m-d', strtotime('-30 days')); break;
                case '90d': $from = date('Y-m-d', strtotime('-90 days')); break;
                case '1y': $from = date('Y-m-d', strtotime('-1 year')); break;
                case 'all': $from = null; break;
            }
        }

        // Stats - Transactions
        $trxBuilder = $db->table('transactions')->whereIn('payment_status', ['paid', 'completed']);
        if (!in_array($jwtUser['role'], ['super_admin', 'superadmin'])) {
            $trxBuilder->where('user_id', $jwtUser['user_id']);
        }
        if ($from) $trxBuilder->where('created_at >=', $from . ' 00:00:00');
        if ($from) $trxBuilder->where('created_at <=', $to . ' 23:59:59');
        $totalTrx = (clone $trxBuilder)->countAllResults(false);
        $totalRevenue = (clone $trxBuilder)->selectSum('amount')->get()->getRowArray()['amount'] ?? 0;

        $trxBuilder2 = $db->table('transactions')->whereIn('payment_status', ['paid', 'completed']);
        if (!in_array($jwtUser['role'], ['super_admin', 'superadmin'])) {
            $trxBuilder2->where('user_id', $jwtUser['user_id']);
        }
        if ($from) $trxBuilder2->where('created_at >=', $from . ' 00:00:00')->where('created_at <=', $to . ' 23:59:59');
        $subRevenue = (clone $trxBuilder2)->selectSum('amount')->like('description', 'Subscription', 'after')->get()->getRowArray()['amount'] ?? 0;

        $paidTrx = $totalTrx;
        $pendingTrx = 0;
        $failedTrx = 0;
        $successRate = $totalTrx > 0 ? 100 : 0;

        // Stats - Orders
        $ordBuilder = $db->table('orders');
        if (!in_array($jwtUser['role'], ['super_admin', 'superadmin'])) {
            $ordBuilder->where('buyer_id', $jwtUser['user_id']);
        }
        if ($from) $ordBuilder->where('created_at >=', $from . ' 00:00:00')->where('created_at <=', $to . ' 23:59:59');
        $totalOrders = (clone $ordBuilder)->countAllResults(false);
        $orderRevenue = (clone $ordBuilder)->selectSum('final_price')->where('payment_status', 'paid')->get()->getRowArray()['final_price'] ?? 0;

        // Transactions list
        $listBuilder = $db->table('transactions t')
            ->select('t.*, u.name as user_name, COALESCE(p.title, o.order_number, t.description) as item_name')
            ->join('users u', 'u.id = t.user_id', 'left')
            ->join('orders o', 'o.id = t.order_id', 'left')
            ->join('products p', 'p.id = o.product_id', 'left');
        if (!in_array($jwtUser['role'], ['super_admin', 'superadmin'])) {
            $listBuilder->where('t.user_id', $jwtUser['user_id']);
        }
        if ($from) $listBuilder->where('t.created_at >=', $from . ' 00:00:00')->where('t.created_at <=', $to . ' 23:59:59');
        $transactions = $listBuilder->orderBy('t.created_at', 'DESC')->limit(200)->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => [
            'stats' => [
                'total_revenue' => $totalRevenue,
                'sub_revenue' => $subRevenue,
                'order_revenue' => $orderRevenue,
                'success_rate' => round($successRate, 1),
                'total_transactions' => $totalTrx,
                'total_orders' => $totalOrders,
                'paid_count' => $paidTrx,
                'pending_count' => $pendingTrx,
                'failed_count' => $failedTrx,
            ],
            'transactions' => $transactions,
        ]]);
    }

    // ── Advertisements ──────────────────────────────────
    public function advertisements()
    {
        $db = \Config\Database::connect();
        $ads = $db->table('advertisements')->orderBy('created_at', 'DESC')->get()->getResultArray();
        return $this->respond(['success' => true, 'data' => $ads]);
    }

    public function getAdvertisement($id)
    {
        $db = \Config\Database::connect();
        $ad = $db->table('advertisements')->where('id', $id)->get()->getRowArray();
        if (!$ad) return $this->respond(['success' => false, 'message' => 'Not found'], 404);
        return $this->respond(['success' => true, 'data' => $ad]);
    }

    public function uploadAdvertisement()
    {
        $db = \Config\Database::connect();
        $data = [
            'title' => $this->request->getPost('title'),
            'short_description' => $this->request->getPost('short_description') ?? '',
            'position' => $this->request->getPost('position') ?? 'top_banner',
            'payment_date' => $this->request->getPost('payment_date') ?: null,
            'start_date' => $this->request->getPost('start_date') ?: null,
            'end_date' => $this->request->getPost('end_date') ?: null,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s'),
        ];

        $file = $this->request->getFile('ad_media');
        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $file->move(FCPATH . 'uploads/advertisements/', $newName);
            $data['media_path'] = $newName;
            $data['ad_type'] = str_contains($file->getMimeType(), 'video') ? 'video' : 'image';
            $data['media_type'] = $file->getMimeType();
        }

        $db->table('advertisements')->insert($data);
        return $this->respond(['success' => true, 'message' => 'Advertisement uploaded successfully.']);
    }

    public function updateAdvertisement()
    {
        $db = \Config\Database::connect();
        $id = $this->request->getPost('ad_id');
        if (!$id) return $this->respond(['success' => false, 'message' => 'Missing ad ID'], 400);

        $data = [
            'title' => $this->request->getPost('title'),
            'short_description' => $this->request->getPost('short_description') ?? '',
            'position' => $this->request->getPost('position') ?? 'top_banner',
            'payment_date' => $this->request->getPost('payment_date') ?: null,
            'start_date' => $this->request->getPost('start_date') ?: null,
            'end_date' => $this->request->getPost('end_date') ?: null,
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        $file = $this->request->getFile('ad_media');
        if ($file && $file->isValid() && !$file->hasMoved()) {
            // Delete old media file
            $oldAd = $db->table('advertisements')->select('media_path')->where('id', $id)->get()->getRowArray();
            if ($oldAd && !empty($oldAd['media_path'])) {
                $oldPath = FCPATH . 'uploads/advertisements/' . $oldAd['media_path'];
                if (file_exists($oldPath)) {
                    unlink($oldPath);
                }
            }
            $newName = $file->getRandomName();
            $file->move(FCPATH . 'uploads/advertisements/', $newName);
            $data['media_path'] = $newName;
            $data['ad_type'] = str_contains($file->getMimeType(), 'video') ? 'video' : 'image';
            $data['media_type'] = $file->getMimeType();
        }

        $db->table('advertisements')->where('id', $id)->update($data);
        return $this->respond(['success' => true, 'message' => 'Advertisement updated successfully.']);
    }

    public function toggleAdvertisement($id)
    {
        $db = \Config\Database::connect();
        $ad = $db->table('advertisements')->where('id', $id)->get()->getRowArray();
        if (!$ad) return $this->respond(['success' => false, 'message' => 'Not found'], 404);
        $db->table('advertisements')->where('id', $id)->update(['is_active' => $ad['is_active'] ? 0 : 1]);
        return $this->respond(['success' => true, 'message' => 'Status toggled.']);
    }

    public function deleteAdvertisement($id)
    {
        $db = \Config\Database::connect();
        $db->table('advertisements')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Advertisement deleted.']);
    }

    // ── Original Brands ──────────────────────────────────
    public function originalBrands()
    {
        $db = \Config\Database::connect();
        $brands = $db->table('orignal_brands ob')
            ->select('ob.*')
            ->orderBy('ob.brand_name', 'ASC')
            ->get()->getResultArray();
        
        // Process brands to include listing type info
        foreach ($brands as &$b) {
            $listingTypeNames = [];
            
            // Check listing_type_ids (JSON array - primary)
            if (!empty($b['listing_type_ids'])) {
                try {
                    $ltIds = json_decode($b['listing_type_ids'], true);
                    if (is_array($ltIds)) {
                        foreach ($ltIds as $ltId) {
                            $lt = $db->table('listing_types')->where('id', $ltId)->select('type_name')->get()->getRowArray();
                            if ($lt) $listingTypeNames[] = $lt['type_name'];
                        }
                    }
                } catch (\Exception $e) {
                    // JSON decode error, skip
                }
            }
            
            // Fallback to single listing_type_id (for backward compatibility)
            if (empty($listingTypeNames) && !empty($b['listing_type_id'])) {
                $lt = $db->table('listing_types')->where('id', $b['listing_type_id'])->get()->getRowArray();
                if ($lt) $listingTypeNames[] = $lt['type_name'];
            }
            
            $b['listing_type_names'] = $listingTypeNames;
            $b['listing_type_ids'] = !empty($b['listing_type_ids']) ? json_decode($b['listing_type_ids'], true) : [];
        }
        
        return $this->respond(['success' => true, 'data' => $brands]);
    }

    public function addOriginalBrand()
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('brand_name');
        $desc = $this->request->getPost('description') ?? '';
        if (!$name) return $this->respond(['success' => false, 'message' => 'Brand name is required.'], 400);

        $data = ['brand_name' => $name, 'description' => $desc, 'is_active' => 1, 'created_at' => date('Y-m-d H:i:s')];
        
        // Handle multiple listing types
        $ltIds = $this->request->getPost('listing_type_ids');
        if ($ltIds) {
            // If it's a JSON string, parse it; if it's an array, encode it
            if (is_string($ltIds)) {
                $ltIds = json_decode($ltIds, true);
            }
            if (is_array($ltIds) && !empty($ltIds)) {
                // Filter out empty values
                $ltIds = array_filter(array_map('intval', $ltIds));
                $data['listing_type_ids'] = json_encode(array_values($ltIds));
                // Set first listing type as primary (for backward compatibility)
                $data['listing_type_id'] = $ltIds[0] ?? null;
            }
        }
        
        // Fallback: single listing_type_id if listing_type_ids not provided
        if (empty($data['listing_type_ids'])) {
            $ltId = $this->request->getPost('listing_type_id');
            if ($ltId) {
                $data['listing_type_id'] = $ltId;
                $data['listing_type_ids'] = json_encode([(int)$ltId]);
            }
        }

        $file = $this->request->getFile('brand_image');
        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $file->move(FCPATH . 'uploads/brands/', $newName);
            $data['brand_image'] = 'uploads/brands/' . $newName;
        }

        $db->table('orignal_brands')->insert($data);
        return $this->respond(['success' => true, 'message' => 'Original brand added.']);
    }

    public function updateOriginalBrand($id)
    {
        $db = \Config\Database::connect();
        $data = [
            'brand_name' => $this->request->getPost('brand_name'),
            'description' => $this->request->getPost('description') ?? '',
            'is_active' => $this->request->getPost('is_active') ?? 1,
        ];
        
        // Handle multiple listing types
        $ltIds = $this->request->getPost('listing_type_ids');
        if ($ltIds !== null) {
            if (is_string($ltIds)) {
                $ltIds = json_decode($ltIds, true);
            }
            if (is_array($ltIds) && !empty($ltIds)) {
                // Filter out empty values
                $ltIds = array_filter(array_map('intval', $ltIds));
                $data['listing_type_ids'] = json_encode(array_values($ltIds));
                // Set first listing type as primary
                $data['listing_type_id'] = $ltIds[0] ?? null;
            } else {
                $data['listing_type_ids'] = null;
                $data['listing_type_id'] = null;
            }
        } else {
            // Fallback: single listing_type_id if listing_type_ids not provided
            $ltId = $this->request->getPost('listing_type_id');
            if ($ltId !== null) {
                $data['listing_type_id'] = $ltId ?: null;
                if ($ltId) {
                    $data['listing_type_ids'] = json_encode([(int)$ltId]);
                } else {
                    $data['listing_type_ids'] = null;
                }
            }
        }

        $file = $this->request->getFile('brand_image');
        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $file->move(FCPATH . 'uploads/brands/', $newName);
            $data['brand_image'] = 'uploads/brands/' . $newName;
        }

        $db->table('orignal_brands')->where('id', $id)->update($data);
        return $this->respond(['success' => true, 'message' => 'Original brand updated.']);
    }

    public function deleteOriginalBrand($id)
    {
        $db = \Config\Database::connect();
        $db->table('orignal_brands')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Original brand deleted.']);
    }

    public function pendingProducts()
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $products = $db->table('products p')
            ->select('p.*, u.name as seller_name, u.email as seller_email, u.seller_rating_avg, u.seller_rating_count, lt.usage_label')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->join('listing_types lt', 'lt.type_name = p.listing_type_category', 'left')
            ->where('p.status', 'pending')
            ->orderBy('p.created_at', 'ASC')
            ->get()->getResultArray();

        // Attach images for each product
        foreach ($products as &$product) {
            $product['images'] = $db->table('product_images')
                ->where('product_id', $product['id'])
                ->orderBy('display_order', 'ASC')
                ->get()->getResultArray();
        }

        return $this->respond(['success' => true, 'data' => $products]);
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
            ->select('a.action_type, a.action_details, a.created_at, u.name as admin_name')
            ->join('users u', 'u.id = a.admin_id', 'left')
            ->where('a.user_id', $userId)
            ->orderBy('a.created_at', 'DESC')
            ->limit(50)
            ->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $logs]);
    }

    public function toggleFeatured($productId)
    {
        $db = \Config\Database::connect();
        $product = $db->table('products')->where('id', $productId)->get()->getRowArray();
        if (!$product) return $this->respond(['success' => false, 'message' => 'Product not found.'], 404);

        $newVal = $product['is_featured'] ? 0 : 1;
        $db->table('products')->where('id', $productId)->update(['is_featured' => $newVal, 'updated_at' => date('Y-m-d H:i:s')]);

        return $this->respond([
            'success' => true,
            'message' => $newVal ? 'Product marked as featured.' : 'Product removed from featured.',
            'is_featured' => $newVal,
        ]);
    }

    public function allProducts()
    {
        $db = \Config\Database::connect();
        $page = (int) ($this->request->getGet('page') ?? 1);
        $perPage = 15;
        $offset = ($page - 1) * $perPage;
        $search = $this->request->getGet('search');
        $status = $this->request->getGet('status');
        $listingType = $this->request->getGet('listing_type');
        $featured = $this->request->getGet('featured');

        $builder = $db->table('products p')
            ->select('p.*, u.name as seller_name, u.email as seller_email, (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.display_order ASC LIMIT 1) as image')
            ->join('users u', 'u.id = p.seller_id', 'left');

        if ($search) {
            $builder->groupStart()->like('p.title', $search)->orLike('p.description', $search)->orLike('p.category', $search)->groupEnd();
        }
        if ($status) $builder->where('p.status', $status);
        if ($listingType) {
            if (in_array(strtolower($listingType), ['sell', 'rent'])) {
                $builder->where('p.listing_type', strtolower($listingType));
            } else {
                $builder->where('LOWER(p.listing_type_category)', strtolower($listingType));
            }
        }
        if ($featured !== null && $featured !== '') $builder->where('p.is_featured', (int) $featured);

        $total = $builder->countAllResults(false);
        $products = $builder->orderBy('p.created_at', 'DESC')->limit($perPage, $offset)->get()->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => [
                'products' => $products,
                'pagination' => ['page' => $page, 'per_page' => $perPage, 'total' => $total, 'total_pages' => (int) ceil($total / $perPage)],
            ],
        ]);
    }

    public function updateProductStatus($id)
    {
        $db = \Config\Database::connect();
        $product = $db->table('products')->where('id', $id)->get()->getRowArray();
        if (!$product) return $this->respond(['success' => false, 'message' => 'Product not found.'], 404);

        $newStatus = $this->request->getJsonVar('status');
        $remarks = $this->request->getJsonVar('remarks') ?? '';
        if (!in_array($newStatus, ['pending', 'approved', 'rejected', 'inactive'])) {
            return $this->respond(['success' => false, 'message' => 'Invalid status.'], 422);
        }

        $db->table('products')->where('id', $id)->update([
            'status' => $newStatus,
            'admin_remarks' => $remarks,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => "Product status changed to {$newStatus}."]);
    }

    public function deleteProduct($id)
    {
        $db = \Config\Database::connect();
        $product = $db->table('products')->where('id', $id)->get()->getRowArray();
        if (!$product) return $this->respond(['success' => false, 'message' => 'Product not found.'], 404);

        $db->table('product_images')->where('product_id', $id)->delete();
        $db->table('products')->where('id', $id)->delete();

        return $this->respond(['success' => true, 'message' => 'Product deleted.']);
    }


    public function bulkUploadCatalogue()
    {
        $db = \Config\Database::connect();
        $type = $this->request->getPost('type');
        $file = $this->request->getFile('csv_file');

        if (!$file || !$file->isValid() || $file->getExtension() !== 'csv') {
            return $this->respond(['success' => false, 'message' => 'Please upload a valid CSV file.'], 400);
        }

        $allowedTypes = ['listing_types', 'genders', 'product_types', 'categories', 'sub_categories', 'colors'];
        if (!in_array($type, $allowedTypes)) {
            return $this->respond(['success' => false, 'message' => 'Invalid catalogue type.'], 400);
        }

        $handle = fopen($file->getTempName(), 'r');
        if (!$handle) {
            return $this->respond(['success' => false, 'message' => 'Failed to read CSV file.'], 500);
        }

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return $this->respond(['success' => false, 'message' => 'CSV file is empty.'], 400);
        }
        $header = array_map('trim', array_map('strtolower', $header));

        $inserted = 0;
        $skipped = 0;
        $errors = [];
        $now = date('Y-m-d H:i:s');
        $row = 1;

        while (($line = fgetcsv($handle)) !== false) {
            $row++;
            if (count($line) < count($header)) { $skipped++; $errors[] = "Row {$row}: Insufficient columns"; continue; }
            $data = array_combine($header, array_map('trim', $line));

            try {
                switch ($type) {
                    case 'listing_types':
                        $name = $data['name'] ?? $data['type_name'] ?? '';
                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }
                        $gender = $data['gender_config'] ?? 'optional';
                        $rec = ['type_name' => $name, 'field_config' => json_encode(['gender' => $gender]), 'created_at' => $now];
                        if (!empty($data['image'])) $rec['image'] = $data['image'];
                        $db->table('listing_types')->insert($rec);
                        $inserted++;
                        break;

                    case 'genders':
                        $name = $data['name'] ?? '';
                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }
                        $db->table('genders')->insert(['name' => $name, 'created_at' => $now]);
                        $inserted++;
                        break;

                    case 'product_types':
                        $name = $data['name'] ?? '';
                        $ltId = $data['listing_type_id'] ?? '';
                        if (!$name || !$ltId) { $skipped++; $errors[] = "Row {$row}: Name or listing_type_id missing"; continue 2; }
                        $db->table('product_types')->insert(['name' => $name, 'listing_type_id' => $ltId, 'created_at' => $now]);
                        $inserted++;
                        break;

                    case 'categories':
                        $name = $data['category_name'] ?? $data['name'] ?? '';
                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }
                        $ptIds = isset($data['product_type_ids']) ? json_decode($data['product_type_ids'], true) : [];
                        $appliesTo = isset($data['applies_to']) ? json_decode($data['applies_to'], true) : [];
                        $db->table('categories')->insert([
                            'category_name' => $name,
                            'product_type_ids' => json_encode(is_array($ptIds) ? $ptIds : []),
                            'applies_to' => json_encode(is_array($appliesTo) ? $appliesTo : []),
                            'created_at' => $now,
                        ]);
                        $inserted++;
                        break;

                    case 'sub_categories':
                        $name = $data['name'] ?? '';
                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }
                        $catIds = isset($data['category_ids']) ? json_decode($data['category_ids'], true) : [];
                        $appliesTo = isset($data['applies_to']) ? json_decode($data['applies_to'], true) : [];
                        $db->table('sub_categories')->insert([
                            'name' => $name,
                            'category_ids' => json_encode(is_array($catIds) ? $catIds : []),
                            'applies_to' => json_encode(is_array($appliesTo) ? $appliesTo : []),
                            'created_at' => $now,
                        ]);
                        $inserted++;
                        break;

                    case 'colors':
                        $name = $data['name'] ?? '';
                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }
                        $hex = $data['hex_code'] ?? '#000000';
                        $db->table('colors')->insert(['name' => $name, 'hex_code' => $hex, 'created_at' => $now]);
                        $inserted++;
                        break;
                }
            } catch (\Exception $e) {
                $skipped++;
                $errors[] = "Row {$row}: " . $e->getMessage();
            }
        }

        fclose($handle);

        return $this->respond([
            'success' => true,
            'message' => "{$inserted} records inserted, {$skipped} skipped.",
            'inserted' => $inserted,
            'skipped' => $skipped,
            'errors' => array_slice($errors, 0, 10),
        ]);
    }

    // ── Bulk CSV Uploads ──────────────────────────────────

    private function parseCsv($file): array
    {
        if (!$file || !$file->isValid() || $file->getExtension() !== 'csv') {
            return ['error' => 'Please upload a valid CSV file.'];
        }
        $handle = fopen($file->getTempName(), 'r');
        if (!$handle) return ['error' => 'Failed to read CSV file.'];
        $header = fgetcsv($handle);
        if (!$header) { fclose($handle); return ['error' => 'CSV file is empty.']; }
        $header = array_map('trim', array_map('strtolower', $header));
        $rows = [];
        while (($line = fgetcsv($handle)) !== false) {
            if (count($line) >= count($header)) {
                $rows[] = array_combine($header, array_map('trim', $line));
            }
        }
        fclose($handle);
        return ['header' => $header, 'rows' => $rows];
    }

    public function bulkUploadBrands()
    {
        $db = \Config\Database::connect();
        $csv = $this->parseCsv($this->request->getFile('csv_file'));
        if (isset($csv['error'])) return $this->respond(['success' => false, 'message' => $csv['error']], 400);

        $inserted = 0; $skipped = 0; $errors = []; $now = date('Y-m-d H:i:s');
        foreach ($csv['rows'] as $i => $data) {
            $row = $i + 2;
            $name = $data['brand_name'] ?? $data['name'] ?? '';
            if (!$name) { $skipped++; $errors[] = "Row {$row}: brand_name is empty"; continue; }
            try {
                $rec = ['brand_name' => $name, 'created_at' => $now];
                if (!empty($data['seller_id'])) $rec['seller_id'] = $data['seller_id'];
                if (!empty($data['listing_type_id'])) $rec['listing_type_id'] = $data['listing_type_id'];
                if (!empty($data['description'])) $rec['description'] = $data['description'];
                $db->table('orignal_brands')->insert($rec);
                $inserted++;
            } catch (\Exception $e) { $skipped++; $errors[] = "Row {$row}: " . $e->getMessage(); }
        }
        return $this->respond(['success' => true, 'message' => "{$inserted} brands inserted, {$skipped} skipped.", 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => array_slice($errors, 0, 10)]);
    }

    public function bulkUploadOriginalBrands()
    {
        $db = \Config\Database::connect();
        $csv = $this->parseCsv($this->request->getFile('csv_file'));
        if (isset($csv['error'])) return $this->respond(['success' => false, 'message' => $csv['error']], 400);

        $inserted = 0; $skipped = 0; $errors = []; $now = date('Y-m-d H:i:s');
        foreach ($csv['rows'] as $i => $data) {
            $row = $i + 2;
            $name = $data['brand_name'] ?? $data['name'] ?? '';
            if (!$name) { $skipped++; $errors[] = "Row {$row}: brand_name is empty"; continue; }
            try {
                $rec = ['brand_name' => $name, 'is_active' => 1, 'created_at' => $now];
                if (!empty($data['listing_type_id'])) $rec['listing_type_id'] = $data['listing_type_id'];
                if (!empty($data['description'])) $rec['description'] = $data['description'];
                $db->table('orignal_brands')->insert($rec);
                $inserted++;
            } catch (\Exception $e) { $skipped++; $errors[] = "Row {$row}: " . $e->getMessage(); }
        }
        return $this->respond(['success' => true, 'message' => "{$inserted} brands inserted, {$skipped} skipped.", 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => array_slice($errors, 0, 10)]);
    }

    public function bulkUploadProducts()
    {
        $db = \Config\Database::connect();
        $csv = $this->parseCsv($this->request->getFile('csv_file'));
        if (isset($csv['error'])) return $this->respond(['success' => false, 'message' => $csv['error']], 400);

        $inserted = 0; $skipped = 0; $errors = []; $now = date('Y-m-d H:i:s');
        foreach ($csv['rows'] as $i => $data) {
            $row = $i + 2;
            $title = $data['title'] ?? '';
            $sellerId = $data['seller_id'] ?? '';
            $listingType = $data['listing_type'] ?? 'sell';
            $originalPrice = $data['original_price'] ?? '';
            if (!$title || !$sellerId || !$originalPrice) { $skipped++; $errors[] = "Row {$row}: title, seller_id, or original_price missing"; continue; }
            try {
                $rec = [
                    'seller_id' => $sellerId, 'title' => $title, 'listing_type' => $listingType,
                    'original_price' => $originalPrice,
                    'description' => $data['description'] ?? '',
                    'selling_price' => $data['selling_price'] ?? null,
                    'rental_cost' => $data['rental_cost'] ?? null,
                    'rental_deposit' => $data['rental_deposit'] ?? null,
                    'color' => $data['color'] ?? null,
                    'size' => $data['size'] ?? null,
                    'brand' => $data['brand'] ?? null,
                    'category' => $data['category'] ?? null,
                    'gender' => $data['gender'] ?? null,
                    'times_used' => $data['times_used'] ?? $data['used_times'] ?? 0,
                    'condition_description' => $data['condition_description'] ?? '',
                    'status' => $data['status'] ?? 'pending',
                    'created_at' => $now, 'updated_at' => $now,
                ];
                $db->table('products')->insert($rec);
                $inserted++;
            } catch (\Exception $e) { $skipped++; $errors[] = "Row {$row}: " . $e->getMessage(); }
        }
        return $this->respond(['success' => true, 'message' => "{$inserted} products inserted, {$skipped} skipped.", 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => array_slice($errors, 0, 10)]);
    }

    public function bulkUploadCoupons()
    {
        $db = \Config\Database::connect();
        $csv = $this->parseCsv($this->request->getFile('csv_file'));
        if (isset($csv['error'])) return $this->respond(['success' => false, 'message' => $csv['error']], 400);

        $inserted = 0; $skipped = 0; $errors = []; $now = date('Y-m-d H:i:s');
        foreach ($csv['rows'] as $i => $data) {
            $row = $i + 2;
            $code = strtoupper(trim($data['code'] ?? ''));
            $discountValue = $data['discount_value'] ?? '';
            if (!$code || !$discountValue) { $skipped++; $errors[] = "Row {$row}: code or discount_value missing"; continue; }
            try {
                $db->table('coupons')->insert([
                    'code' => $code,
                    'discount_type' => $data['discount_type'] ?? 'percentage',
                    'discount_value' => $discountValue,
                    'min_order_amount' => $data['min_order_amount'] ?? 0,
                    'max_discount' => !empty($data['max_discount']) ? $data['max_discount'] : null,
                    'usage_limit' => $data['usage_limit'] ?? 0,
                    'valid_from' => !empty($data['valid_from']) ? $data['valid_from'] : null,
                    'valid_until' => !empty($data['valid_until']) ? $data['valid_until'] : null,
                    'is_active' => 1,
                    'created_at' => $now,
                ]);
                $inserted++;
            } catch (\Exception $e) { $skipped++; $errors[] = "Row {$row}: " . $e->getMessage(); }
        }
        return $this->respond(['success' => true, 'message' => "{$inserted} coupons inserted, {$skipped} skipped.", 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => array_slice($errors, 0, 10)]);
    }

    public function bulkUploadSubscriptionPlans()
    {
        $db = \Config\Database::connect();
        $csv = $this->parseCsv($this->request->getFile('csv_file'));
        if (isset($csv['error'])) return $this->respond(['success' => false, 'message' => $csv['error']], 400);

        $inserted = 0; $skipped = 0; $errors = []; $now = date('Y-m-d H:i:s');
        foreach ($csv['rows'] as $i => $data) {
            $row = $i + 2;
            $name = $data['name'] ?? '';
            $price = $data['price'] ?? '';
            $userType = $data['user_type'] ?? '';
            if (!$name || !$price || !$userType) { $skipped++; $errors[] = "Row {$row}: name, price, or user_type missing"; continue; }
            try {
                $db->table('subscription_plans')->insert([
                    'name' => $name,
                    'user_type' => $userType,
                    'plan_type' => $data['plan_type'] ?? 'duration',
                    'limit_value' => (int)($data['limit_value'] ?? 0),
                    'duration_hours' => (float)($data['duration_hours'] ?? 0),
                    'price' => (float)($price),
                    'base_price' => (float)($data['base_price'] ?? $price),
                    'is_active' => 1,
                    'created_at' => $now, 'updated_at' => $now,
                ]);
                $inserted++;
            } catch (\Exception $e) { $skipped++; $errors[] = "Row {$row}: " . $e->getMessage(); }
        }
        return $this->respond(['success' => true, 'message' => "{$inserted} plans inserted, {$skipped} skipped.", 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => array_slice($errors, 0, 10)]);
    }

    // ── User Reports Management ──────────────────────────────

    /**
     * GET /api/v1/superadmin/user-reports
     * Returns ALL reports across all admins with full detail.
     */
    public function getUserReports()
    {
        $db = \Config\Database::connect();

        $status = $this->request->getGet('status'); // optional filter: pending|reviewed|dismissed

        $builder = $db->table('user_reports r')
            ->select('r.*, reporter.name as reporter_name, reporter.email as reporter_email,
                      reported.name as reported_name, reported.email as reported_email,
                      reported.is_blocked, reported.is_suspended,
                      assigned.name as assigned_admin_name,
                      reviewer.name as reviewed_by_name')
            ->join('users reporter', 'reporter.id = r.reporter_id', 'left')
            ->join('users reported', 'reported.id = r.reported_id', 'left')
            ->join('users assigned', 'assigned.id = r.assigned_admin_id', 'left')
            ->join('users reviewer', 'reviewer.id = r.reviewed_by', 'left');

        if ($status && in_array($status, ['pending', 'reviewed', 'dismissed'])) {
            $builder->where('r.status', $status);
        }

        $reports = $builder->orderByRaw("FIELD(r.status, 'pending', 'reviewed', 'dismissed'), r.created_at DESC")
            ->get()->getResultArray();

        $summary = [
            'total'     => $db->table('user_reports')->countAllResults(),
            'pending'   => $db->table('user_reports')->where('status', 'pending')->countAllResults(),
            'reviewed'  => $db->table('user_reports')->where('status', 'reviewed')->countAllResults(),
            'dismissed' => $db->table('user_reports')->where('status', 'dismissed')->countAllResults(),
        ];

        return $this->respond(['success' => true, 'data' => $reports, 'summary' => $summary]);
    }

    /**
     * POST /api/v1/superadmin/handle-report/:id
     * SuperAdmin can handle any report regardless of assignment.
     * Body: action (block | unblock | unsuspend | dismiss | reassign), admin_notes, assign_to (admin id for reassign)
     */
    public function handleReport(int $reportId)
    {
        $jwtUser = $this->request->jwt_user;
        $adminId = $jwtUser['user_id'];
        $db      = \Config\Database::connect();

        $report = $db->table('user_reports')->where('id', $reportId)->get()->getRowArray();
        if (!$report) {
            return $this->respond(['success' => false, 'message' => 'Report not found'], 404);
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
                'is_blocked'        => 0,
                'is_suspended'      => 0,
                'updated_at'        => date('Y-m-d H:i:s'),
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
        } elseif ($action === 'reassign') {
            $assignTo = (int) ($input['assign_to'] ?? 0);
            if ($assignTo) {
                $db->table('user_reports')->where('id', $reportId)->update([
                    'assigned_admin_id' => $assignTo,
                    'updated_at'        => date('Y-m-d H:i:s'),
                ]);
                return $this->respond(['success' => true, 'message' => 'Report reassigned']);
            }
            return $this->respond(['success' => false, 'message' => 'assign_to admin id is required for reassign'], 400);
        }

        $db->table('user_reports')->where('id', $reportId)->update([
            'status'       => 'reviewed',
            'reviewed_by'  => $adminId,
            'admin_notes'  => $adminNotes,
            'action_taken' => $actionTaken,
            'updated_at'   => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Report handled successfully', 'action' => $actionTaken]);
    }

    // ── Error Messages Management ─────────────────────
    /**
     * Get all error/app messages
     */
    public function getAllErrorMessages()
    {
        $db = \Config\Database::connect();
        $messages = $db->table('app_messages')
            ->orderBy('category', 'ASC')
            ->orderBy('message_key', 'ASC')
            ->get()
            ->getResultArray();
        return $this->respond(['success' => true, 'data' => $messages]);
    }

    /**
     * Create a new error message
     */
    public function createErrorMessage()
    {
        $db = \Config\Database::connect();
        $data = $this->request->getPost() ?: $this->request->getJSON(true) ?: [];

        // Validation
        if (empty($data['message_key'])) {
            return $this->respond(['success' => false, 'message' => 'Message key is required'], 400);
        }
        if (empty($data['message_value'])) {
            return $this->respond(['success' => false, 'message' => 'Message value is required'], 400);
        }

        // Check if key already exists
        $existing = $db->table('app_messages')
            ->where('message_key', $data['message_key'])
            ->get()
            ->getRowArray();

        if ($existing) {
            return $this->respond(['success' => false, 'message' => 'Message key already exists'], 400);
        }

        // Insert new message
        $insertData = [
            'message_key' => $data['message_key'],
            'message_value' => $data['message_value'],
            'category' => $data['category'] ?? 'general',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        try {
            $result = $db->table('app_messages')->insert($insertData);
            if ($result) {
                return $this->respond(['success' => true, 'message' => 'Error message created successfully']);
            }
        } catch (\Exception $e) {
            return $this->respond(['success' => false, 'message' => 'Failed to create message: ' . $e->getMessage()], 500);
        }

        return $this->respond(['success' => false, 'message' => 'Failed to create error message'], 500);
    }

    /**
     * Update an error message by ID
     */
    public function updateErrorMessage($id)
    {
        $db = \Config\Database::connect();
        $data = $this->request->getPost() ?: $this->request->getJSON(true) ?: [];

        // Validation
        if (empty($data['message_value'])) {
            return $this->respond(['success' => false, 'message' => 'Message value is required'], 400);
        }

        // Check if message exists
        $message = $db->table('app_messages')
            ->where('id', $id)
            ->get()
            ->getRowArray();

        if (!$message) {
            return $this->respond(['success' => false, 'message' => 'Error message not found'], 404);
        }

        // Update message
        $updateData = [
            'message_value' => $data['message_value'],
            'category' => $data['category'] ?? $message['category'],
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        try {
            $db->table('app_messages')->where('id', $id)->update($updateData);
            return $this->respond(['success' => true, 'message' => 'Error message updated successfully']);
        } catch (\Exception $e) {
            return $this->respond(['success' => false, 'message' => 'Failed to update message: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Delete an error message by ID
     */
    public function deleteErrorMessage($id)
    {
        $db = \Config\Database::connect();

        // Check if message exists
        $message = $db->table('app_messages')
            ->where('id', $id)
            ->get()
            ->getRowArray();

        if (!$message) {
            return $this->respond(['success' => false, 'message' => 'Error message not found'], 404);
        }

        try {
            $db->table('app_messages')->where('id', $id)->delete();
            return $this->respond(['success' => true, 'message' => 'Error message deleted successfully']);
        } catch (\Exception $e) {
            return $this->respond(['success' => false, 'message' => 'Failed to delete message: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get messages by category
     */
    public function getErrorMessagesByCategory($category)
    {
        $db = \Config\Database::connect();
        $messages = $db->table('app_messages')
            ->where('category', $category)
            ->orderBy('message_key', 'ASC')
            ->get()
            ->getResultArray();
        return $this->respond(['success' => true, 'data' => $messages]);
    }

    /**
     * Search error messages by key or value
     */
    public function searchErrorMessages()
    {
        $db = \Config\Database::connect();
        $query = $this->request->getGet('q') ?? '';

        if (empty($query)) {
            return $this->respond(['success' => false, 'message' => 'Search query is required'], 400);
        }

        $messages = $db->table('app_messages')
            ->like('message_key', $query)
            ->orLike('message_value', $query)
            ->orderBy('message_key', 'ASC')
            ->get()
            ->getResultArray();

        return $this->respond(['success' => true, 'data' => $messages]);
    }

    /**
     * POST /api/v1/superadmin/test-phonepe
     * Test PhonePe credentials by requesting an auth token
     */
    public function testPhonePeConnection()
    {
        $phonepe    = new \App\Libraries\PhonePe();
        $tokenData  = $phonepe->getAuthToken();

        if (isset($tokenData['access_token'])) {
            return $this->respond([
                'success' => true,
                'message' => 'Successfully connected to PhonePe! Auth token received.',
            ]);
        }

        return $this->respond([
            'success' => false,
            'message' => 'Failed to connect to PhonePe. Check your credentials.',
            'debug'   => $tokenData,
        ]);
    }

    // ── Landing Content Management ─────────────────────

    /**
     * POST /api/v1/superadmin/update-landing-content
     * Accepts JSON body: { key: value, ... }
     * Saves each pair to system_settings (upsert).
     */
    public function updateLandingContent()
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db   = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?: $this->request->getPost() ?: [];

        $allowed = [
            'hero_slides', 'display_categories', 'cta_title', 'cta_subtitle',
            'footer_description', 'section_title_categories', 'section_title_products',
            'footer_quick_links', 'footer_policy_links', 'footer_social_links',
            'how_it_works_steps', 'stats_banner', 'trust_features', 'testimonials',
            'aot_sections', 'category_cards',
        ];

        $saved = 0;
        foreach ($data as $key => $value) {
            if (!in_array($key, $allowed)) continue;
            $strValue = is_array($value) ? json_encode($value) : (string) $value;
            $existing = $db->table('system_settings')->where('setting_key', $key)->get()->getRowArray();
            if ($existing) {
                $db->table('system_settings')->where('setting_key', $key)->update([
                    'setting_value' => $strValue,
                    'updated_at'    => date('Y-m-d H:i:s'),
                ]);
            } else {
                $db->table('system_settings')->insert([
                    'setting_key'   => $key,
                    'setting_value' => $strValue,
                    'updated_at'    => date('Y-m-d H:i:s'),
                ]);
            }
            $saved++;
        }

        return $this->respond(['success' => true, 'message' => "Landing content updated ({$saved} keys saved)."]);
    }

    /**
     * POST /api/v1/superadmin/upload-landing-card-image
     * Accepts multipart form: image file + optional index
     * Returns the public path to the uploaded image.
     */
    public function uploadLandingCardImage()
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            log_message('error', 'Unauthorized upload attempt by user: ' . ($jwtUser['email'] ?? 'unknown'));
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $file = $this->request->getFile('image');
        if (!$file || !$file->isValid()) {
            $err = $file ? $file->getErrorString() : 'No file provided';
            log_message('error', 'Invalid image upload: ' . $err);
            return $this->respond(['success' => false, 'message' => 'Invalid image: ' . $err], 400);
        }

        if ($file->hasMoved()) {
            log_message('error', 'File already moved');
            return $this->respond(['success' => false, 'message' => 'File already processed.'], 400);
        }

        $uploadPath = FCPATH . 'uploads/landing-cards/';
        if (!is_dir($uploadPath)) {
            if (!mkdir($uploadPath, 0777, true)) {
                log_message('error', 'Failed to create upload directory: ' . $uploadPath);
                return $this->respond(['success' => false, 'message' => 'Failed to create upload directory on server.'], 500);
            }
        }

        $newName = $file->getRandomName();
        if (!$file->move($uploadPath, $newName)) {
            log_message('error', 'Failed to move file to: ' . $uploadPath);
            return $this->respond(['success' => false, 'message' => 'Failed to save file on server.'], 500);
        }

        $publicPath = 'uploads/landing-cards/' . $newName;
        log_message('info', 'Image uploaded successfully: ' . $publicPath);

        return $this->respond([
            'success' => true,
            'message' => 'Image uploaded.',
            'path'    => $publicPath,
            'url'     => base_url($publicPath),
        ]);
    }
}
