<?php

namespace App\Controllers\Api;

use App\Controllers\Api\BaseApiController;

class SuperAdminApi extends BaseApiController
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

            // Sync deduction_threshold across all rows in the same filter group
            $db->table('pricing_rules')
               ->where('filter_type', $filterType)
               ->where('filter_value', $filterValue)
               ->update(['deduction_threshold' => $row['deduction_threshold']]);

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

            // Sync threshold across group
            $db->table('rental_pricing_rules')
               ->where('filter_type', $filterType)
               ->where('filter_value', $filterValue)
               ->update(['deposit_deduction_threshold' => $row['deposit_deduction_threshold']]);

            return $this->respond(['success' => true, 'message' => 'Rental rule updated', 'id' => $id]);
        } else {
            $existing = $this->checkOverlappingRules('rental_pricing_rules', $filterType, $filterValue, $row['depreciation_range_min'], $row['depreciation_range_max']);
            if ($existing) {
                return $this->respond(['success' => false, 'message' => "Overlap detected with existing rule (Range: {$existing['depreciation_range_min']} - " . ($existing['depreciation_range_max'] > 0 ? $existing['depreciation_range_max'] : '∞') . ")"], 400);
            }
            $db->table('rental_pricing_rules')->insert($row);
            $row['id'] = $db->insertID();

            // Sync threshold across group
            $db->table('rental_pricing_rules')
               ->where('filter_type', $filterType)
               ->where('filter_value', $filterValue)
               ->update(['deposit_deduction_threshold' => $row['deposit_deduction_threshold']]);

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
                p.views_count as product_views, p.dispatch_city, p.dispatch_state, p.dispatch_pin_code,
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
                p.title as product_title, p.listing_type, p.original_price, p.dispatch_city, p.dispatch_state, p.dispatch_pin_code,
                p.rental_cost as product_rental_cost, p.rental_deposit as product_rental_deposit,
                (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) as product_image,
                (SELECT COUNT(*) FROM offers WHERE product_id = o.product_id AND id != o.id AND status = \'accepted\' AND listing_type = \'sell\') as is_product_sold,
                (SELECT COUNT(*) FROM offers WHERE product_id = o.product_id AND id != o.id AND status = \'accepted\' AND listing_type = \'rent\' AND rental_start_date <= o.rental_end_date AND rental_end_date >= o.rental_start_date AND p.listing_type = \'rent\') as is_rental_blocked,
                u.name as seller_name, u.mobile as seller_mobile, u.email as seller_email, u.seller_rating_avg, u.seller_rating_count,
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

        // Booked dates for rental conflict detection (both sent and received offers)
        $sentProductIds = array_unique(array_column($sent, 'product_id'));
        $receivedProductIds = array_unique(array_column($received, 'product_id'));
        $productIds = array_unique(array_merge($sentProductIds, $receivedProductIds));
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
            'minRentalDays'        => (int) getSystemSetting('min_rental_days', 3),
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
            'pending_products' => $db->table('products')->groupStart()->where('status', 'pending')->orWhere('edit_request', 'pending')->groupEnd()->countAllResults(),
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
            ->select('id, name, email, mobile, address, pin_code, user_type, role, is_blocked, is_verified, reliability_score, buyer_rating_avg, buyer_rating_count, seller_rating_avg, seller_rating_count, blocked_seller, blocked_buyer, created_at');

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

    public function updateAdmin($id)
    {
        $db = \Config\Database::connect();
        
        // Support both JSON and Post data
        $json = $this->request->getJSON(true);
        $name = $json['name'] ?? $this->request->getPost('name');
        $email = $json['email'] ?? $this->request->getPost('email');
        $mobile = $json['mobile'] ?? $this->request->getPost('mobile');
        $password = $json['password'] ?? $this->request->getPost('password');

        if (!$name || !$email) {
            return $this->respond(['success' => false, 'message' => 'Name and email are required.'], 400);
        }

        $admin = $db->table('users')->where('id', $id)->where('role', 'admin')->get()->getRowArray();
        if (!$admin) {
            return $this->respond(['success' => false, 'message' => 'Admin not found.'], 404);
        }

        // Check if email already exists for another admin
        $emailExists = $db->table('users')->where('email', $email)->where('id !=', $id)->countAllResults();
        if ($emailExists) {
            return $this->respond(['success' => false, 'message' => 'Email already exists for another user.'], 400);
        }

        $updateData = [
            'name' => $name,
            'email' => $email,
            'mobile' => $mobile,
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        // Only update password if provided
        if ($password) {
            $updateData['password'] = password_hash($password, PASSWORD_DEFAULT);
        }

        $db->table('users')->where('id', $id)->update($updateData);

        return $this->respond(['success' => true, 'message' => 'Admin updated successfully.']);
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
        
        // Check for duplicate
        $exists = $db->table('listing_types')->where('type_name', $name)->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Listing type with this name already exists.'], 400);
        }
        
        $data = [
            'type_name' => $name,
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
        
        // Check for duplicate
        $exists = $db->table('genders')->where('name', $name)->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Gender with this name already exists.'], 400);
        }
        
        $db->table('genders')->insert(['name' => $name, 'created_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Gender added.']);
    }

    public function addProductType()
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('name');
        $ltId = $this->request->getPost('listing_type_id');
        if (!$name || !$ltId) return $this->respond(['success' => false, 'message' => 'Name and listing type are required.'], 400);

        // Validate that listing_type_id exists in database
        $existingLt = $db->table('listing_types')->where('id', $ltId)->select('id')->get()->getRowArray();
        if (!$existingLt) {
            return $this->respond(['success' => false, 'message' => 'Invalid listing type ID: ' . $ltId . '. This listing type does not exist in the database.'], 400);
        }

        // Check for duplicate globally by name only (case-insensitive)
        $exists = $db->table('product_types')->where('LOWER(name)', strtolower($name))->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Product type with this name already exists. Product type names must be unique across all listing types.'], 400);
        }

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
        
        // Validate product_type_ids is not empty
        if (empty($ptIds)) {
            return $this->respond(['success' => false, 'message' => 'At least one product type is required.'], 400);
        }
        
        // Validate that product_type_ids exist in database
        $existingPtIds = $db->table('product_types')->whereIn('id', $ptIds)->select('id')->get()->getResultArray();
        $validPtIds = array_column($existingPtIds, 'id');
        $invalidPtIds = array_diff($ptIds, $validPtIds);
        
        if (!empty($invalidPtIds)) {
            return $this->respond(['success' => false, 'message' => 'Invalid product type IDs: ' . implode(', ', $invalidPtIds) . '. These product types do not exist in the database.'], 400);
        }
        
        // Check for duplicate
        $exists = $db->table('categories')->where('category_name', $name)->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Category with this name already exists.'], 400);
        }
        
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
        if (empty($catIds)) return $this->respond(['success' => false, 'message' => 'At least one Category is required.'], 400);
        
        // Validate that category_ids exist in database
        $existingCatIds = $db->table('categories')->whereIn('id', $catIds)->select('id')->get()->getResultArray();
        $validCatIds = array_column($existingCatIds, 'id');
        $invalidCatIds = array_diff($catIds, $validCatIds);
        
        if (!empty($invalidCatIds)) {
            return $this->respond(['success' => false, 'message' => 'Invalid category IDs: ' . implode(', ', $invalidCatIds) . '. These categories do not exist in the database.'], 400);
        }
        
        // Check if selected categories have genders - if no genders in parent categories, gender is mandatory for sub-category
        $categories = $db->table('categories')->whereIn('id', $catIds)->get()->getResultArray();
        $categoriesWithGenders = 0;
        foreach ($categories as $cat) {
            $catAppliesTo = json_decode($cat['applies_to'] ?? '[]', true);
            if (!empty($catAppliesTo)) {
                $categoriesWithGenders++;
            }
        }
        
        // Only make gender mandatory if categories are selected AND none of them have genders
        if (!empty($categories) && $categoriesWithGenders === 0) {
            // All selected categories have no genders - sub-category must have genders
            if (empty($appliesTo)) {
                return $this->respond(['success' => false, 'message' => 'Since the selected parent category has no genders, you must select at least one gender for this sub-category.'], 400);
            }
        }
        // If at least one parent category has genders, gender is optional for sub-category
        
        // Check for duplicate
        $exists = $db->table('sub_categories')->where('name', $name)->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Sub-category with this name already exists.'], 400);
        }
        
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
        
        // Check for duplicate by name or hex code
        $exists = $db->table('colors')->groupStart()->where('name', $name)->orWhere('hex_code', $hex ?? '#000000')->groupEnd()->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Color with this name or hex code already exists.'], 400);
        }
        
        $db->table('colors')->insert(['name' => $name, 'hex_code' => $hex ?? '#000000', 'created_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Color added.']);
    }

    public function updateListingType($id)
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('type_name') ?? $this->request->getPost('name');
        
        // Validate name is not empty
        if (empty($name)) {
            return $this->respond(['success' => false, 'message' => 'Listing type name cannot be empty.'], 400);
        }
        
        $gender = strtolower(trim($this->request->getPost('gender_config') ?? 'optional'));
        
        // Validate gender_config value
        $allowedGenderConfigs = ['optional', 'hidden', 'mandatory'];
        if (!in_array($gender, $allowedGenderConfigs)) {
            return $this->respond(['success' => false, 'message' => 'Invalid gender_config value. Must be one of: ' . implode(', ', $allowedGenderConfigs)], 400);
        }
        
        $attrs = $this->request->getPost('attributes');
        $config = ['gender' => $gender];
        if ($attrs) $config['attributes'] = json_decode($attrs, true) ?: [];
        
        // Check for duplicate (excluding current record, case-insensitive)
        $exists = $db->table('listing_types')->where('LOWER(type_name)', strtolower($name))->where('id !=', $id)->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Listing type with this name already exists.'], 400);
        }
        
        $data = ['type_name' => $name, 'field_config' => json_encode($config)];
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
        $name = $this->request->getPost('name');
        
        // Check for duplicate (excluding current record)
        $exists = $db->table('genders')->where('name', $name)->where('id !=', $id)->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Gender with this name already exists.'], 400);
        }
        
        $db->table('genders')->where('id', $id)->update(['name' => $name]);
        return $this->respond(['success' => true, 'message' => 'Gender updated.']);
    }

    public function updateProductType($id)
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('name');
        $ltId = $this->request->getPost('listing_type_id');
        
        // Validate that listing_type_id exists in database
        if ($ltId) {
            $existingLt = $db->table('listing_types')->where('id', $ltId)->select('id')->get()->getRowArray();
            if (!$existingLt) {
                return $this->respond(['success' => false, 'message' => 'Invalid listing type ID: ' . $ltId . '. This listing type does not exist in the database.'], 400);
            }
        }
        
        // Check for duplicate (same name within same listing type, excluding current record)
        $exists = $db->table('product_types')->where('name', $name)->where('listing_type_id', $ltId)->where('id !=', $id)->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Product type with this name already exists in this listing type.'], 400);
        }
        
        $db->table('product_types')->where('id', $id)->update([
            'name' => $name,
            'listing_type_id' => $ltId,
        ]);
        return $this->respond(['success' => true, 'message' => 'Product type updated.']);
    }

    public function updateCategory($id)
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('category_name');
        
        // Validate name is not empty
        if (empty($name)) {
            return $this->respond(['success' => false, 'message' => 'Category name cannot be empty.'], 400);
        }
        
        $ptIds = $this->request->getPost('product_type_ids') ?? [];
        $appliesTo = $this->request->getPost('applies_to') ?? [];
        $attrs = $this->request->getPost('attributes');
        
        // Validate product_type_ids is not empty
        if (empty($ptIds)) {
            return $this->respond(['success' => false, 'message' => 'At least one product type is required.'], 400);
        }
        
        // Validate that product_type_ids exist in database
        $existingPtIds = $db->table('product_types')->whereIn('id', $ptIds)->select('id')->get()->getResultArray();
        $validPtIds = array_column($existingPtIds, 'id');
        $invalidPtIds = array_diff($ptIds, $validPtIds);
        
        if (!empty($invalidPtIds)) {
            return $this->respond(['success' => false, 'message' => 'Invalid product type IDs: ' . implode(', ', $invalidPtIds) . '. These product types do not exist in the database.'], 400);
        }
        
        // Check for duplicate (excluding current record)
        $exists = $db->table('categories')->where('category_name', $name)->where('id !=', $id)->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Category with this name already exists.'], 400);
        }
        
        // Check if removing genders would affect sub-categories without genders
        if (empty($appliesTo)) {
            // User is removing all genders - check if any sub-categories exist without genders
            $subCategories = $db->table('sub_categories')->get()->getResultArray();
            foreach ($subCategories as $sc) {
                $scCatIds = json_decode($sc['category_ids'] ?? '[]', true);
                if (in_array($id, $scCatIds)) {
                    $scAppliesTo = json_decode($sc['applies_to'] ?? '[]', true);
                    if (empty($scAppliesTo)) {
                        return $this->respond(['success' => false, 'message' => 'Cannot remove genders: This category has sub-categories without genders. Please add genders to those sub-categories first.'], 400);
                    }
                }
            }
        }
        
        $data = [
            'category_name' => $name,
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
        $name = $this->request->getPost('name');
        
        // Validate name is not empty
        if (empty($name)) {
            return $this->respond(['success' => false, 'message' => 'Sub-category name cannot be empty.'], 400);
        }
        
        $catIds = $this->request->getPost('category_ids') ?? [];
        $appliesTo = $this->request->getPost('applies_to') ?? [];
        $attrs = $this->request->getPost('attributes');
        
        if (empty($catIds)) return $this->respond(['success' => false, 'message' => 'At least one Category is required.'], 400);
        
        // Validate that category_ids exist in database
        $existingCatIds = $db->table('categories')->whereIn('id', $catIds)->select('id')->get()->getResultArray();
        $validCatIds = array_column($existingCatIds, 'id');
        $invalidCatIds = array_diff($catIds, $validCatIds);
        
        if (!empty($invalidCatIds)) {
            return $this->respond(['success' => false, 'message' => 'Invalid category IDs: ' . implode(', ', $invalidCatIds) . '. These categories do not exist in the database.'], 400);
        }
        
        // Check if selected categories have genders - if no genders in parent categories, gender is mandatory for sub-category
        $categories = $db->table('categories')->whereIn('id', $catIds)->get()->getResultArray();
        $categoriesWithGenders = 0;
        foreach ($categories as $cat) {
            $catAppliesTo = json_decode($cat['applies_to'] ?? '[]', true);
            if (!empty($catAppliesTo)) {
                $categoriesWithGenders++;
            }
        }
        
        // Only make gender mandatory if categories are selected AND none of them have genders
        if (!empty($categories) && $categoriesWithGenders === 0) {
            // All selected categories have no genders - sub-category must have genders
            if (empty($appliesTo)) {
                return $this->respond(['success' => false, 'message' => 'Since the selected parent category has no genders, you must select at least one gender for this sub-category.'], 400);
            }
        }
        // If at least one parent category has genders, gender is optional for sub-category
        
        // Check for duplicate (excluding current record)
        $exists = $db->table('sub_categories')->where('name', $name)->where('id !=', $id)->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Sub-category with this name already exists.'], 400);
        }
        
        $data = [
            'name' => $name,
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
        $name = $this->request->getPost('name');
        $hex = $this->request->getPost('hex_code');
        
        // Check for duplicate by name or hex code (excluding current record)
        $exists = $db->table('colors')->groupStart()->where('name', $name)->orWhere('hex_code', $hex)->groupEnd()->where('id !=', $id)->countAllResults();
        if ($exists) {
            return $this->respond(['success' => false, 'message' => 'Color with this name or hex code already exists.'], 400);
        }
        
        $db->table('colors')->where('id', $id)->update([
            'name' => $name,
            'hex_code' => $hex,
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
            ->select('b.*, u.name as seller_name, u.mobile as seller_mobile')
            ->join('users u', 'u.id = b.seller_id', 'left')
            ->orderBy('b.created_at', 'DESC')
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

    public function createSellerBrand()
    {
        $db = \Config\Database::connect();
        $data = [
            'brand_name' => $this->request->getPost('brand_name'),
            'seller_id' => $this->request->getPost('seller_id'),
            'description' => $this->request->getPost('description') ?? '',
            'created_by_admin' => 1,
            'created_at' => date('Y-m-d H:i:s'),
        ];
        if (!$data['brand_name'] || !$data['seller_id']) {
            return $this->respond(['success' => false, 'message' => 'Brand name and Seller are required.'], 400);
        }

        // Handle multiple listing types
        $ltIds = $this->request->getPost('listing_type_ids');
        if ($ltIds) {
            if (is_string($ltIds)) {
                $ltIds = json_decode($ltIds, true);
            }
            if (is_array($ltIds) && !empty($ltIds)) {
                $ltIds = array_filter(array_map('intval', $ltIds));
                $data['listing_type_ids'] = json_encode(array_values($ltIds));
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
        $desc = $this->request->getPost('description');
        if ($desc !== null) $data['description'] = $desc;
        $isBlocked = $this->request->getPost('is_blocked');
        if ($isBlocked !== null) $data['is_blocked'] = $isBlocked;
        $isActive = $this->request->getPost('is_active');
        if ($isActive !== null) $data['is_active'] = $isActive;

        // Handle multiple listing types
        $ltIds = $this->request->getPost('listing_type_ids');
        if ($ltIds !== null) {
            if (is_string($ltIds)) {
                $ltIds = json_decode($ltIds, true);
            }
            if (is_array($ltIds) && !empty($ltIds)) {
                $ltIds = array_filter(array_map('intval', $ltIds));
                $data['listing_type_ids'] = json_encode(array_values($ltIds));
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
                }
            }
        }

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
        // Only mark the brand as inactive — do NOT detag products.
        // The SQL JOINs use `AND ob.is_active = 1` so the brand name
        // will silently disappear from all UI without touching products.
        $db->table('orignal_brands')->where('id', $id)->update(['is_active' => 0]);

        return $this->respond(['success' => true, 'message' => 'Original brand deactivated. Brand name hidden from all products (products are NOT detagged).']);
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
            'is_blocked'       => 1,
            'rejection_reason' => $reason,
        ]);

        // Reject all products of that original brand, but save their pre-block status
        // so unblock can restore the exact original status.
        $products = $db->table('products')
            ->where('orignal_brand_id', $id)
            ->whereNotIn('status', ['rejected'])   // skip already-rejected ones
            ->get()->getResultArray();

        foreach ($products as $product) {
            $preStatus = $product['status'];
            $db->table('products')->where('id', $product['id'])->update([
                'status'       => 'rejected',
                'admin_remarks' => 'Original Brand Blocked: ' . $reason . ' [pre_status:' . $preStatus . ']',
            ]);
        }

        return $this->respond(['success' => true, 'message' => 'Original brand blocked and products rejected.']);
    }

    public function unblockOriginalBrand($id)
    {
        $db = \Config\Database::connect();
        $db->table('orignal_brands')->where('id', $id)->update(['is_blocked' => 0, 'rejection_reason' => null]);

        // Restore each product to its pre-block status (not always 'pending')
        $products = $db->table('products')
            ->where('orignal_brand_id', $id)
            ->like('admin_remarks', 'Original Brand Blocked:', 'after')
            ->get()->getResultArray();

        foreach ($products as $product) {
            // Parse pre_status from admin_remarks: "Original Brand Blocked: reason [pre_status:approved]"
            $preStatus = 'pending'; // fallback
            if (preg_match('/\[pre_status:([a-z]+)\]/', $product['admin_remarks'] ?? '', $m)) {
                $preStatus = $m[1];
            }
            $db->table('products')->where('id', $product['id'])->update([
                'status'        => $preStatus,
                'admin_remarks' => null,
            ]);
        }

        return $this->respond(['success' => true, 'message' => 'Original brand unblocked. Products restored to their original statuses.']);
    }

    // ── Seller Brand Actions ─────────────────────────────

    public function deactivateSellerBrand($id)
    {
        $db = \Config\Database::connect();
        // Only mark the brand as inactive — do NOT detag products.
        // The SQL JOINs use `AND b.is_active = 1` so the brand name
        // will silently disappear from all UI without touching products.
        $db->table('brands')->where('id', $id)->update(['is_active' => 0]);

        return $this->respond(['success' => true, 'message' => 'Seller brand deactivated. Brand name hidden from all products (products are NOT detagged).']);
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
            'is_blocked'       => 1,
            'rejection_reason' => $reason,
        ]);

        // Reject all products of that seller brand, but save their pre-block status
        $products = $db->table('products')
            ->where('brand_id', $id)
            ->whereNotIn('status', ['rejected'])
            ->get()->getResultArray();

        foreach ($products as $product) {
            $preStatus = $product['status'];
            $db->table('products')->where('id', $product['id'])->update([
                'status'        => 'rejected',
                'admin_remarks' => 'Seller Brand Blocked: ' . $reason . ' [pre_status:' . $preStatus . ']',
            ]);
        }

        return $this->respond(['success' => true, 'message' => 'Seller brand blocked and products rejected.']);
    }

    public function unblockSellerBrand($id)
    {
        $db = \Config\Database::connect();
        $db->table('brands')->where('id', $id)->update(['is_blocked' => 0, 'rejection_reason' => null]);

        // Restore each product to its pre-block status (not always 'pending')
        $products = $db->table('products')
            ->where('brand_id', $id)
            ->like('admin_remarks', 'Seller Brand Blocked:', 'after')
            ->get()->getResultArray();

        foreach ($products as $product) {
            // Parse pre_status from admin_remarks: "Seller Brand Blocked: reason [pre_status:approved]"
            $preStatus = 'pending'; // fallback
            if (preg_match('/\[pre_status:([a-z]+)\]/', $product['admin_remarks'] ?? '', $m)) {
                $preStatus = $m[1];
            }
            $db->table('products')->where('id', $product['id'])->update([
                'status'        => $preStatus,
                'admin_remarks' => null,
            ]);
        }

        return $this->respond(['success' => true, 'message' => 'Seller brand unblocked. Products restored to their original statuses.']);
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
            ->select('r.*, p.title as original_title, p.listing_type, p.category, p.color, p.used_times, p.usage_label, p.price, p.original_price, p.rental_cost, p.rental_deposit, p.description, u.name as seller_name, u.email as seller_email, u.seller_rating_avg, u.seller_rating_count')
            ->join('products p', 'p.id = r.product_id', 'left')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->where('r.status', 'pending')
            ->orderBy('r.created_at', 'DESC')
            ->get()->getResultArray();
        
        // Attach product images for each request
        foreach ($requests as &$request) {
            $request['images'] = $db->table('product_images')
                ->where('product_id', $request['product_id'])
                ->orderBy('display_order', 'ASC')
                ->get()->getResultArray();
        }
        
        return $this->respond(['success' => true, 'data' => $requests]);
    }

    public function getEditComparison($id)
    {
        $db = \Config\Database::connect();
        $request = $db->table('product_edit_requests')->where('id', $id)->get()->getRowArray();
        if (!$request) return $this->respond(['success' => false, 'message' => 'Not found'], 404);

        $original = $db->table('products p')
            ->select('p.*, ob.brand_name as orignal_brand')
            ->join('orignal_brands ob', 'ob.id = p.orignal_brand_id', 'left')
            ->where('p.id', $request['product_id'])
            ->get()->getRowArray();

        // Use original_images_snapshot if available, otherwise fetch current product images
        $originalImagesSnapshot = json_decode($request['original_images_snapshot'] ?? '[]', true) ?: [];
        if (!empty($originalImagesSnapshot)) {
            // Build original images array from snapshot
            $originalImages = [];
            foreach ($originalImagesSnapshot as $index => $imagePath) {
                $originalImages[] = [
                    'id' => null, // Snapshot doesn't have IDs
                    'image_path' => $imagePath,
                    'display_order' => $index,
                ];
            }
        } else {
            // Fallback to current product images for backward compatibility
            $originalImages = $db->table('product_images')->where('product_id', $request['product_id'])->get()->getResultArray();
        }

        // Resolve brand name in updated_data if orignal_brand_id is present
        $updatedData = json_decode($request['updated_data'], true) ?: [];
        if (!empty($updatedData['orignal_brand_id'])) {
            $brand = $db->table('orignal_brands')->where('id', $updatedData['orignal_brand_id'])->get()->getRowArray();
            if ($brand) {
                $updatedData['orignal_brand'] = $brand['brand_name'];
            }
        }
        $request['updated_data'] = json_encode($updatedData);

        // Decode image-related fields for frontend
        $tempImages = json_decode($request['temp_images'] ?? '[]', true) ?: [];
        $deletedImagesIds = json_decode($request['deleted_images_ids'] ?? '[]', true) ?: [];

        return $this->respond([
            'success' => true,
            'data' => [
                'request' => $request,
                'original' => $original,
                'updated_data' => $updatedData,
                'temp_images' => $tempImages,
                'deleted_images_ids' => $deletedImagesIds,
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
        // Force status back to approved after merging edit
        $updatedData['status'] = 'approved';
        $updatedData['updated_at'] = date('Y-m-d H:i:s');
        $updatedData['edit_request'] = null;
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

        // Notify the seller
        $product = $db->table('products')->where('id', $request['product_id'])->get()->getRowArray();
        if ($product) {
            $db->table('notifications')->insert([
                'user_id' => $request['seller_id'],
                'title' => 'Edit Request Approved',
                'message' => 'Your edit request for "' . ($product['title'] ?? 'your product') . '" has been approved and applied.',
                'type' => 'product_edit',
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }

        return $this->respond(['success' => true, 'message' => 'Edit request approved and merged.']);
    }

    public function rejectEditRequest($id)
    {
        $db = \Config\Database::connect();
        $remarks = $this->request->getJsonVar('remarks') ?? '';

        // First check if this is a product ID (for admin edits) - check this first since admin edits use product ID
        $product = $db->table('products')->where('id', $id)->get()->getRowArray();
        if ($product && in_array($product['pending_reason'] ?? '', ['admin_edit', 'seller_edit', 'both_edit'])) {
            // Restore product from previous_data snapshot
            if (!empty($product['previous_data'])) {
                $previousData = json_decode($product['previous_data'], true);
                if (is_array($previousData)) {
                    // Restore the fields from previous_data
                    $restoreFields = [
                        'title', 'description', 'listing_type', 'listing_type_category',
                        'product_type', 'category', 'sub_category', 'color', 'gender',
                        'used_times', 'original_price', 'price', 'rental_cost', 'rental_deposit',
                        'dispatch_address', 'dispatch_city', 'dispatch_state', 'dispatch_pin_code',
                        'has_bill', 'allow_alter_fitting',
                    ];
                    $updateData = [];
                    foreach ($restoreFields as $field) {
                        if (isset($previousData[$field])) {
                            $updateData[$field] = $previousData[$field];
                        }
                    }
                    // Restore images from snapshot
                    if (isset($previousData['_images']) && is_array($previousData['_images'])) {
                        // Delete current images
                        $db->table('product_images')->where('product_id', $id)->delete();
                        // Restore previous images
                        foreach ($previousData['_images'] as $idx => $imgPath) {
                            $db->table('product_images')->insert([
                                'product_id' => $id,
                                'image_path' => $imgPath,
                                'display_order' => $idx,
                                'created_at' => date('Y-m-d H:i:s'),
                            ]);
                        }
                    }
                    $updateData['status'] = 'approved';
                    $updateData['edit_request'] = 0;
                    $updateData['pending_reason'] = null;
                    $updateData['previous_data'] = null;
                    $updateData['admin_remarks'] = $remarks;
                    $updateData['updated_at'] = date('Y-m-d H:i:s');
                    $db->table('products')->where('id', $id)->update($updateData);
                } else {
                    // If previous_data is invalid, just clear pending status
                    $db->table('products')->where('id', $id)->update([
                        'status' => 'approved',
                        'edit_request' => 0,
                        'pending_reason' => null,
                        'previous_data' => null,
                        'admin_remarks' => $remarks,
                        'updated_at' => date('Y-m-d H:i:s'),
                    ]);
                }
            } else {
                // No previous_data, just clear pending status
                $db->table('products')->where('id', $id)->update([
                    'status' => 'approved',
                    'edit_request' => 0,
                    'pending_reason' => null,
                    'previous_data' => null,
                    'admin_remarks' => $remarks,
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);
            }

            // Notify the editor (admin/seller)
            $editorRole = $product['pending_reason'] === 'admin_edit' ? 'Admin' : 'Seller';
            $db->table('notifications')->insert([
                'user_id' => $product['seller_id'],
                'title' => 'Product Edit Rejected',
                'message' => "Your edit request for product \"" . ($product['title'] ?? 'ID:' . $id) . "\" was rejected by Super Admin. Reason: " . ($remarks ?: 'No reason provided'),
                'type' => 'product_edit',
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            return $this->respond(['success' => true, 'message' => 'Product edit rejected and restored.']);
        }

        // If not found as product with pending_reason, check if this is a product_edit_request ID (for seller edits)
        $request = $db->table('product_edit_requests')->where('id', $id)->get()->getRowArray();
        if ($request) {
            $db->table('product_edit_requests')->where('id', $id)->update(['status' => 'rejected', 'updated_at' => date('Y-m-d H:i:s')]);

            // Restore product to its original approved state (it was set to pending when edit was submitted)
            $db->table('products')->where('id', $request['product_id'])->update([
                'status' => 'approved',
                'edit_request' => 0,
                'pending_reason' => null,
                'previous_data' => null,
                'admin_remarks' => $remarks,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
            // Notify the seller
            $product = $db->table('products')->where('id', $request['product_id'])->get()->getRowArray();
            if ($product) {
                $db->table('notifications')->insert([
                    'user_id' => $request['seller_id'],
                    'title' => 'Edit Request Rejected',
                    'message' => 'Your edit request for "' . ($product['title'] ?? 'your product') . '" was rejected. Reason: ' . ($remarks ?: 'No reason provided'),
                    'type' => 'product_edit',
                    'is_read' => 0,
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }

            return $this->respond(['success' => true, 'message' => 'Edit request rejected.']);
        }

        return $this->respond(['success' => false, 'message' => 'Edit request or product not found'], 404);
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
        $data = $this->request->getJSON(true) ?: $this->request->getPost();
        $name    = $data['zone_name'] ?? null;
        $polygon = $data['zone_polygon'] ?? null;
        $state   = $data['state'] ?? null;
        $stateCode = $data['state_code'] ?? null;
        if (!$name) return $this->respond(['success' => false, 'message' => 'Zone name is required.'], 400);
        if (!$state) return $this->respond(['success' => false, 'message' => 'State is required for zone restriction.'], 400);
        $db->table('allowed_zones')->insert([
            'zone_name'   => $name,
            'state'       => $state,
            'state_code'  => $stateCode,
            'zone_polygon'=> $polygon,
            'is_active'   => 1,
            'created_at'  => date('Y-m-d H:i:s'),
        ]);
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

    public function userStateHeatmap()
    {
        $db = \Config\Database::connect();
        helper('geolocation');

        // 1. Get detailed stats via SQL
        $rows = $db->query("
            SELECT 
                TRIM(state) as state,
                user_type,
                COUNT(*) as total,
                SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified,
                MIN(created_at) as first_reg,
                MAX(created_at) as last_reg
            FROM users
            WHERE role NOT IN ('admin', 'super_admin', 'superadmin')
              AND state IS NOT NULL AND TRIM(state) != ''
            GROUP BY TRIM(state), user_type
            ORDER BY total DESC
        ")->getResultArray();

        $stateTotals = $db->query("
            SELECT 
                TRIM(state) as state,
                COUNT(*) as total,
                SUM(CASE WHEN user_type = 'seller' THEN 1 ELSE 0 END) as sellers,
                SUM(CASE WHEN user_type = 'buyer' THEN 1 ELSE 0 END) as buyers,
                SUM(CASE WHEN user_type = 'both' THEN 1 ELSE 0 END) as both_users
            FROM users
            WHERE role NOT IN ('admin', 'super_admin', 'superadmin')
              AND state IS NOT NULL AND TRIM(state) != ''
            GROUP BY TRIM(state)
            ORDER BY total DESC
        ")->getResultArray();

        // 2. Fetch all verified users for precise coordinate mapping (Heatmap)
        $allUsers = $db->table('users')
            ->select('state, pin_code, latitude, longitude, city')
            ->where('is_verified', 1)
            ->where('is_blocked', 0)
            ->get()
            ->getResultArray();

        $heatmapPoints = [];
        $preciseStateCounts = [];

        foreach ($allUsers as $u) {
            $st = $u['state'];
            if (empty($st) && !empty($u['pin_code'])) {
                $st = getStateFromPinCode($u['pin_code']);
            }

            if ($st) {
                $preciseStateCounts[$st] = ($preciseStateCounts[$st] ?? 0) + 1;
            }

            if (!empty($u['latitude']) && !empty($u['longitude']) && (float)$u['latitude'] != 0) {
                $heatmapPoints[] = [
                    'lat'   => (float)$u['latitude'],
                    'lng'   => (float)$u['longitude'],
                    'state' => $st,
                    'city'  => $u['city']
                ];
            }
        }

        // Summary stats
        $summary = [
            'total_users'   => $db->table('users')->whereNotIn('role', ['admin', 'super_admin', 'superadmin'])->countAllResults(),
            'total_sellers' => $db->table('users')->where('user_type', 'seller')->whereNotIn('role', ['admin', 'super_admin', 'superadmin'])->countAllResults(),
            'total_buyers'  => $db->table('users')->where('user_type', 'buyer')->whereNotIn('role', ['admin', 'super_admin', 'superadmin'])->countAllResults(),
            'total_both'    => $db->table('users')->where('user_type', 'both')->whereNotIn('role', ['admin', 'super_admin', 'superadmin'])->countAllResults(),
            'total_states'  => count($stateTotals),
        ];

        return $this->respond([
            'success' => true,
            'data' => [
                'by_state_type' => $rows,
                'state_totals'  => $stateTotals,
                'state_counts'  => $preciseStateCounts,
                'points'        => $heatmapPoints,
                'summary'       => $summary,
                'total_users'   => count($allUsers)
            ]
        ]);
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
            'display_page' => $this->request->getPost('display_page') ?? 'all',
            'payment_date' => $this->request->getPost('payment_date') ?: null,
            'start_date' => $this->request->getPost('start_date') ?: null,
            'end_date' => $this->request->getPost('end_date') ?: null,
            'is_active' => 1,
            'created_at' => date('Y-m-d H:i:s'),
        ];

        $file = $this->request->getFile('ad_media');
        if ($file && $file->isValid() && !$file->hasMoved()) {
            $newName = $file->getRandomName();
            $data['media_path'] = $newName;
            $data['ad_type'] = str_contains($file->getMimeType(), 'video') ? 'video' : 'image';
            $data['media_type'] = $file->getMimeType();
            $file->move(FCPATH . 'uploads/advertisements/', $newName);
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
            'display_page' => $this->request->getPost('display_page') ?? 'all',
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
            $data['media_path'] = $newName;
            $data['ad_type'] = str_contains($file->getMimeType(), 'video') ? 'video' : 'image';
            $data['media_type'] = $file->getMimeType();
            $file->move(FCPATH . 'uploads/advertisements/', $newName);
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
            ->select('p.*, u.name as seller_name, u.email as seller_email, u.seller_rating_avg, u.seller_rating_count, lt.type_name as listing_category_name, p.listing_type')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->join('listing_types lt', 'lt.type_name = p.listing_type_category', 'left')
            ->groupStart()
                ->where('p.status', 'pending')
                ->orWhere('p.edit_request', 'pending')
            ->groupEnd()
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

        $updateFields = [
            'status'       => $newStatus,
            'admin_remarks' => $remarks,
            'updated_at'   => date('Y-m-d H:i:s'),
        ];

        // Clear pending_reason and previous_data when status moves away from pending
        if (in_array($newStatus, ['approved', 'rejected'])) {
            if ($newStatus === 'approved' && !empty($product['previous_data'])) {
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
            $updateFields['pending_reason'] = null;
            $updateFields['previous_data'] = null;
        }

        $db->table('products')->where('id', $id)->update($updateFields);

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

        $allowedTypes = ['listing_types', 'genders', 'product_types', 'categories', 'sub_categories', 'colors', 'attributes'];
        if (!in_array($type, $allowedTypes)) {
            return $this->respond(['success' => false, 'message' => 'Invalid catalogue type.'], 400);
        }

        // Define expected headers for each type
        $expectedHeaders = [
            'listing_types' => ['name', 'gender_config', 'image'],
            'genders' => ['name'],
            'product_types' => ['name', 'listing_type'],
            'categories' => ['category_name', 'product_types', 'applies_to'],
            'sub_categories' => ['name', 'categories', 'applies_to'],
            'colors' => ['name', 'hex_code'],
            'attributes' => ['name', 'type', 'required', 'allowed_values', 'placeholder', 'entity_types', 'entity_ids'],
        ];

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

        // Validate that headers match the expected columns for the selected type
        $requiredHeaders = $expectedHeaders[$type] ?? [];
        $missingHeaders = array_diff($requiredHeaders, $header);
        $extraHeaders = array_diff($header, $requiredHeaders);
        
        if (!empty($missingHeaders) || !empty($extraHeaders)) {
            fclose($handle);
            $errorMsg = 'CSV template does not match the selected type.';
            if (!empty($missingHeaders)) {
                $errorMsg .= ' Missing required columns: ' . implode(', ', $missingHeaders) . '.';
            }
            if (!empty($extraHeaders)) {
                $errorMsg .= ' Extra columns found: ' . implode(', ', $extraHeaders) . '.';
            }
            return $this->respond([
                'success' => false, 
                'message' => $errorMsg,
                'expected_columns' => $requiredHeaders,
                'found_columns' => $header,
            ], 400);
        }

        $inserted = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];
        $now = date('Y-m-d H:i:s');
        $row = 1;

        while (($line = fgetcsv($handle)) !== false) {
            $row++;
            if (count($line) < count($header)) { 
                $skipped++; 
                $errors[] = "Row {$row}: Insufficient columns (Expected: " . implode(', ', $header) . ")"; 
                continue; 
            }
            $data = array_combine($header, array_map('trim', $line));

            try {
                switch ($type) {
                    case 'listing_types':
                        $name = $data['name'] ?? $data['type_name'] ?? '';
                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }
                        
                        $genderInput = trim($data['gender_config'] ?? '');
                        
                        // Blank value validation: skip if gender is blank
                        if ($genderInput === '') {
                            $skipped++;
                            $errors[] = "Row {$row}: Gender config is blank. Skipping row.";
                            continue 2;
                        }
                        
                        $gender = strtolower($genderInput);
                        
                        // Validate gender_config value (partial update: if invalid, skip but don't fail entire row if name exists)
                        $allowedGenderConfigs = ['optional', 'hidden', 'mandatory'];
                        if (!in_array($gender, $allowedGenderConfigs)) {
                            $skipped++;
                            $errors[] = "Row {$row}: Invalid gender_config '{$gender}'. Must be one of: " . implode(', ', $allowedGenderConfigs) . ". Skipping row.";
                            continue 2;
                        }
                        
                        $config = ['gender' => $gender];
                        
                        $rec = [
                            'type_name' => $name, 
                            'field_config' => json_encode($config)
                        ];
                        
                        $imageSource = $data['image'] ?? $data['image_path'] ?? '';
                        if ($imageSource) {
                            $processed = $this->processImage($imageSource, 'uploads/listing-types/');
                            if ($processed) $rec['image'] = $processed;
                        }
                        
                        // Check if exists (case-insensitive)
                        $existing = $db->table('listing_types')->where('LOWER(type_name)', strtolower($name))->get()->getRowArray();
                        if ($existing) {
                            $db->table('listing_types')->where('id', $existing['id'])->update($rec);
                            $updated++;
                        } else {
                            $rec['created_at'] = $now;
                            $db->table('listing_types')->insert($rec);
                            $inserted++;
                        }
                        break;

                    case 'genders':
                        $name = $data['name'] ?? '';
                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }
                        
                        // Check if exists (case-insensitive)
                        $existing = $db->table('genders')->where('LOWER(name)', strtolower($name))->get()->getRowArray();
                        if ($existing) {
                            $db->table('genders')->where('id', $existing['id'])->update(['name' => $name]);
                            $updated++;
                        } else {
                            $db->table('genders')->insert(['name' => $name, 'created_at' => $now]);
                            $inserted++;
                        }
                        break;

                    case 'product_types':
                        $name = $data['name'] ?? '';
                        $ltInput = trim($data['listing_type'] ?? $data['listing_type_id'] ?? '');

                        // Blank value validation: skip if listing type is blank
                        if ($ltInput === '') {
                            $skipped++;
                            $errors[] = "Row {$row}: Listing type is blank. Skipping row.";
                            continue 2;
                        }

                        // Name lookup for listing type
                        $ltId = null;
                        $lt = $db->table('listing_types')->where('LOWER(type_name)', strtolower($ltInput))->get()->getRowArray();
                        if ($lt) {
                            $ltId = $lt['id'];
                        }

                        // Validation: if listing type not found, skip
                        if (!$ltId) {
                            $skipped++;
                            $errors[] = "Row {$row}: Listing type '{$ltInput}' not found. Skipping row.";
                            continue 2;
                        }

                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }

                        // Check if exists globally by name only (case-insensitive)
                        $existing = $db->table('product_types')->where('LOWER(name)', strtolower($name))->get()->getRowArray();
                        if ($existing) {
                            $db->table('product_types')->where('id', $existing['id'])->update(['name' => $name, 'listing_type_id' => $ltId]);
                            $updated++;
                        } else {
                            $db->table('product_types')->insert(['name' => $name, 'listing_type_id' => $ltId, 'created_at' => $now]);
                            $inserted++;
                        }
                        break;

                    case 'categories':
                        $name = $data['category_name'] ?? $data['name'] ?? '';
                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }
                        
                        // Product types handling with partial update
                        $ptInput = trim($data['product_types'] ?? '');
                        
                        // Blank value validation: skip if product types is blank
                        if ($ptInput === '') {
                            $skipped++;
                            $errors[] = "Row {$row}: Product types is blank. Skipping row.";
                            continue 2;
                        }
                        
                        $names = array_map('trim', explode(',', $ptInput));
                        $pts = $db->table('product_types')->whereIn('LOWER(name)', array_map('strtolower', $names))->get()->getResultArray();
                        $foundNames = array_map('strtolower', array_column($pts, 'name'));
                        $ptIds = array_column($pts, 'id');
                        
                        // Partial update: log invalid product types but continue with valid ones
                        if (count($ptIds) < count($names)) {
                            $missing = [];
                            foreach ($names as $n) {
                                if (!in_array(strtolower($n), $foundNames)) $missing[] = $n;
                            }
                            if (!empty($missing)) {
                                $errors[] = "Row {$row}: Invalid product types skipped: " . implode(', ', $missing) . ". Proceeding with valid ones.";
                            }
                        }
                        
                        // Validate that at least one valid product type exists
                        if (empty($ptIds)) {
                            $skipped++;
                            $errors[] = "Row {$row}: No valid product types found. Category cannot be created without product types.";
                            continue 2;
                        }

                        // Gender handling with partial update
                        $appliesToInput = trim($data['applies_to'] ?? '');
                        $appliesTo = [];
                        
                        if ($appliesToInput !== '') {
                            $appliesTo = json_decode($appliesToInput, true);
                            if (!is_array($appliesTo)) {
                                $appliesTo = array_map('trim', explode(',', $appliesToInput));
                            }
                            
                            // Filter out "all" and convert to lowercase for comparison
                            $appliesTo = array_filter(array_map('trim', $appliesTo), function($val) {
                                return strtolower($val) !== 'all';
                            });
                            
                            // Validate applies_to gender values against existing genders (partial update)
                            $allGenders = $db->table('genders')->select('LOWER(name) as name')->get()->getResultArray();
                            $validGenderNames = array_map('strtolower', array_column($allGenders, 'name'));
                            $invalidGenders = [];
                            $validGenders = [];
                            foreach ($appliesTo as $gender) {
                                if (in_array(strtolower($gender), $validGenderNames)) {
                                    $validGenders[] = $gender;
                                } else {
                                    $invalidGenders[] = $gender;
                                }
                            }
                            if (!empty($invalidGenders)) {
                                $errors[] = "Row {$row}: Invalid gender(s) skipped: " . implode(', ', $invalidGenders) . ". Proceeding with valid ones.";
                            }
                            $appliesTo = $validGenders;
                        } else {
                            // Blank gender validation: check if any sub-category with this category's gender exists
                            // If gender is blank and sub-category with this category's gender is also blank, skip
                            $hasSubCategoriesWithBlankGender = $db->table('sub_categories')
                                ->where('LOWER(category_name)', strtolower($name))
                                ->where('applies_to', '[]')
                                ->countAllResults() > 0;
                            
                            if ($hasSubCategoriesWithBlankGender) {
                                $skipped++;
                                $errors[] = "Row {$row}: Gender is blank and sub-category with this category's gender is also blank. Skipping row.";
                                continue 2;
                            }
                            
                            // If no gender value is present, use "N/A"
                            $appliesTo = ['N/A'];
                        }
                        
                        // Check if exists (case-insensitive by category_name)
                        $existing = $db->table('categories')->where('LOWER(category_name)', strtolower($name))->get()->getRowArray();
                        $rec = [
                            'category_name' => $name,
                            'product_type_ids' => json_encode(is_array($ptIds) ? $ptIds : []),
                            'applies_to' => json_encode(is_array($appliesTo) ? $appliesTo : []),
                        ];
                        if ($existing) {
                            $db->table('categories')->where('id', $existing['id'])->update($rec);
                            $updated++;
                        } else {
                            $rec['created_at'] = $now;
                            $db->table('categories')->insert($rec);
                            $inserted++;
                        }
                        break;

                    case 'sub_categories':
                        $name = $data['name'] ?? '';
                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }
                        
                        // Categories handling with partial update
                        $catInput = trim($data['categories'] ?? $data['category'] ?? '');
                        
                        // Blank value validation: skip if categories is blank
                        if ($catInput === '') {
                            $skipped++;
                            $errors[] = "Row {$row}: Categories is blank. Skipping row.";
                            continue 2;
                        }
                        
                        $names = array_map('trim', explode(',', $catInput));
                        $cats = $db->table('categories')->whereIn('LOWER(category_name)', array_map('strtolower', $names))->get()->getResultArray();
                        $foundNames = array_map('strtolower', array_column($cats, 'category_name'));
                        $catIds = array_column($cats, 'id');
                        
                        // Partial update: log invalid categories but continue with valid ones
                        if (count($catIds) < count($names)) {
                            $missing = [];
                            foreach ($names as $n) {
                                if (!in_array(strtolower($n), $foundNames)) $missing[] = $n;
                            }
                            if (!empty($missing)) {
                                $errors[] = "Row {$row}: Invalid categories skipped: " . implode(', ', $missing) . ". Proceeding with valid ones.";
                            }
                        }
                        
                        // Validate that at least one valid category exists
                        if (empty($catIds)) {
                            $skipped++;
                            $errors[] = "Row {$row}: No valid categories found. Sub-category cannot be created without categories.";
                            continue 2;
                        }

                        // Check if parent categories have gender restrictions
                        $parentCategories = $db->table('categories')->whereIn('id', $catIds)->get()->getResultArray();
                        $parentHasGenderRestriction = false;
                        foreach ($parentCategories as $cat) {
                            $appliesTo = json_decode($cat['applies_to'] ?? '[]', true);
                            if (!empty($appliesTo) && !in_array('N/A', $appliesTo)) {
                                $parentHasGenderRestriction = true;
                                break;
                            }
                        }

                        // Gender handling with partial update
                        $appliesToInput = trim($data['applies_to'] ?? '');
                        $appliesTo = [];
                        
                        if ($appliesToInput !== '') {
                            $appliesTo = json_decode($appliesToInput, true);
                            if (!is_array($appliesTo)) {
                                $appliesTo = array_map('trim', explode(',', $appliesToInput));
                            }
                            
                            // Filter out "all" and convert to lowercase for comparison
                            $appliesTo = array_filter(array_map('trim', $appliesTo), function($val) {
                                return strtolower($val) !== 'all';
                            });
                            
                            // Validate applies_to gender values against existing genders (partial update)
                            $allGenders = $db->table('genders')->select('LOWER(name) as name')->get()->getResultArray();
                            $validGenderNames = array_map('strtolower', array_column($allGenders, 'name'));
                            $invalidGenders = [];
                            $validGenders = [];
                            foreach ($appliesTo as $gender) {
                                if (in_array(strtolower($gender), $validGenderNames)) {
                                    $validGenders[] = $gender;
                                } else {
                                    $invalidGenders[] = $gender;
                                }
                            }
                            if (!empty($invalidGenders)) {
                                $errors[] = "Row {$row}: Invalid gender(s) skipped: " . implode(', ', $invalidGenders) . ". Proceeding with valid ones.";
                            }
                            $appliesTo = $validGenders;
                        } else {
                            // Blank gender validation: check if category with this sub-category's gender is also blank
                            // If gender is blank and category with this sub-category's gender is also blank, skip
                            $hasCategoriesWithBlankGender = false;
                            foreach ($parentCategories as $cat) {
                                $appliesTo = json_decode($cat['applies_to'] ?? '[]', true);
                                if (empty($appliesTo) || (count($appliesTo) === 1 && $appliesTo[0] === 'N/A')) {
                                    $hasCategoriesWithBlankGender = true;
                                    break;
                                }
                            }
                            
                            if ($hasCategoriesWithBlankGender) {
                                $skipped++;
                                $errors[] = "Row {$row}: Gender is blank and category with this sub-category's gender is also blank. Skipping row.";
                                continue 2;
                            }
                            
                            // If no gender value is present
                            if ($parentHasGenderRestriction) {
                                // If parent categories have gender restrictions, use "N/A"
                                $appliesTo = ['N/A'];
                            } else {
                                // If parent categories don't have gender restrictions, don't create
                                $skipped++;
                                $errors[] = "Row {$row}: No gender value provided and parent categories have no gender restrictions. Sub-category cannot be created.";
                                continue 2;
                            }
                        }
                        
                        // Check if exists (case-insensitive by name)
                        $existing = $db->table('sub_categories')->where('LOWER(name)', strtolower($name))->get()->getRowArray();
                        $rec = [
                            'name' => $name,
                            'category_ids' => json_encode(is_array($catIds) ? $catIds : []),
                            'applies_to' => json_encode(is_array($appliesTo) ? $appliesTo : []),
                        ];
                        if ($existing) {
                            $db->table('sub_categories')->where('id', $existing['id'])->update($rec);
                            $updated++;
                        } else {
                            $rec['created_at'] = $now;
                            $db->table('sub_categories')->insert($rec);
                            $inserted++;
                        }
                        break;

                    case 'colors':
                        $name = $data['name'] ?? '';
                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }
                        $hex = $data['hex_code'] ?? '#000000';
                        
                        // Validate hex_code format
                        $hex = trim($hex);
                        // Add # prefix if missing
                        if (!empty($hex) && $hex[0] !== '#') {
                            $hex = '#' . $hex;
                        }
                        // Validate hex format (3 or 6 hex digits)
                        if (!preg_match('/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/', $hex)) {
                            $skipped++;
                            $errors[] = "Row {$row}: Invalid hex_code '{$data['hex_code']}'. Must be a valid hex color code (e.g., #FFF or #FFFFFF)";
                            continue 2;
                        }
                        
                        // Check if exists (case-insensitive by name)
                        $existing = $db->table('colors')->where('LOWER(name)', strtolower($name))->get()->getRowArray();
                        $rec = ['name' => $name, 'hex_code' => $hex];
                        if ($existing) {
                            $db->table('colors')->where('id', $existing['id'])->update($rec);
                            $updated++;
                        } else {
                            $rec['created_at'] = $now;
                            $db->table('colors')->insert($rec);
                            $inserted++;
                        }
                        break;

                    case 'attributes':
                        $name = $data['name'] ?? '';
                        if (!$name) { $skipped++; $errors[] = "Row {$row}: Name is empty"; continue 2; }
                        
                        $type = $data['type'] ?? '';
                        if (!$type) { $skipped++; $errors[] = "Row {$row}: Type is required"; continue 2; }
                        
                        $allowedTypes = ['text', 'number', 'picklist'];
                        if (!in_array($type, $allowedTypes)) {
                            $skipped++;
                            $errors[] = "Row {$row}: Invalid type '{$type}'. Must be one of: " . implode(', ', $allowedTypes);
                            continue 2;
                        }
                        
                        // For picklist type, allowed_values is required
                        if ($type === 'picklist' && empty($data['allowed_values'])) {
                            $skipped++;
                            $errors[] = "Row {$row}: Allowed values are required for picklist type";
                            continue 2;
                        }
                        
                        $required = (int)($data['required'] ?? 0);
                        $placeholder = $data['placeholder'] ?? null;
                        
                        $rec = [
                            'name' => $name,
                            'type' => $type,
                            'required' => $required,
                            'placeholder' => $placeholder,
                        ];
                        
                        // Parse allowed_values for picklist type
                        if ($type === 'picklist' && !empty($data['allowed_values'])) {
                            $values = array_map('trim', explode(',', $data['allowed_values']));
                            $rec['allowed_values'] = json_encode($values);
                        }
                        
                        // Check if exists (case-insensitive by name)
                        $existing = $db->table('attributes')->where('LOWER(name)', strtolower($name))->get()->getRowArray();
                        
                        $attributeId = null;
                        if ($existing) {
                            $rec['updated_at'] = $now;
                            $db->table('attributes')->where('id', $existing['id'])->update($rec);
                            $attributeId = $existing['id'];
                            $updated++;
                        } else {
                            $rec['created_at'] = $now;
                            $db->table('attributes')->insert($rec);
                            $attributeId = $db->insertID();
                            $inserted++;
                        }
                        
                        // Handle entity linking through attribute_assignments table
                        $entityTypes = $data['entity_types'] ?? null;
                        $entityIds = $data['entity_ids'] ?? null;
                        
                        if ($entityTypes && $entityIds && $attributeId) {
                            // Delete existing assignments for this attribute
                            $db->table('attribute_assignments')->where('attribute_id', $attributeId)->delete();
                            
                            // Parse entity_types (can be comma-separated or single)
                            $entityTypesArray = is_array($entityTypes) ? $entityTypes : explode(',', $entityTypes);
                            $entityTypesArray = array_map('trim', $entityTypesArray);
                            
                            // Parse entity_ids (can be comma-separated or single) - these are now names
                            $entityNamesArray = is_array($entityIds) ? $entityIds : explode(',', $entityIds);
                            $entityNamesArray = array_map('trim', $entityNamesArray);
                            
                            // Create assignments for each entity_type and entity_name pair
                            foreach ($entityTypesArray as $entityType) {
                                foreach ($entityNamesArray as $entityName) {
                                    if ($entityType && $entityName) {
                                        // Resolve entity name to ID based on entity_type
                                        $entityId = null;
                                        if ($entityType === 'listing_type') {
                                            $entity = $db->table('listing_types')
                                                ->where('LOWER(type_name)', strtolower($entityName))
                                                ->orWhere('LOWER(name)', strtolower($entityName))
                                                ->get()->getRowArray();
                                            if ($entity) $entityId = $entity['id'];
                                        } elseif ($entityType === 'category') {
                                            $entity = $db->table('categories')
                                                ->where('LOWER(category_name)', strtolower($entityName))
                                                ->orWhere('LOWER(name)', strtolower($entityName))
                                                ->get()->getRowArray();
                                            if ($entity) $entityId = $entity['id'];
                                        } elseif ($entityType === 'sub_category') {
                                            $entity = $db->table('sub_categories')
                                                ->where('LOWER(name)', strtolower($entityName))
                                                ->get()->getRowArray();
                                            if ($entity) $entityId = $entity['id'];
                                        }
                                        
                                        // Only create assignment if entity was found
                                        if ($entityId) {
                                            $db->table('attribute_assignments')->insert([
                                                'attribute_id' => $attributeId,
                                                'entity_type' => $entityType,
                                                'entity_id' => $entityId,
                                                'created_at' => $now,
                                            ]);
                                        }
                                    }
                                }
                            }
                        }
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
            'message' => "{$inserted} records inserted, {$updated} records updated, {$skipped} skipped.",
            'inserted' => $inserted,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors' => $errors,
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
                $rows[] = array_combine($header, array_slice(array_map('trim', $line), 0, count($header)));
            }
        }
    fclose($handle);
    return ['header' => $header, 'rows' => $rows];
}

private function processImage($source, $subDir): ?string
{
    if (empty($source)) return null;
    $source = trim($source, " \t\n\r\0\x0B\""); // Trim whitespace and quotes
    
    $targetDir = FCPATH . $subDir;
    if (!is_dir($targetDir)) mkdir($targetDir, 0777, true);

    $ext = pathinfo($source, PATHINFO_EXTENSION);
    if (!$ext || strlen($ext) > 5) $ext = 'png';
    
    $newFileName = time() . '_' . uniqid() . '.' . $ext;
    $targetPath = $targetDir . $newFileName;
    $dbPath = $subDir . $newFileName;

    $success = false;
    if (filter_var($source, FILTER_VALIDATE_URL)) {
        try {
            $content = @file_get_contents($source);
            if ($content) {
                file_put_contents($targetPath, $content);
                $success = true;
            }
        } catch (\Exception $e) {}
    } else {
        if (file_exists($source)) {
            $success = @copy($source, $targetPath);
        }
    }

    return ($success && file_exists($targetPath)) ? $dbPath : null;
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
                
                // Seller Resolution (by email or ID)
                $sellerId = $data['seller_id'] ?? '';
                $sellerEmail = $data['seller_email'] ?? $data['email'] ?? '';
                if (!$sellerId && $sellerEmail) {
                    $seller = $db->table('users')->where('email', $sellerEmail)->get()->getRowArray();
                    if ($seller) $sellerId = $seller['id'];
                }
                if ($sellerId) $rec['seller_id'] = $sellerId;

                // Listing Type Resolution (multiple types by comma-separated names or JSON array)
                $ltIds = [];
                $ltInput = $data['listing_types'] ?? $data['listing_type_ids'] ?? '';
                if ($ltInput) {
                    if (strpos($ltInput, '[') === 0) {
                        $ltIds = json_decode($ltInput, true) ?: [];
                    } else {
                        $names = array_map('trim', explode(',', $ltInput));
                        $lts = $db->table('listing_types')->whereIn('LOWER(type_name)', array_map('strtolower', $names))->get()->getResultArray();
                        $ltIds = array_column($lts, 'id');
                    }
                    
                    // Validation: If listing type was provided but not found, skip this row
                    if (empty($ltIds)) {
                        $skipped++;
                        $errors[] = "Row {$row}: Listing type '{$ltInput}' not found. Please check the spelling.";
                        continue;
                    }
                }
                
                $rec['listing_type_ids'] = json_encode(array_map('intval', $ltIds));
                if (!empty($ltIds)) $rec['listing_type_id'] = $ltIds[0]; // For backward compatibility

                if (!empty($data['description'])) $rec['description'] = $data['description'];
                
                $logoSource = $data['logo'] ?? $data['image'] ?? $data['brand_image'] ?? '';
                if ($logoSource) {
                    $processed = $this->processImage($logoSource, 'uploads/brands/');
                    if ($processed) $rec['logo'] = $processed;
                }

                $db->table('brands')->insert($rec);
                $inserted++;
            } catch (\Exception $e) { $skipped++; $errors[] = "Row {$row}: " . $e->getMessage(); }
        }
        return $this->respond(['success' => true, 'message' => "{$inserted} brands inserted, {$skipped} skipped.", 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => $errors]);
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
                
                // Listing Type Resolution
                $ltIds = [];
                $ltInput = $data['listing_types'] ?? $data['listing_type_ids'] ?? '';
                if ($ltInput) {
                    if (strpos($ltInput, '[') === 0) {
                        $ltIds = json_decode($ltInput, true) ?: [];
                    } else {
                        $names = array_map('trim', explode(',', $ltInput));
                        $lts = $db->table('listing_types')->whereIn('LOWER(type_name)', array_map('strtolower', $names))->get()->getResultArray();
                        $ltIds = array_column($lts, 'id');
                    }
                    
                    // Validation: If listing type was provided but not found, skip this row
                    if (empty($ltIds)) {
                        $skipped++;
                        $errors[] = "Row {$row}: Listing type '{$ltInput}' not found. Please check the spelling.";
                        continue;
                    }
                }
                
                $rec['listing_type_ids'] = json_encode(array_map('intval', $ltIds));
                if (!empty($ltIds)) $rec['listing_type_id'] = $ltIds[0]; // For backward compatibility

                if (!empty($data['description'])) $rec['description'] = $data['description'];

                $imageSource = $data['brand_image'] ?? $data['image'] ?? $data['logo'] ?? '';
                if ($imageSource) {
                    $processed = $this->processImage($imageSource, 'uploads/original_brands/');
                    if ($processed) $rec['brand_image'] = $processed;
                }

                $db->table('orignal_brands')->insert($rec);
                $inserted++;
            } catch (\Exception $e) { $skipped++; $errors[] = "Row {$row}: " . $e->getMessage(); }
        }
        return $this->respond(['success' => true, 'message' => "{$inserted} records inserted, {$skipped} skipped.", 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => $errors]);
    }

    // ── Attributes Management ──────────────────────────────
    public function attributes()
    {
        $db = \Config\Database::connect();
        $attributes = $db->table('attributes')->orderBy('created_at', 'DESC')->get()->getResultArray();
        
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
            
            // Add entity linking information
            if (isset($assignmentMap[$attr['id']]) && !empty($assignmentMap[$attr['id']])) {
                $firstAssignment = $assignmentMap[$attr['id']][0];
                $attr['entity_type'] = $firstAssignment['entity_type'];
                $attr['entity_ids'] = array_column($assignmentMap[$attr['id']], 'entity_id');
                
                // Map entity_type to the appropriate ID column for frontend compatibility (backward compatibility)
                if ($attr['entity_type'] === 'listing_type') {
                    $attr['listing_type_id'] = $attr['entity_ids'][0] ?? null;
                } elseif ($attr['entity_type'] === 'category') {
                    $attr['category_id'] = $attr['entity_ids'][0] ?? null;
                } elseif ($attr['entity_type'] === 'sub_category') {
                    $attr['sub_category_id'] = $attr['entity_ids'][0] ?? null;
                }
            } else {
                $attr['entity_type'] = null;
                $attr['entity_ids'] = [];
                $attr['entity_id'] = null;
                $attr['listing_type_id'] = null;
                $attr['category_id'] = null;
                $attr['sub_category_id'] = null;
            }
        }
        
        return $this->respond(['success' => true, 'data' => $attributes]);
    }

    public function addAttribute()
    {
        $db = \Config\Database::connect();
        $name = $this->request->getPost('name');
        $type = $this->request->getPost('type') ?? 'text';
        $required = (int)($this->request->getPost('required') ?? 0);
        $allowedValues = $this->request->getPost('allowed_values');
        $placeholder = $this->request->getPost('placeholder');

        if (!$name) {
            return $this->respond(['success' => false, 'message' => 'Attribute name is required.'], 400);
        }

        if (!$type) {
            return $this->respond(['success' => false, 'message' => 'Attribute type is required.'], 400);
        }

        // Validate type value
        $allowedTypes = ['text', 'number', 'picklist'];
        if (!in_array($type, $allowedTypes)) {
            return $this->respond(['success' => false, 'message' => 'Invalid type. Must be one of: ' . implode(', ', $allowedTypes)], 400);
        }

        // For picklist type, allowed_values is required
        if ($type === 'picklist' && empty($allowedValues)) {
            return $this->respond(['success' => false, 'message' => 'Allowed values are required for picklist type.'], 400);
        }

        $data = [
            'name' => $name,
            'type' => $type,
            'required' => $required,
            'placeholder' => $placeholder,
            'created_at' => date('Y-m-d H:i:s'),
        ];

        // Parse allowed values (comma-separated or JSON)
        if ($allowedValues) {
            if (strpos($allowedValues, '[') === 0) {
                $data['allowed_values'] = $allowedValues;
            } else {
                $values = array_map('trim', explode(',', $allowedValues));
                $data['allowed_values'] = json_encode($values);
            }
        }

        $db->table('attributes')->insert($data);
        return $this->respond(['success' => true, 'message' => 'Attribute added successfully.']);
    }

    public function updateAttribute($id)
    {
        $db = \Config\Database::connect();
        $data = [];
        
        $name = $this->request->getPost('name');
        if ($name) $data['name'] = $name;

        $type = $this->request->getPost('type');
        if ($type) {
            // Validate type value
            $allowedTypes = ['text', 'number', 'picklist'];
            if (!in_array($type, $allowedTypes)) {
                return $this->respond(['success' => false, 'message' => 'Invalid type. Must be one of: ' . implode(', ', $allowedTypes)], 400);
            }
            $data['type'] = $type;
        }

        $required = $this->request->getPost('required');
        if ($required !== null) $data['required'] = (int)$required;

        $placeholder = $this->request->getPost('placeholder');
        if ($placeholder !== null) $data['placeholder'] = $placeholder;
        
        $allowedValues = $this->request->getPost('allowed_values');
        if ($allowedValues !== null) {
            // If type is picklist, allowed_values is required
            if (isset($data['type']) && $data['type'] === 'picklist' && empty($allowedValues)) {
                return $this->respond(['success' => false, 'message' => 'Allowed values are required for picklist type.'], 400);
            }
            if (strpos($allowedValues, '[') === 0) {
                $data['allowed_values'] = $allowedValues;
            } else {
                $values = array_map('trim', explode(',', $allowedValues));
                $data['allowed_values'] = json_encode($values);
            }
        }

        // Handle entity linking through attribute_assignments table
        $entityTypes = $this->request->getPost('entity_types');
        $entityIds = $this->request->getPost('entity_ids');

        // Handle new array format (entity_types[] and entity_ids[])
        if ($entityTypes !== null || $entityIds !== null) {
            // Delete existing assignments for this attribute
            $db->table('attribute_assignments')->where('attribute_id', $id)->delete();

            // Create new assignments for each entity_type and entity_id pair
            if ($entityTypes && $entityIds) {
                // Ensure both are arrays
                $entityTypesArray = is_array($entityTypes) ? $entityTypes : [$entityTypes];
                $entityIdsArray = is_array($entityIds) ? $entityIds : [$entityIds];

                foreach ($entityTypesArray as $entityType) {
                    foreach ($entityIdsArray as $entityId) {
                        if ($entityType && $entityId) {
                            $db->table('attribute_assignments')->insert([
                                'attribute_id' => $id,
                                'entity_type' => $entityType,
                                'entity_id' => $entityId,
                                'created_at' => date('Y-m-d H:i:s'),
                            ]);
                        }
                    }
                }
            }
        }

        if (empty($data)) {
            return $this->respond(['success' => false, 'message' => 'No data to update.'], 400);
        }

        $data['updated_at'] = date('Y-m-d H:i:s');
        $db->table('attributes')->where('id', $id)->update($data);
        return $this->respond(['success' => true, 'message' => 'Attribute updated successfully.']);
    }

    public function deleteAttribute($id)
    {
        $db = \Config\Database::connect();
        $db->table('attribute_assignments')->where('attribute_id', $id)->delete();
        $db->table('attributes')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Attribute deleted successfully.']);
    }

    // ── Attribute Assignments ─────────────────────────────
    public function attributeAssignments()
    {
        $db = \Config\Database::connect();
        $entityType = $this->request->getGet('entity_type');
        $entityId = $this->request->getGet('entity_id');

        $query = $db->table('attribute_assignments aa')
            ->select('aa.*, a.name, a.type, a.required as global_required, a.allowed_values, a.placeholder')
            ->join('attributes a', 'a.id = aa.attribute_id', 'inner')
            ->orderBy('aa.sort_order', 'ASC');

        if ($entityType) $query->where('aa.entity_type', $entityType);
        if ($entityId) $query->where('aa.entity_id', $entityId);

        $assignments = $query->get()->getResultArray();

        // Parse allowed_values JSON
        foreach ($assignments as &$assign) {
            $assign['allowed_values'] = !empty($assign['allowed_values']) ? json_decode($assign['allowed_values'], true) : [];
        }

        return $this->respond(['success' => true, 'data' => $assignments]);
    }

    public function assignAttribute()
    {
        $db = \Config\Database::connect();
        $attributeId = $this->request->getPost('attribute_id');
        $entityType = $this->request->getPost('entity_type');
        $entityId = $this->request->getPost('entity_id');
        $required = $this->request->getPost('required') ?? 0;
        $sortOrder = $this->request->getPost('sort_order') ?? 0;

        if (!$attributeId || !$entityType || !$entityId) {
            return $this->respond(['success' => false, 'message' => 'Attribute ID, entity type, and entity ID are required.'], 400);
        }

        // Check if assignment already exists
        $existing = $db->table('attribute_assignments')
            ->where('attribute_id', $attributeId)
            ->where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->get()->getRowArray();

        if ($existing) {
            return $this->respond(['success' => false, 'message' => 'Attribute is already assigned to this entity.'], 400);
        }

        $data = [
            'attribute_id' => $attributeId,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'required' => $required,
            'sort_order' => $sortOrder,
            'created_at' => date('Y-m-d H:i:s'),
        ];

        $db->table('attribute_assignments')->insert($data);
        return $this->respond(['success' => true, 'message' => 'Attribute assigned successfully.']);
    }

    public function updateAttributeAssignment($id)
    {
        $db = \Config\Database::connect();
        $data = [];
        
        $required = $this->request->getPost('required');
        if ($required !== null) $data['required'] = $required;
        
        $sortOrder = $this->request->getPost('sort_order');
        if ($sortOrder !== null) $data['sort_order'] = $sortOrder;

        if (empty($data)) {
            return $this->respond(['success' => false, 'message' => 'No data to update.'], 400);
        }

        $db->table('attribute_assignments')->where('id', $id)->update($data);
        return $this->respond(['success' => true, 'message' => 'Assignment updated successfully.']);
    }

    public function removeAttributeAssignment($id)
    {
        $db = \Config\Database::connect();
        $db->table('attribute_assignments')->where('id', $id)->delete();
        return $this->respond(['success' => true, 'message' => 'Assignment removed successfully.']);
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

            // Seller Lookup by Email
            if (!$sellerId && !empty($data['seller_email'])) {
                $user = $db->table('users')->where('email', $data['seller_email'])->get()->getRowArray();
                if ($user) $sellerId = $user['id'];
            }

            if (!$title || !$sellerId || !$originalPrice) { 
                $skipped++; 
                $errors[] = "Row {$row}: title, seller (id/email), or original_price missing"; 
                continue; 
            }

            try {
                // Brand Lookup by Name
                $brandId = !empty($data['brand_id']) ? $data['brand_id'] : null;
                if (!$brandId && !empty($data['brand_name'])) {
                    $brand = $db->table('brands')->where('brand_name', $data['brand_name'])->get()->getRowArray();
                    if ($brand) $brandId = $brand['id'];
                }

                // Category Lookup by Name
                $category = $data['category'] ?? '';
                $categoryIds = $data['category_ids'] ?? null;
                if (!$categoryIds && !empty($category)) {
                    $cat = $db->table('categories')->where('category_name', $category)->get()->getRowArray();
                    if ($cat) $categoryIds = json_encode([$cat['id']]);
                }

                $rec = [
                    'seller_id' => $sellerId, 'title' => $title, 'listing_type' => $listingType,
                    'original_price' => $originalPrice,
                    'description' => $data['description'] ?? '',
                    'selling_price' => $data['selling_price'] ?? null,
                    'rental_cost' => $data['rental_cost'] ?? null,
                    'rental_deposit' => $data['rental_deposit'] ?? null,
                    'color' => $data['color'] ?? null,
                    'size' => $data['size'] ?? null,
                    'brand_id' => $brandId,
                    'category' => $category,
                    'category_ids' => $categoryIds,
                    'gender' => $data['gender'] ?? null,
                    'times_used' => $data['times_used'] ?? $data['used_times'] ?? 0,
                    'condition_description' => $data['condition_description'] ?? '',
                    'status' => $data['status'] ?? 'pending',
                    'created_at' => $now, 'updated_at' => $now,
                ];
                $db->table('products')->insert($rec);
                $productId = $db->insertID();
                $inserted++;

                // Handle Images
                $imagesStr = $data['images'] ?? $data['image_path'] ?? '';
                if ($imagesStr) {
                    $images = explode(',', $imagesStr);
                    foreach ($images as $imgIdx => $imgSource) {
                        $processed = $this->processImage($imgSource, 'uploads/products/');
                        if ($processed) {
                            $db->table('product_images')->insert([
                                'product_id' => $productId,
                                'image_path' => $processed,
                                'is_primary' => ($imgIdx === 0 ? 1 : 0),
                                'created_at' => $now
                            ]);
                        }
                    }
                }
            } catch (\Exception $e) { $skipped++; $errors[] = "Row {$row}: " . $e->getMessage(); }
        }
        return $this->respond(['success' => true, 'message' => "{$inserted} products inserted, {$skipped} skipped.", 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => $errors]);
    }

    public function bulkUploadPricingRules()
    {
        $db = \Config\Database::connect();
        $type = $this->request->getPost('type') ?? 'sale'; // 'sale' or 'rental'
        $csv = $this->parseCsv($this->request->getFile('csv_file'));
        if (isset($csv['error'])) return $this->respond(['success' => false, 'message' => $csv['error']], 400);

        $inserted = 0; $skipped = 0; $errors = []; $now = date('Y-m-d H:i:s');
        $table = ($type === 'rental') ? 'rental_pricing_rules' : 'pricing_rules';

        foreach ($csv['rows'] as $i => $data) {
            $row = $i + 2;
            try {
                $filterType = $data['filter_type'] ?? '';
                $filterName = $data['filter_value_name'] ?? $data['filter_label'] ?? '';
                $filterValue = (int)($data['filter_value'] ?? 0);

                if (!$filterValue && $filterType && $filterName) {
                    if ($filterType === 'listing_type') {
                        $lt = $db->table('listing_types')->where('LOWER(type_name)', strtolower($filterName))->get()->getRowArray();
                        if ($lt) $filterValue = $lt['id'];
                    } elseif ($filterType === 'category') {
                        $cat = $db->table('categories')->where('LOWER(category_name)', strtolower($filterName))->get()->getRowArray();
                        if ($cat) $filterValue = $cat['id'];
                    } elseif ($filterType === 'sub_category') {
                        $sc = $db->table('sub_categories')->where('LOWER(name)', strtolower($filterName))->get()->getRowArray();
                        if ($sc) $filterValue = $sc['id'];
                    }
                }

                $filterLabel = $this->resolveFilterLabel($filterType, $filterValue);

                $min = (int)($data['depreciation_range_min'] ?? $data['min'] ?? 0);
                $max = (int)($data['depreciation_range_max'] ?? $data['max'] ?? 0);
                $amount = (float)($data['depreciation_amount'] ?? $data['amount'] ?? 0);

                if ($min >= $max && $max !== 0) {
                    $skipped++;
                    $errors[] = "Row {$row}: Min range ({$min}) must be less than Max range ({$max})";
                    continue;
                }

                if ($amount <= 0) {
                    $skipped++;
                    $errors[] = "Row {$row}: Depreciation amount must be greater than 0";
                    continue;
                }

                // Check for overlapping rules (Same rule as single upload)
                $existing = $this->checkOverlappingRules($table, $filterType, $filterValue, $min, $max);
                if ($existing) {
                    $skipped++;
                    $errors[] = "Row {$row} overlaps with existing rule (Range: {$existing['depreciation_range_min']} - " . ($existing['depreciation_range_max'] > 0 ? $existing['depreciation_range_max'] : '∞') . ")";
                    continue;
                }

                if ($type === 'rental') {
                    $db->table($table)->insert([
                        'filter_type' => $filterType,
                        'filter_value' => $filterValue,
                        'filter_label' => $filterLabel,
                        'deposit_deduction_threshold' => (float)($data['deposit_deduction_threshold'] ?? $data['threshold'] ?? 0),
                        'depreciation_range_min' => $min,
                        'depreciation_range_max' => $max,
                        'depreciation_amount' => (float)($data['depreciation_amount'] ?? $data['amount'] ?? 0),
                        'max_cost_cap_per_day' => (float)($data['max_cost_cap_per_day'] ?? $data['cap'] ?? 0),
                        'is_active' => 1,
                    ]);
                } else {
                    $threshold = (float)($data['deduction_threshold'] ?? $data['threshold'] ?? 0);
                    
                    // Sync deduction_threshold across all existing rows in the same filter group (Same rule as single upload)
                    $db->table('pricing_rules')
                       ->where('filter_type', $filterType)
                       ->where('filter_value', $filterValue)
                       ->update(['deduction_threshold' => $threshold]);

                    $db->table($table)->insert([
                        'filter_type' => $filterType,
                        'filter_value' => $filterValue,
                        'filter_label' => $filterLabel,
                        'deduction_threshold' => $threshold,
                        'depreciation_range_min' => $min,
                        'depreciation_range_max' => $max,
                        'depreciation_amount' => (float)($data['depreciation_amount'] ?? $data['amount'] ?? 0),
                        'is_active' => 1,
                    ]);
                }
                $inserted++;
            } catch (\Exception $e) { $skipped++; $errors[] = "Row {$row}: " . $e->getMessage(); }
        }
        return $this->respond(['success' => true, 'message' => "{$inserted} rules inserted, {$skipped} skipped.", 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => $errors]);
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
                    'usage_limit' => $data['usage_limit'] ?? 0,
                    'valid_from' => !empty($data['valid_from']) ? $data['valid_from'] : null,
                    'valid_until' => !empty($data['valid_until']) ? $data['valid_until'] : null,
                    'is_active' => 1,
                    'created_at' => $now,
                ]);
                $inserted++;
            } catch (\Exception $e) { $skipped++; $errors[] = "Row {$row}: " . $e->getMessage(); }
        }
        return $this->respond(['success' => true, 'message' => "{$inserted} coupons inserted, {$skipped} skipped.", 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => $errors]);
    }

    public function bulkUploadSubscriptionPlans()
    {
        $db = \Config\Database::connect();
        $csv = $this->parseCsv($this->request->getFile('csv_file'));
        if (isset($csv['error'])) return $this->respond(['success' => false, 'message' => $csv['error']], 400);

        $inserted = 0; $skipped = 0; $errors = []; $now = date('Y-m-d H:i:s');
        foreach ($csv['rows'] as $i => $data) {
            $row = $i + 2;
            $name = trim($data['name'] ?? $data['plan_name'] ?? '');
            $userType = strtolower(trim($data['user_type'] ?? ''));
            $price = $data['price'] ?? '';
            
            // Validation
            if (!$name || !$price || !in_array($userType, ['buyer', 'seller'])) {
                $skipped++;
                $errors[] = "Row {$row}: name, price, or valid user_type (buyer/seller) missing";
                continue;
            }

            $planType = strtolower(trim($data['plan_type'] ?? 'duration'));
            if ($planType === 'limit') $planType = 'quantity';
            if (!in_array($planType, ['quantity', 'duration'])) $planType = 'duration';

            try {
                $db->table('subscription_plans')->insert([
                    'name' => $name,
                    'plan_name' => $name,
                    'user_type' => $userType,
                    'plan_type' => $planType,
                    'limit_value' => (int)($data['limit_value'] ?? 0),
                    'duration_hours' => (float)($data['duration_hours'] ?? 0),
                    'price' => (float)$price,
                    'base_price' => (float)($data['base_price'] ?? $price),
                    'features' => !empty($data['features']) ? $data['features'] : null,
                    'is_featured' => (int)($data['is_featured'] ?? 0),
                    'is_most_selected' => (int)($data['is_most_selected'] ?? 0),
                    'is_active' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
                $inserted++;
            } catch (\Exception $e) { $skipped++; $errors[] = "Row {$row}: " . $e->getMessage(); }
        }
        return $this->respond(['success' => true, 'message' => "{$inserted} plans inserted, {$skipped} skipped.", 'inserted' => $inserted, 'skipped' => $skipped, 'errors' => $errors]);
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

    /**
     * GET /api/v1/superadmin/seo-settings
     */
    public function getSeoSettings()
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        
        // Check if seo_settings table exists
        if (!$db->tableExists('seo_settings')) {
            return $this->respond(['success' => true, 'data' => []]);
        }
        
        $seoModel = new \App\Models\SeoSettingModel();
        
        // Check if cms_pages table exists
        $cmsPagesTableExists = $db->tableExists('cms_pages');
        
        if ($cmsPagesTableExists) {
            // 1. Fetch current CMS pages
            $cmsPages = $db->table('cms_pages')->get()->getResultArray();
            
            // 2. Register any missing or updated CMS pages in SEO settings
            foreach ($cmsPages as $cms) {
                $pageKey = 'cms_' . $cms['slug'];
                $exists = $seoModel->where('page_key', $pageKey)->first();
                
                // Clean up html tags from content preview
                $plainContent = strip_tags($cms['content']);
                $plainContent = preg_replace('/\s+/', ' ', $plainContent);
                $descPreview = trim(substr($plainContent, 0, 150));
                
                if (!$exists) {
                    $seoModel->insert([
                        'page_key' => $pageKey,
                        'page_name' => 'CMS: ' . $cms['title'],
                        'route' => '/' . $cms['slug'],
                        'title' => $cms['title'] . ' — FlexMarket',
                        'meta_description' => $descPreview ?: ($cms['title'] . ' page on FlexMarket.'),
                        'meta_keywords' => 'flexmarket, ' . strtolower($cms['title']),
                        'og_title' => $cms['title'],
                        'og_description' => $descPreview ?: ($cms['title'] . ' page on FlexMarket.')
                    ]);
                } else {
                    // Keep the display title in sync with the CMS page
                    if ($exists['page_name'] !== 'CMS: ' . $cms['title']) {
                        $seoModel->update($exists['id'], ['page_name' => 'CMS: ' . $cms['title']]);
                    }
                }
            }

            // 3. Clean up deleted CMS pages from SEO settings
            $cmsSeoSettings = $seoModel->like('page_key', 'cms_', 'after')->findAll();
            $cmsSlugs = array_column($cmsPages, 'slug');
            foreach ($cmsSeoSettings as $s) {
                $slug = substr($s['page_key'], 4); // strip 'cms_'
                if (!in_array($slug, $cmsSlugs)) {
                    $seoModel->delete($s['id']);
                }
            }
        }

        // 4. Return all updated settings
        $settings = $seoModel->orderBy('page_name', 'ASC')->findAll();

        return $this->respond(['success' => true, 'data' => $settings]);
    }

    /**
     * POST /api/v1/superadmin/seo-settings/{id}
     */
    public function updateSeoSetting($id)
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $seoModel = new \App\Models\SeoSettingModel();
        $setting = $seoModel->find($id);
        if (!$setting) {
            return $this->respond(['success' => false, 'message' => 'SEO setting not found'], 404);
        }

        $data = $this->request->getJSON(true) ?: $this->request->getPost() ?: [];

        $updateData = [];
        if (array_key_exists('title', $data)) $updateData['title'] = $data['title'];
        if (array_key_exists('meta_description', $data)) $updateData['meta_description'] = $data['meta_description'];
        if (array_key_exists('meta_keywords', $data)) $updateData['meta_keywords'] = $data['meta_keywords'];
        if (array_key_exists('og_title', $data)) $updateData['og_title'] = $data['og_title'];
        if (array_key_exists('og_description', $data)) $updateData['og_description'] = $data['og_description'];

        if (empty($updateData)) {
            return $this->respond(['success' => false, 'message' => 'No data to update'], 400);
        }

        $seoModel->update($id, $updateData);

        return $this->respond(['success' => true, 'message' => 'SEO setting updated successfully.']);
    }

    /**
     * GET /api/v1/superadmin/validation-rules
     * Get all validation rules
     */
    public function getValidationRules()
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $rules = $db->table('validation_rules')->orderBy('field_name')->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $rules]);
    }

    /**
     * POST /api/v1/superadmin/validation-rules
     * Create validation rule
     */
    public function createValidationRule()
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $data = $this->request->getJSON(true) ?: $this->request->getPost() ?: [];

        if (empty($data['field_name']) || empty($data['field_label'])) {
            return $this->respond(['success' => false, 'message' => 'Field name and label are required'], 400);
        }

        $db = \Config\Database::connect();

        // Check if field_name already exists
        $existing = $db->table('validation_rules')->where('field_name', $data['field_name'])->get()->getRowArray();
        if ($existing) {
            return $this->respond(['success' => false, 'message' => 'Validation rule for this field already exists'], 400);
        }

        $insertData = [
            'field_name' => $data['field_name'],
            'field_label' => $data['field_label'],
            'is_required' => $data['is_required'] ?? 0,
            'min_length' => $data['min_length'] ?? null,
            'max_length' => $data['max_length'] ?? null,
            'min_value' => $data['min_value'] ?? null,
            'max_value' => $data['max_value'] ?? null,
            'pattern' => $data['pattern'] ?? null,
            'error_message' => $data['error_message'] ?? null,
            'is_active' => $data['is_active'] ?? 1,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        $db->table('validation_rules')->insert($insertData);

        return $this->respond(['success' => true, 'message' => 'Validation rule created successfully']);
    }

    /**
     * PUT /api/v1/superadmin/validation-rules/{id}
     * Update validation rule
     */
    public function updateValidationRule($id)
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $data = $this->request->getJSON(true) ?: $this->request->getPost() ?: [];

        $db = \Config\Database::connect();
        $rule = $db->table('validation_rules')->where('id', $id)->get()->getRowArray();
        if (!$rule) {
            return $this->respond(['success' => false, 'message' => 'Validation rule not found'], 404);
        }

        $updateData = [];
        if (array_key_exists('field_label', $data)) $updateData['field_label'] = $data['field_label'];
        if (array_key_exists('is_required', $data)) $updateData['is_required'] = $data['is_required'];
        if (array_key_exists('min_length', $data)) $updateData['min_length'] = $data['min_length'];
        if (array_key_exists('max_length', $data)) $updateData['max_length'] = $data['max_length'];
        if (array_key_exists('min_value', $data)) $updateData['min_value'] = $data['min_value'];
        if (array_key_exists('max_value', $data)) $updateData['max_value'] = $data['max_value'];
        if (array_key_exists('pattern', $data)) $updateData['pattern'] = $data['pattern'];
        if (array_key_exists('error_message', $data)) $updateData['error_message'] = $data['error_message'];
        if (array_key_exists('is_active', $data)) $updateData['is_active'] = $data['is_active'];
        $updateData['updated_at'] = date('Y-m-d H:i:s');

        if (empty($updateData)) {
            return $this->respond(['success' => false, 'message' => 'No data to update'], 400);
        }

        $db->table('validation_rules')->where('id', $id)->update($updateData);

        return $this->respond(['success' => true, 'message' => 'Validation rule updated successfully']);
    }

    /**
     * DELETE /api/v1/superadmin/validation-rules/{id}
     * Delete validation rule
     */
    public function deleteValidationRule($id)
    {
        $jwtUser = $this->request->jwt_user;
        if ($jwtUser['role'] !== 'super_admin') {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $db = \Config\Database::connect();
        $rule = $db->table('validation_rules')->where('id', $id)->get()->getRowArray();
        if (!$rule) {
            return $this->respond(['success' => false, 'message' => 'Validation rule not found'], 404);
        }

        $db->table('validation_rules')->where('id', $id)->delete();

        return $this->respond(['success' => true, 'message' => 'Validation rule deleted successfully']);
    }

}
