<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class SellerApi extends ResourceController
{
    protected $format = 'json';

    public function dashboard()
    {
        $jwtUser = $this->request->jwt_user;
        $userId = $jwtUser['user_id'];
        $db = \Config\Database::connect();

        $user = $db->table('users')->where('id', $userId)->get()->getRowArray();

        $stats = [
            'ttl_products' => $db->table('products')->where('seller_id', $userId)->countAllResults(),
            'pending' => $db->table('products')->where('seller_id', $userId)->where('status', 'pending')->countAllResults(),
            'approved' => $db->table('products')->where('seller_id', $userId)->where('status', 'approved')->countAllResults(),
            'rejected' => $db->table('products')->where('seller_id', $userId)->where('status', 'rejected')->countAllResults(),
        ];

        $pendingOffers = $db->table('offers o')
            ->select('o.*, p.title as product_title, p.listing_type, u.name as buyer_name')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users u', 'u.id = o.buyer_id', 'left')
            ->where('o.seller_id', $userId)
            ->where('o.status', 'pending')
            ->orderBy('o.created_at', 'DESC')
            ->limit(10)
            ->get()->getResultArray();

        $totalDeals = $db->table('offers')->where('seller_id', $userId)->where('status', 'accepted')->countAllResults();

        $orderRevenue = $db->table('orders')->where('seller_id', $userId)->selectSum('final_price')->get()->getRowArray()['final_price'] ?? 0;
        $offerRevenue = $db->table('offers')->where('seller_id', $userId)->where('status', 'accepted')->selectSum('offer_price')->get()->getRowArray()['offer_price'] ?? 0;

        return $this->respond([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => (int) $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'user_type' => $user['user_type'],
                    'role' => $jwtUser['role'],
                    'reliability_score' => (int) ($user['reliability_score'] ?? 100),
                    'seller_rating_avg' => (float) ($user['seller_rating_avg'] ?? 0),
                    'seller_rating_count' => (int) ($user['seller_rating_count'] ?? 0),
                    'referral_code' => $user['referral_code'] ?? '',
                ],
                'stats' => $stats,
                'pending_offers' => $pendingOffers,
                'total_deals' => $totalDeals,
                'total_revenue' => (float) $orderRevenue + (float) $offerRevenue,
            ],
        ]);
    }

    public function myProducts()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $products = $db->table('products p')
            ->select('p.*, (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id LIMIT 1) as image, lt.usage_label')
            ->join('listing_types lt', 'lt.type_name = p.listing_type_category', 'left')
            ->where('p.seller_id', $jwtUser['user_id'])
            ->orderBy('p.created_at', 'DESC')
            ->get()->getResultArray();

        foreach ($products as &$p) {
            $p['image_count'] = $db->table('product_images')->where('product_id', $p['id'])->countAllResults();
            $p['offer_count'] = $db->table('offers')->where('product_id', $p['id'])->countAllResults();
            $p['views_count'] = $p['views_count'] ?? 0;
        }
        unset($p);

        return $this->respond(['success' => true, 'data' => $products]);
    }

    public function offers()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $offers = $db->table('offers o')
            ->select('o.*, o.offer_price as offered_price, p.title as product_title, p.product_number, p.category, p.listing_type, p.original_price, p.price as product_price, p.rental_cost as product_rental_cost, p.rental_deposit as product_rental_deposit, p.views_count as product_views, p.dispatch_city, p.dispatch_state')
            ->select('(SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.is_primary DESC, pi.display_order ASC LIMIT 1) as product_image')
            ->select('(SELECT ord.status FROM orders ord WHERE ord.product_id = o.product_id AND ord.buyer_id = o.buyer_id AND ord.status != \'cancelled\' ORDER BY ord.created_at DESC LIMIT 1) as linked_order_status')
            ->select('u.name as buyer_name, u.mobile as buyer_mobile, u.email as buyer_email, u.buyer_rating_avg, u.buyer_rating_count, u.renter_reliability_score as buyer_reliability_score')
            ->select('cv.viewed_at as contact_viewed_at')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users u', 'u.id = o.buyer_id', 'left')
            ->join('contact_views cv', 'cv.user_id = o.buyer_id AND cv.product_id = o.product_id', 'left')
            ->where('o.seller_id', $jwtUser['user_id'])
            ->orderBy('o.created_at', 'DESC')
            ->get()->getResultArray();

        // Attach offer history for each offer
        $historyModel = new \App\Models\OfferHistoryModel();
        foreach ($offers as &$o) {
            $o['history'] = $historyModel->getHistoryByOffer($o['id']);
        }
        unset($o);

        // Get booked dates for rental products
        $productIds = array_unique(array_column($offers, 'product_id'));
        $bookedDates = [];
        if (!empty($productIds)) {
            $bookedDates = $db->table('orders')
                ->whereIn('product_id', $productIds)
                ->where('order_type', 'rent')
                ->whereNotIn('status', ['cancelled', 'returned'])
                ->select('product_id, rental_start_date, rental_end_date')
                ->get()->getResultArray();
        }

        $acceptanceLimitDays = (float) getSystemSetting('offer_acceptance_limit_days', 7);
        $ratingPeriod        = (float) getSystemSetting('seller_rating_period_days', 7);
        $rejectionWindowHours = (float) getSystemSetting('seller_rejection_window_hours', 24);

        return $this->respond([
            'success' => true,
            'data' => $offers,
            'bookedDates' => $bookedDates,
            'acceptanceLimitDays' => $acceptanceLimitDays,
            'ratingPeriod' => $ratingPeriod,
            'rejectionWindowHours' => $rejectionWindowHours,
        ]);
    }

    public function orders()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $orders = $db->table('orders o')
            ->select('o.*, p.title as product_title, u.name as buyer_name, (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.display_order ASC LIMIT 1) as primary_image')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users u', 'u.id = o.buyer_id', 'left')
            ->where('o.seller_id', $jwtUser['user_id'])
            ->orderBy('o.created_at', 'DESC')
            ->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $orders]);
    }

    public function notifications()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $notifications = $db->table('notifications')
            ->where('user_id', $jwtUser['user_id'])
            ->orderBy('created_at', 'DESC')
            ->limit(50)
            ->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $notifications]);
    }

    public function transactions()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $transactions = $db->table('transactions')
            ->where('user_id', $jwtUser['user_id'])
            ->orderBy('created_at', 'DESC')
            ->limit(50)
            ->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $transactions]);
    }

    public function uploadFormData()
    {
        $db = \Config\Database::connect();

        $listingTypes = $db->table('listing_types')->get()->getResultArray();
        $productTypes = $db->table('product_types')->get()->getResultArray();
        $categories = $db->table('categories')->get()->getResultArray();
        $subCategories = $db->table('sub_categories')->get()->getResultArray();
        $colors = $db->table('colors')->orderBy('name', 'ASC')->get()->getResultArray();
        $genders = $db->table('genders')->orderBy('name', 'ASC')->get()->getResultArray();
        $brands = $db->table('orignal_brands')->where('is_active', 1)->orderBy('brand_name', 'ASC')->get()->getResultArray();

        $settings = $db->table('system_settings')->get()->getResultArray();
        $config = [];
        foreach ($settings as $s) $config[$s['setting_key']] = $s['setting_value'];

        $defaults = [
            'sale_base_discount' => 5, 'rental_base_deposit_deduction' => 9,
            'rental_deposit_percentage' => 40, 'rental_suggested_cost_percent' => 13,
            'rental_max_cost_cap_per_day' => 14, 'min_rental_days' => 3,
            'max_product_images' => 7,
        ];
        $config = array_merge($defaults, $config);

        $pricingRules = $db->table('pricing_rules')->where('is_active', 1)->orderBy('filter_type', 'ASC')->get()->getResultArray();
        $rentalPricingRules = $db->table('rental_pricing_rules')->where('is_active', 1)->orderBy('filter_type', 'ASC')->get()->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => [
                'listing_types'       => $listingTypes,
                'product_types'       => $productTypes,
                'categories'          => $categories,
                'sub_categories'      => $subCategories,
                'colors'              => $colors,
                'genders'             => $genders,
                'brands'              => $brands,
                'config'              => $config,
                'pricing_rules'       => $pricingRules,
                'rental_pricing_rules'=> $rentalPricingRules,
            ],
        ]);
    }

    public function uploadProduct()
    {
        $jwtUser = $this->request->jwt_user;
        $userId = $jwtUser['user_id'];
        $db = \Config\Database::connect();

        // SuperAdmin bypasses subscription check
        if ($jwtUser['role'] !== 'super_admin' && $jwtUser['role'] !== 'admin') {
            $activeSub = $db->table('user_subscriptions us')
                ->join('subscription_plans sp', 'sp.id = us.plan_id')
                ->where('us.user_id', $userId)
                ->where('us.is_active', 1)
                ->where('us.expires_at >=', date('Y-m-d H:i:s'))
                ->get()->getRowArray();
            if (!$activeSub) {
                // Check if there was an expired subscription
                $expiredSub = $db->table('user_subscriptions')->where('user_id', $userId)->where('is_active', 1)->where('expires_at <', date('Y-m-d H:i:s'))->get()->getRowArray();
                if ($expiredSub) {
                    return $this->respond(['success' => false, 'message' => 'Your subscription has expired on ' . date('d M Y', strtotime($expiredSub['expires_at'])) . '. Please renew your plan to upload products.'], 403);
                }
                return $this->respond(['success' => false, 'message' => 'No active seller subscription found. Please subscribe to a plan to upload products.'], 403);
            }
        }

        $data = $this->request->getPost();

        $rules = [
            'title' => 'required|min_length[3]|max_length[200]',
            'listing_type' => 'required|in_list[sell,rent]',
            'original_price' => 'required|numeric|greater_than[0]',
            'times_used' => 'required|integer|greater_than_equal_to[0]',
            'condition_description' => 'required',
        ];

        if (!$this->validate($rules)) {
            return $this->respond(['success' => false, 'message' => 'Validation failed', 'errors' => $this->validator->getErrors()], 422);
        }

        // Debug: Log received files
        $allFiles = $this->request->getFiles();
        log_message('info', 'Received files: ' . json_encode(array_keys($allFiles)));
        if (isset($allFiles['images'])) {
            log_message('info', 'Images count: ' . count($allFiles['images']));
        }
        if (isset($allFiles['bill_images'])) {
            log_message('info', 'Bill images count: ' . count($allFiles['bill_images']));
        }

        // Resolve category name from category_id
        $categoryName = '';
        if (!empty($data['category_id'])) {
            $cat = $db->table('categories')->where('id', $data['category_id'])->get()->getRowArray();
            if ($cat) $categoryName = $cat['category_name'];
        }

        // Resolve sub-category name from sub_category_id
        $subCategoryName = '';
        if (!empty($data['sub_category_id'])) {
            $subCat = $db->table('sub_categories')->where('id', $data['sub_category_id'])->get()->getRowArray();
            if ($subCat) $subCategoryName = $subCat['name'];
        }

        // Resolve listing type category name
        $listingTypeCatName = '';
        if (!empty($data['listing_type_category'])) {
            $lt = $db->table('listing_types')->where('id', $data['listing_type_category'])->get()->getRowArray();
            if ($lt) $listingTypeCatName = $lt['type_name'];
        }

        // Resolve product type name
        $productTypeName = '';
        if (!empty($data['product_type'])) {
            $pt = $db->table('product_types')->where('id', $data['product_type'])->get()->getRowArray();
            if ($pt) $productTypeName = $pt['name'];
        }

        $productData = [
            'seller_id' => $userId,
            'title' => $data['title'],
            'description' => $data['condition_description'],
            'listing_type' => $data['listing_type'],
            'listing_type_category' => $listingTypeCatName,
            'product_type' => $productTypeName,
            'category' => $categoryName,
            'sub_category' => $subCategoryName,
            'gender' => $data['gender'] ?? null,
            'original_price' => $data['original_price'],
            'price' => $data['price'] ?? 0,
            'rental_deposit' => $data['rental_deposit'] ?: null,
            'rental_cost' => $data['rental_cost'] ?: null,
            'used_times' => $data['times_used'],
            'brand_id' => $data['orignal_brand_id'] ?: null,
            'color' => $data['color'] ?? null,
            'size' => $data['size'] ?? null,
            'allow_alter_fitting' => !empty($data['allow_alter_fitting']) ? 1 : 0,
            'has_bill' => 0, // Will be updated if bill images are uploaded
            'dispatch_address' => $data['dispatch_address'] ?? null,
            'dispatch_pin_code' => $data['dispatch_pin_code'] ?? null,
            'dispatch_state' => $data['dispatch_state'] ?? null,
            'dispatch_city' => $data['dispatch_city'] ?? null,
            'specifications' => $data['specifications'] ?? null,
            'status' => in_array($jwtUser['role'], ['admin', 'super_admin']) ? 'approved' : 'pending',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        $db->table('products')->insert($productData);
        $productId = $db->insertID();

        if (!$productId) {
            return $this->respond(['success' => false, 'message' => 'Failed to create product'], 500);
        }

        // Handle image uploads
        $allFiles = $this->request->getFiles();
        // Support both 'product_images' (mobile payload key) and legacy 'images' key
        $imageFiles = $allFiles['product_images'] ?? $allFiles['images'] ?? null;
        if ($imageFiles) {
            log_message('info', 'Processing product_images array');
            $uploadPath = FCPATH . 'uploads/products/';
            if (!is_dir($uploadPath)) mkdir($uploadPath, 0777, true);

            $order = 0;
            foreach ($imageFiles as $img) {
                log_message('info', 'Processing image: ' . ($img ? 'valid file' : 'null'));
                if ($img && $img->isValid() && !$img->hasMoved()) {
                    $newName = $img->getRandomName();
                    $img->move($uploadPath, $newName);
                    $db->table('product_images')->insert([
                        'product_id' => $productId,
                        'image_path' => 'uploads/products/' . $newName,
                        'display_order' => $order++,
                    ]);
                    log_message('info', 'Image saved: ' . $newName);
                } else {
                    log_message('info', 'Image not valid or already moved: ' . ($img ? $img->getErrorString() : 'null'));
                }
            }
        } else {
            log_message('info', 'No product_images array found');
        }

        // Handle bill files (save into public uploads for web access) - allow up to 2 files (images or PDFs)
        $billPaths = [];
        if (isset($allFiles['bill_images'])) {
            log_message('info', 'Processing bill_images array');
            $uploadPath = FCPATH . 'uploads/bills/';
            if (!is_dir($uploadPath)) {
                mkdir($uploadPath, 0777, true);
            }

            $count = 0;
            foreach ($allFiles['bill_images'] as $file) {
                log_message('info', 'Processing bill file: ' . ($file ? 'valid file' : 'null'));
                if ($file && $file->isValid() && !$file->hasMoved() && $count < 2) {
                    $newName = $file->getRandomName();
                    try {
                        $file->move($uploadPath, $newName);
                        $billPaths[] = 'uploads/bills/' . $newName;
                        log_message('info', 'Bill file saved: ' . $newName);
                    } catch (\Exception $e) {
                        log_message('error', 'API uploadProduct: failed to move bill file for product ' . $productId . ' - ' . $e->getMessage());
                    }
                    $count++;
                } elseif ($file && $file->getError() !== UPLOAD_ERR_NO_FILE) {
                    log_message('info', 'Bill file not valid: ' . $file->getErrorString());
                }
            }

            if (!empty($billPaths)) {
                // If single file, keep string for backwards compatibility; if multiple, save JSON array
                $billField = count($billPaths) === 1 ? $billPaths[0] : json_encode($billPaths);
                try {
                    $db->table('products')->where('id', $productId)->update([
                        'bill_image' => $billField,
                        'has_bill' => 1
                    ]);
                    log_message('info', 'Updated product with bill images');
                } catch (\Exception $e) {
                    log_message('error', 'API uploadProduct: failed to update bill_image for product ' . $productId . ' - ' . $e->getMessage());
                }
            }
        } else {
            log_message('info', 'No bill_images array found');
        }

        return $this->respond([
            'success' => true,
            'message' => 'Product uploaded successfully. Pending admin approval.',
            'data' => ['product_id' => $productId],
        ], 201);
    }

    /**
     * POST /api/v1/seller/accept-offer/{id}
     */
    public function acceptOffer(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?? [];

        $offer = $db->table('offers')->where('id', $id)->where('seller_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$offer) return $this->respond(['success' => false, 'message' => 'Offer not found'], 404);
        if ($offer['status'] !== 'pending') return $this->respond(['success' => false, 'message' => 'Only pending offers can be accepted'], 400);

        $db->table('offers')->where('id', $id)->update(['status' => 'accepted', 'seller_remarks' => $data['remarks'] ?? '', 'updated_at' => date('Y-m-d H:i:s')]);
        
        // Auto-reject other pending offers for this product
        $db->table('offers')
            ->where('product_id', $offer['product_id'])
            ->where('id !=', $id)
            ->where('status', 'pending')
            ->update([
                'status' => 'rejected',
                'seller_remarks' => 'Another offer for this product has been accepted.',
                'updated_at' => date('Y-m-d H:i:s')
            ]);

        // Update product status to sold/rented if applicable
        if (($offer['offer_type'] ?? 'sale') === 'sale') {
            $db->table('products')->where('id', $offer['product_id'])->update(['status' => 'sold']);
        }
        // Create order
        $orderId = $db->table('orders')->insert([
            'order_number' => 'FLX' . strtoupper(uniqid()),
            'product_id' => $offer['product_id'],
            'buyer_id' => $offer['buyer_id'],
            'seller_id' => $offer['seller_id'],
            'order_type' => $offer['offer_type'] ?? 'sale',
            'final_price' => $offer['offer_price'],
            'deposit_amount' => $offer['deposit_amount'] ?? null,
            'rental_start_date' => $offer['rental_start_date'] ?? null,
            'rental_end_date' => $offer['rental_end_date'] ?? null,
            'delivery_address' => $offer['delivery_address'] ?? null,
            'delivery_pin_code' => $offer['delivery_pin_code'] ?? null,
            'payment_status' => 'pending',
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ], true);

        $db->table('order_status_history')->insert([
            'order_id' => $orderId, 'status' => 'pending', 'updated_by' => $jwtUser['user_id'],
            'remarks' => 'Order created from accepted offer', 'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Notify buyer
        $product = $db->table('products')->where('id', $offer['product_id'])->get()->getRowArray();
        $db->table('notifications')->insert([
            'user_id' => $offer['buyer_id'],
            'title' => 'Offer Accepted!',
            'message' => 'Your offer of ₹' . $offer['offer_price'] . ' on "' . ($product['title'] ?? '') . '" has been accepted.',
            'type' => 'offer',
            'is_read' => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Mark product as sold and cancel remaining offers
        $db->table('products')->where('id', $offer['product_id'])->update(['status' => 'sold', 'updated_at' => date('Y-m-d H:i:s')]);

        $otherOffers = $db->table('offers')->where('product_id', $offer['product_id'])->where('status', 'pending')->where('id !=', $id)->get()->getResultArray();
        foreach ($otherOffers as $other) {
            $db->table('offers')->where('id', $other['id'])->update(['status' => 'rejected', 'seller_remarks' => 'This product has been sold to another buyer.', 'updated_at' => date('Y-m-d H:i:s')]);
            $db->table('notifications')->insert([
                'user_id' => $other['buyer_id'],
                'title' => 'Offer Not Accepted',
                'message' => 'Sorry, "' . ($product['title'] ?? '') . '" has been sold to another buyer.',
                'type' => 'offer', 'is_read' => 0, 'created_at' => date('Y-m-d H:i:s'),
            ]);
        }

        return $this->respond(['success' => true, 'message' => 'Offer accepted, order created', 'data' => ['order_id' => $orderId]]);
    }

    /**
     * POST /api/v1/seller/reject-offer/{id}
     */
    public function rejectOffer(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?? [];

        $offer = $db->table('offers')->where('id', $id)->where('seller_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$offer) return $this->respond(['success' => false, 'message' => 'Offer not found'], 404);
        if ($offer['status'] !== 'pending') return $this->respond(['success' => false, 'message' => 'Only pending offers can be rejected'], 400);

        $db->table('offers')->where('id', $id)->update(['status' => 'rejected', 'seller_remarks' => $data['remarks'] ?? '', 'updated_at' => date('Y-m-d H:i:s')]);

        // Notify buyer
        $product = $db->table('products')->where('id', $offer['product_id'])->get()->getRowArray();
        $db->table('notifications')->insert([
            'user_id' => $offer['buyer_id'],
            'title' => 'Offer Rejected',
            'message' => 'Your offer on "' . ($product['title'] ?? '') . '" was rejected.' . ($data['remarks'] ? ' Reason: ' . $data['remarks'] : ''),
            'type' => 'offer',
            'is_read' => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Offer rejected']);
    }

    /**
     * GET /api/v1/seller/chats
     * Returns all offers that have at least one message, with last message + unread count
     */
    public function chats()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $conversations = $db->query("
            SELECT
                o.id            AS offer_id,
                o.status        AS offer_status,
                o.offer_price,

                p.title         AS product_title,
                p.id            AS product_id,
                u.name          AS buyer_name,
                u.id            AS buyer_id,
                lm.message      AS last_message,
                lm.sender_role  AS last_sender_role,
                lm.created_at   AS last_message_at,
                (SELECT COUNT(*) FROM offer_messages
                    WHERE offer_id = o.id AND sender_role = 'buyer' AND is_read = 0) AS unread_count
            FROM offers o
            JOIN products p ON p.id = o.product_id
            JOIN users u ON u.id = o.buyer_id
            JOIN (
                SELECT offer_id, message, sender_role, created_at
                FROM offer_messages om1
                WHERE created_at = (
                    SELECT MAX(created_at) FROM offer_messages om2 WHERE om2.offer_id = om1.offer_id
                )
            ) lm ON lm.offer_id = o.id
            WHERE o.seller_id = ?
            ORDER BY lm.created_at DESC
        ", [$jwtUser['user_id']])->getResultArray();

        return $this->respond(['success' => true, 'data' => $conversations]);
    }

    /**
     * GET /api/v1/seller/offer-messages/{offerId}
     */
    public function getOfferMessages(int $offerId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $offer = $db->table('offers')->where('id', $offerId)->where('seller_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$offer) return $this->respond(['success' => false, 'message' => 'Offer not found'], 404);

        $messages = $db->table('offer_messages om')
            ->select('om.*, u.name as sender_name')
            ->join('users u', 'u.id = om.sender_id', 'left')
            ->where('om.offer_id', $offerId)
            ->orderBy('om.created_at', 'ASC')
            ->get()->getResultArray();

        // Mark buyer messages as read
        $db->table('offer_messages')->where('offer_id', $offerId)->where('sender_role', 'buyer')->update(['is_read' => 1]);

        return $this->respond(['success' => true, 'data' => $messages]);
    }

    /**
     * POST /api/v1/seller/offer-messages/{offerId}/upload
     */
    public function uploadOfferMedia(int $offerId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $offer = $db->table('offers')->where('id', $offerId)->where('seller_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$offer) return $this->respond(['success' => false, 'message' => 'Offer not found'], 404);

        $file = $this->request->getFile('file');
        if (!$file || !$file->isValid()) {
            return $this->respond(['success' => false, 'message' => 'No valid file uploaded'], 400);
        }

        $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'mp4', 'mov'];
        if (!in_array(strtolower($file->getClientExtension()), $allowed)) {
            return $this->respond(['success' => false, 'message' => 'File type not allowed'], 400);
        }

        if ($file->getSize() > 10 * 1024 * 1024) {
            return $this->respond(['success' => false, 'message' => 'File too large. Max 10 MB.'], 400);
        }

        $uploadPath = FCPATH . 'uploads/chat/';
        if (!is_dir($uploadPath)) mkdir($uploadPath, 0755, true);

        $newName = uniqid('chat_') . '.' . $file->getClientExtension();
        $file->move($uploadPath, $newName);

        $mediaUrl = 'uploads/chat/' . $newName;
        $caption  = trim($this->request->getPost('message') ?? '');

        $db->table('offer_messages')->insert([
            'offer_id'    => $offerId,
            'sender_id'   => $jwtUser['user_id'],
            'sender_role' => 'seller',
            'message'     => $caption ?: '',
            'media_url'   => $mediaUrl,
            'is_read'     => 0,
            'created_at'  => date('Y-m-d H:i:s'),
        ]);

        $product = $db->table('products')->where('id', $offer['product_id'])->get()->getRowArray();
        $db->table('notifications')->insert([
            'user_id'    => $offer['buyer_id'],
            'title'      => 'Seller sent a file',
            'message'    => 'Seller shared media on your offer for "' . ($product['title'] ?? '') . '".',
            'type'       => 'offer',
            'is_read'    => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'media_url' => $mediaUrl]);
    }

    /**
     * POST /api/v1/seller/offer-messages/{offerId}
     */
    public function sendOfferMessage(int $offerId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $body = $this->request->getJSON(true) ?? [];

        $offer = $db->table('offers')->where('id', $offerId)->where('seller_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$offer) return $this->respond(['success' => false, 'message' => 'Offer not found'], 404);

        $message = trim($body['message'] ?? '');
        if ($message === '') return $this->respond(['success' => false, 'message' => 'Message cannot be empty'], 400);

        $db->table('offer_messages')->insert([
            'offer_id'    => $offerId,
            'sender_id'   => $jwtUser['user_id'],
            'sender_role' => 'seller',
            'message'     => $message,
            'is_read'     => 0,
            'created_at'  => date('Y-m-d H:i:s'),
        ]);

        $product = $db->table('products')->where('id', $offer['product_id'])->get()->getRowArray();
        $db->table('notifications')->insert([
            'user_id'    => $offer['buyer_id'],
            'title'      => 'New message from seller',
            'message'    => 'Seller sent a message on your offer for "' . ($product['title'] ?? '') . '".',
            'type'       => 'offer',
            'is_read'    => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Message sent']);
    }

    /**
     * POST /api/v1/seller/mark-dispatched/{orderId}
     */
    public function markDispatched(int $orderId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $order = $db->table('orders')->where('id', $orderId)->where('seller_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$order) return $this->respond(['success' => false, 'message' => 'Order not found'], 404);
        if ($order['status'] !== 'confirmed') return $this->respond(['success' => false, 'message' => 'Order can only be dispatched after payment is received'], 400);

        $db->table('orders')->where('id', $orderId)->update(['status' => 'dispatched', 'dispatched_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')]);

        $db->table('order_status_history')->insert([
            'order_id' => $orderId, 'status' => 'dispatched', 'updated_by' => $jwtUser['user_id'],
            'remarks' => 'Marked as dispatched by seller', 'created_at' => date('Y-m-d H:i:s'),
        ]);

        $db->table('notifications')->insert([
            'user_id' => $order['buyer_id'],
            'title' => 'Order Dispatched',
            'message' => 'Your order #' . $orderId . ' has been dispatched!',
            'type' => 'order',
            'is_read' => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Order marked as dispatched']);
    }

    /**
     * POST /api/v1/seller/confirm-delivery/{orderId}
     * Seller uploads a delivery photograph to confirm the order is delivered.
     */
    public function confirmDelivery(int $orderId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $order = $db->table('orders')->where('id', $orderId)->where('seller_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$order) return $this->respond(['success' => false, 'message' => 'Order not found'], 404);
        if ($order['status'] !== 'dispatched') return $this->respond(['success' => false, 'message' => 'Order can only be confirmed after dispatching'], 400);

        $photo = $this->request->getFile('delivery_photo');
        if (!$photo || !$photo->isValid()) {
            return $this->respond(['success' => false, 'message' => 'A delivery photograph is required to confirm delivery'], 400);
        }

        $uploadPath = FCPATH . 'uploads/delivery/';
        if (!is_dir($uploadPath)) mkdir($uploadPath, 0777, true);
        $newName = $photo->getRandomName();
        $photo->move($uploadPath, $newName);
        $photoPath = 'uploads/delivery/' . $newName;

        $db->table('orders')->where('id', $orderId)->update([
            'status'         => 'delivered',
            'delivery_photo' => $photoPath,
            'updated_at'     => date('Y-m-d H:i:s'),
        ]);

        $db->table('order_status_history')->insert([
            'order_id'   => $orderId,
            'status'     => 'delivered',
            'updated_by' => $jwtUser['user_id'],
            'remarks'    => 'Delivery confirmed by seller with photograph',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        $db->table('notifications')->insert([
            'user_id'    => $order['buyer_id'],
            'title'      => 'Order Delivered',
            'message'    => 'Your order #' . $orderId . ' has been delivered! You can now leave a review.',
            'type'       => 'order',
            'is_read'    => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Delivery confirmed successfully']);
    }

    /**
     * POST /api/v1/seller/delete-product/{id}
     */
    public function deleteProduct(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $product = $db->table('products')->where('id', $id)->where('seller_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$product) return $this->respond(['success' => false, 'message' => 'Product not found'], 404);

        $hasOrders = $db->table('orders')->where('product_id', $id)->whereNotIn('status', ['cancelled', 'completed'])->countAllResults();
        if ($hasOrders > 0) return $this->respond(['success' => false, 'message' => 'Cannot delete product with active orders'], 400);

        $db->table('product_images')->where('product_id', $id)->delete();
        $db->table('offers')->where('product_id', $id)->where('status', 'pending')->update(['status' => 'cancelled']);
        $db->table('products')->where('id', $id)->delete();

        return $this->respond(['success' => true, 'message' => 'Product deleted']);
    }

    /**
     * POST /api/v1/seller/edit-product/{id}
     */
    public function editProduct(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $product = $db->table('products')->where('id', $id)->where('seller_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$product) return $this->respond(['success' => false, 'message' => 'Product not found'], 404);

        $data = $this->request->getPost() ?: $this->request->getJSON(true);
        $processedData = $this->cleanProductData($data, $db);

        $db->table('product_edit_requests')->insert([
            'product_id' => $id,
            'seller_id' => $jwtUser['user_id'],
            'updated_data' => json_encode($processedData),
            'temp_images' => '[]',
            'deleted_images_ids' => '[]',
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Edit request submitted for admin approval']);
    }

    /**
     * POST /api/v1/seller/update-product/{id}
     */
    public function updateProduct(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $product = $db->table('products')->where('id', $id)->get()->getRowArray();
        if (!$product) return $this->respond(['success' => false, 'message' => 'Product not found'], 404);

        // Check permissions: super_admin/admin can update any product, regular sellers can only update their own
        if (!in_array($jwtUser['role'], ['super_admin', 'admin', 'superadmin']) && $product['seller_id'] != $jwtUser['user_id']) {
            return $this->respond(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // For regular sellers, create edit request instead of direct update
        if (!in_array($jwtUser['role'], ['super_admin', 'admin', 'superadmin'])) {
            return $this->editProduct($id);
        }

        // Direct update for admins
        $data = $this->request->getPost() ?: $this->request->getJSON(true);
        $updateData = $this->cleanProductData($data, $db);
        $updateData['updated_at'] = date('Y-m-d H:i:s');

        // Handle file uploads
        $files = $this->request->getFiles();
        $imageFiles = $files['product_images'] ?? $files['images'] ?? null;
        if ($imageFiles) {
            $uploadPath = FCPATH . 'uploads/products/';
            if (!is_dir($uploadPath)) mkdir($uploadPath, 0777, true);

            foreach ($imageFiles as $file) {
                if ($file->isValid() && !$file->hasMoved()) {
                    $newName = $file->getRandomName();
                    $file->move($uploadPath, $newName);
                    
                    $db->table('product_images')->insert([
                        'product_id' => $id,
                        'image_path' => 'uploads/products/' . $newName,
                        'display_order' => 0,
                        'created_at' => date('Y-m-d H:i:s'),
                    ]);
                }
            }
        }

        // Update product
        $db->table('products')->where('id', $id)->update($updateData);

        return $this->respond(['success' => true, 'message' => 'Product updated successfully']);
    }

    /**
     * GET /api/v1/seller/product/{id}
     */
    public function productDetail(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $builder = $db->table('products')->where('id', $id);
        
        // Admins and super admins can view any product
        if (!in_array($jwtUser['role'], ['admin', 'super_admin'])) {
            $builder->where('seller_id', $jwtUser['user_id']);
        }
        
        $product = $builder->get()->getRowArray();
        if (!$product) return $this->respond(['success' => false, 'message' => 'Product not found'], 404);

        $images = $db->table('product_images')->where('product_id', $id)->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => array_merge($product, ['images' => $images])]);
    }

    /**
     * POST /api/v1/seller/report-user/:id
     * Seller reports a buyer. Auto-suspends after 3 reports in 7 days.
     */
    public function reportUser(int $reportedId)
    {
        $jwtUser  = $this->request->jwt_user;
        $reporter = (int) $jwtUser['user_id'];
        $db       = \Config\Database::connect();

        if ($reporter === $reportedId) {
            return $this->respond(['success' => false, 'message' => 'You cannot report yourself'], 400);
        }

        $reported = $db->table('users')->where('id', $reportedId)->get()->getRowArray();
        if (!$reported) {
            return $this->respond(['success' => false, 'message' => 'User not found'], 404);
        }
        if (in_array($reported['role'] ?? '', ['admin', 'super_admin'])) {
            return $this->respond(['success' => false, 'message' => 'Cannot report an admin'], 400);
        }

        $reason = trim($this->request->getPost('reason') ?? '');
        if (empty($reason)) {
            return $this->respond(['success' => false, 'message' => 'A reason is required'], 400);
        }

        // Prevent duplicate report within 7 days
        $alreadyReported = $db->table('user_reports')
            ->where('reporter_id', $reporter)
            ->where('reported_id', $reportedId)
            ->where('created_at >=', date('Y-m-d H:i:s', strtotime('-7 days')))
            ->countAllResults();
        if ($alreadyReported > 0) {
            return $this->respond(['success' => false, 'message' => 'You have already reported this user in the past 7 days'], 400);
        }

        // Assign to a random admin or superadmin
        $admins = $db->table('users')
            ->whereIn('role', ['admin', 'super_admin'])
            ->where('is_blocked', 0)
            ->get()->getResultArray();
        $assignedAdminId = !empty($admins) ? $admins[array_rand($admins)]['id'] : null;

        $db->table('user_reports')->insert([
            'reporter_id'       => $reporter,
            'reported_id'       => $reportedId,
            'reporter_role'     => 'seller',
            'reason'            => $reason,
            'status'            => 'pending',
            'assigned_admin_id' => $assignedAdminId,
            'created_at'        => date('Y-m-d H:i:s'),
            'updated_at'        => date('Y-m-d H:i:s'),
        ]);

        // Count reports against this user in the last 7 days
        $weeklyReports = $db->table('user_reports')
            ->where('reported_id', $reportedId)
            ->where('created_at >=', date('Y-m-d H:i:s', strtotime('-7 days')))
            ->countAllResults();

        if ($weeklyReports >= 3 && !$reported['is_suspended']) {
            $db->table('users')->where('id', $reportedId)->update([
                'is_suspended'      => 1,
                'suspended_at'      => date('Y-m-d H:i:s'),
                'suspension_reason' => 'Auto-suspended: received ' . $weeklyReports . ' reports within 7 days.',
                'updated_at'        => date('Y-m-d H:i:s'),
            ]);

            // Notify all admins about the auto-suspension
            foreach ($admins as $admin) {
                $db->table('notifications')->insert([
                    'user_id'    => $admin['id'],
                    'title'      => 'User Auto-Suspended',
                    'message'    => 'User "' . $reported['name'] . '" has been auto-suspended after receiving ' . $weeklyReports . ' reports in 7 days.',
                    'type'       => 'user_suspended',
                    'is_read'    => 0,
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }
        } elseif ($assignedAdminId) {
            // Notify the assigned admin
            $db->table('notifications')->insert([
                'user_id'    => $assignedAdminId,
                'title'      => 'New User Report',
                'message'    => 'A seller reported user "' . $reported['name'] . '". Reason: ' . substr($reason, 0, 100),
                'type'       => 'user_report',
                'is_read'    => 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }

        return $this->respond(['success' => true, 'message' => 'Report submitted successfully']);
    }

    /**
     * POST /api/v1/seller/rate-buyer
     * Body: { offer_id, rating }
     */
    public function rateBuyer()
    {
        $jwtUser = $this->request->jwt_user;
        $userId = $jwtUser['user_id'];
        $db = \Config\Database::connect();

        $data = $this->request->getPost() ?: $this->request->getJSON(true);
        $offerId = $data['offer_id'] ?? null;
        $rating = (float) ($data['rating'] ?? 5.0);

        if ($rating < 1 || $rating > 5) {
            return $this->respond(['success' => false, 'message' => 'Rating must be between 1 and 5'], 400);
        }

        $offer = $db->table('offers')->where('id', $offerId)->get()->getRowArray();
        if (!$offer || $offer['seller_id'] != $userId) {
            return $this->respond(['success' => false, 'message' => 'Invalid offer'], 404);
        }
        if ($offer['status'] !== 'accepted') {
            return $this->respond(['success' => false, 'message' => 'Offer must be accepted before rating'], 400);
        }
        if (isset($offer['seller_rated_buyer']) && $offer['seller_rated_buyer']) {
            return $this->respond(['success' => false, 'message' => 'You have already rated this buyer'], 400);
        }

        $limitSetting = $db->table('system_settings')->where('setting_key', 'seller_rating_period_days')->get()->getRowArray();
        $ratingPeriod = $limitSetting ? (float) $limitSetting['setting_value'] : 7;
        
        if (!empty($offer['accepted_at'])) {
            if (time() > strtotime($offer['accepted_at']) + ($ratingPeriod * 86400)) {
                return $this->respond(['success' => false, 'message' => 'Rating window has expired'], 400);
            }
        }

        $buyerId = $offer['buyer_id'];
        $buyer = $db->table('users')->where('id', $buyerId)->get()->getRowArray();
        $oldCount = (int) ($buyer['buyer_rating_count'] ?? 0);
        $oldAvg = (float) ($buyer['buyer_rating_avg'] ?? 0);
        $newCount = $oldCount + 1;
        $newAvg = (($oldAvg * $oldCount) + $rating) / $newCount;

        $db->transStart();
        $db->table('offers')->where('id', $offerId)->update(['seller_rated_buyer' => 1]);
        $db->table('users')->where('id', $buyerId)->update([
            'buyer_rating_avg' => round($newAvg, 2),
            'buyer_rating_count' => $newCount,
        ]);
        $db->table('reviews')->insert([
            'reviewer_id' => $userId,
            'reviewed_id' => $buyerId,
            'product_id' => $offer['product_id'],
            'reviewer_type' => 'seller',
            'rating' => (int) round($rating),
            'comment' => 'Seller rated buyer star: ' . $rating,
            'review_type' => 'buyer_rating',
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->respond(['success' => false, 'message' => 'Failed to save rating'], 500);
        }

        return $this->respond(['success' => true, 'message' => 'Buyer rated successfully!']);
    }
    /**
     * Helper to clean and map product data from request to database fields
     */
    private function cleanProductData(array $data, &$db): array
    {
        $updateData = [];
        $fieldMap = [
            'times_used'            => 'used_times',
            'condition_description' => 'description',
            'orignal_brand_id'      => 'brand_id'
        ];

        // Resolve names for IDs
        if (!empty($data['category_id'])) {
            $cat = $db->table('categories')->where('id', $data['category_id'])->get()->getRowArray();
            if ($cat) $updateData['category'] = $cat['category_name'];
        }
        if (!empty($data['sub_category_id'])) {
            $subCat = $db->table('sub_categories')->where('id', $data['sub_category_id'])->get()->getRowArray();
            if ($subCat) $updateData['sub_category'] = $subCat['name'];
        }
        if (!empty($data['listing_type_category'])) {
            $lt = $db->table('listing_types')->where('id', $data['listing_type_category'])->get()->getRowArray();
            if ($lt) $updateData['listing_type_category'] = $lt['type_name'];
        }
        if (!empty($data['product_type'])) {
            $pt = $db->table('product_types')->where('id', $data['product_type'])->get()->getRowArray();
            if ($pt) $updateData['product_type'] = $pt['name'];
        }

        foreach ($data as $key => $value) {
            // Skip keys we already handled or that shouldn't be in products table
            if (in_array($key, ['category_id', 'sub_category_id', 'listing_type_category', 'product_type', 'images', 'product_images', 'jwt_user'])) continue;

            $dbKey = $fieldMap[$key] ?? $key;
            
            // Handle boolean/checkbox fields
            if ($key === 'has_bill' || $key === 'allow_alter_fitting') {
                $updateData[$dbKey] = $value ? 1 : 0;
            } else {
                $updateData[$dbKey] = $value;
            }
        }
        
        return $updateData;
    }
}
