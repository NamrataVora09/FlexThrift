<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class BuyerApi extends ResourceController
{
    protected $format = 'json';

    public function dashboard()
    {
        $jwtUser = $this->request->jwt_user;
        $userId = $jwtUser['user_id'];
        $db = \Config\Database::connect();

        $user = $db->table('users')->where('id', $userId)->get()->getRowArray();

        // Product stats
        $ttlProducts = $db->table('offers')->where('buyer_id', $userId)->countAllResults();
        $pendingOffers = $db->table('offers')->where('buyer_id', $userId)->where('status', 'pending')->countAllResults();
        $acceptedOffers = $db->table('offers')->where('buyer_id', $userId)->where('status', 'accepted')->countAllResults();
        $totalOrders = $db->table('orders')->where('buyer_id', $userId)->countAllResults();

        // Recent offers
        $recentOffers = $db->table('offers o')
            ->select('o.*, p.title as product_title, p.listing_type, u.name as seller_name')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users u', 'u.id = o.seller_id', 'left')
            ->where('o.buyer_id', $userId)
            ->orderBy('o.created_at', 'DESC')
            ->limit(5)
            ->get()->getResultArray();

        // Notifications
        $notifications = $db->table('notifications')
            ->where('user_id', $userId)
            ->where('is_read', 0)
            ->orderBy('created_at', 'DESC')
            ->limit(5)
            ->get()->getResultArray();

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
                    'referral_code' => $user['referral_code'] ?? '',
                ],
                'stats' => [
                    'ttl_products' => $ttlProducts,
                    'pending' => $pendingOffers,
                    'accepted' => $acceptedOffers,
                    'total_orders' => $totalOrders,
                ],
                'recent_offers' => $recentOffers,
                'notifications' => $notifications,
            ],
        ]);
    }

    public function browse()
    {
        $jwtUser = isset($this->request->jwt_user) ? $this->request->jwt_user : null;
        $buyerId = $jwtUser ? (int) $jwtUser['user_id'] : null;
        $db = \Config\Database::connect();
        $page = (int) ($this->request->getGet('page') ?? 1);
        $perPage = 12;
        $offset = ($page - 1) * $perPage;
        $search      = $this->request->getGet('search');
        $listingType = $this->request->getGet('listing_type');
        $category    = $this->request->getGet('category');

        // ── Filter params ────────────────────────────────────────────────────
        $minPrice   = $this->request->getGet('min_price');
        $maxPrice   = $this->request->getGet('max_price');
        $categoryId = $this->request->getGet('category_id');
        $subCatId   = $this->request->getGet('sub_category_id');
        $brandId    = $this->request->getGet('brand_id');
        $color      = $this->request->getGet('color');
        $size       = $this->request->getGet('size');
        $gender     = $this->request->getGet('gender');
        $condition  = $this->request->getGet('condition'); // 'new' | 'used'
        $specs      = $this->request->getGet('specs');     // JSON string
        // ─────────────────────────────────────────────────────────────────────

        $builder = $db->table('products p')
            ->select('p.*, u.name as seller_name, u.seller_rating_avg, ob.brand_name as brand_name, (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.display_order ASC LIMIT 1) as image')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->join('orignal_brands ob', 'ob.id = p.brand_id AND ob.is_active = 1', 'left')
            ->where('p.status', 'approved');

        // Exclude blocked sellers if user is authenticated
        if ($buyerId) {
            $blocked = $db->table('buyer_blocked_sellers')
                ->select('blocked_seller_id')
                ->where('buyer_id', $buyerId)
                ->get()->getResultArray();
            if (!empty($blocked)) {
                $builder->whereNotIn('p.seller_id', array_column($blocked, 'blocked_seller_id'));
            }
        }

        if ($search) {
            $builder->groupStart()
                ->like('p.title', $search)
                ->orLike('p.description', $search)
                ->groupEnd();
        }
        if ($listingType) {
            // Rental products always appear in browse regardless of the active filter
            if (in_array(strtolower($listingType), ['sell', 'rent'])) {
                $builder->groupStart()
                    ->where('p.listing_type', strtolower($listingType))
                    ->orWhere('p.listing_type', 'rent')
                    ->groupEnd();
            } else {
                $builder->groupStart()
                    ->where('LOWER(p.listing_type_category)', strtolower($listingType))
                    ->orWhere('p.listing_type', 'rent')
                    ->groupEnd();
            }
        }
        if ($category) $builder->where('p.category', $category);

        // ── Apply new filters ─────────────────────────────────────────────────
        if ($minPrice !== null && $minPrice !== '') {
            $minVal = (float) $minPrice;
            $builder->where("COALESCE(p.price, p.original_price, p.rental_cost) >= $minVal", null, false);
        }
        if ($maxPrice !== null && $maxPrice !== '') {
            $maxVal = (float) $maxPrice;
            $builder->where("COALESCE(p.price, p.original_price, p.rental_cost) <= $maxVal", null, false);
        }
        if ($categoryId) {
            $catIdInt = (int) $categoryId;
            $builder->groupStart()
                ->like('p.category_ids', "\"$catIdInt\"")
                ->orWhere('p.category', $categoryId)
                ->groupEnd();
        }
        if ($subCatId) {
            $subCatIdInt = (int) $subCatId;
            $builder->groupStart()
                ->like('p.sub_category_ids', "\"$subCatIdInt\"")
                ->orWhere('p.sub_category', $subCatId)
                ->groupEnd();
        }
        if ($brandId)   $builder->where('p.brand_id', (int) $brandId);
        if ($color)     $builder->like('p.color', $color);
        if ($size)      $builder->like('p.size', $size);
        if ($gender) {
            $builder->groupStart()
                ->like('p.gender', $gender)
                ->orLike('p.gender_ids', $gender)
                ->groupEnd();
        }
        if ($condition === 'new') {
            $builder->groupStart()
                ->where('p.used_times', 0)
                ->orWhere('p.used_times IS NULL', null, false)
                ->groupEnd();
        } elseif ($condition === 'used') {
            $builder->where('p.used_times >', 0);
        }
        // Dynamic attribute filtering via JSON specifications column
        if ($specs) {
            $specsArr = json_decode($specs, true) ?: [];
            foreach ($specsArr as $key => $val) {
                if ($key !== '' && $val !== '') {
                    $path = '$.' . json_encode($key);
                    $builder->where('JSON_UNQUOTE(JSON_EXTRACT(p.specifications, ' . $db->escape($path) . '))', $val);
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        $total    = $builder->countAllResults(false);
        $products = $builder->orderBy('p.created_at', 'DESC')
            ->limit($perPage, $offset)
            ->get()->getResultArray();

        // ── Filter sidebar options ────────────────────────────────────────────
        $categories    = $db->table('categories')->where('is_active', 1)->select('id, name, field_config')->orderBy('name')->get()->getResultArray();
        $subCategories = $db->table('sub_categories')->select('id, name, category_id, field_config')->orderBy('name')->get()->getResultArray();
        $brands        = $db->table('orignal_brands')->where('is_active', 1)->select('id, brand_name')->orderBy('brand_name')->get()->getResultArray();
        $colors        = $db->table('colors')->select('id, name')->orderBy('name')->get()->getResultArray();
        $genders       = $db->table('genders')->select('id, name')->get()->getResultArray();
        $sizesRaw      = $db->query("SELECT DISTINCT size FROM products WHERE status = 'approved' AND size IS NOT NULL AND size != '' AND size != '[]' ORDER BY size")->getResultArray();
        $priceRange    = $db->query("SELECT FLOOR(MIN(COALESCE(price, original_price, 0))) as min_price, CEIL(MAX(COALESCE(price, original_price, rental_cost, 0))) as max_price FROM products WHERE status = 'approved'")->getRowArray();
        // ─────────────────────────────────────────────────────────────────────

        return $this->respond([
            'success' => true,
            'data' => [
                'products'       => $products,
                'categories'     => $categories,
                'pagination'     => [
                    'page'        => $page,
                    'per_page'    => $perPage,
                    'total'       => $total,
                    'total_pages' => (int) ceil($total / $perPage),
                ],
                'filter_options' => [
                    'categories'     => $categories,
                    'sub_categories' => $subCategories,
                    'brands'         => $brands,
                    'colors'         => $colors,
                    'genders'        => $genders,
                    'sizes'          => array_column($sizesRaw, 'size'),
                    'price_range'    => $priceRange ?: ['min_price' => 0, 'max_price' => 100000],
                ],
            ],
        ]);
    }

    public function productDetails(int $id)
    {
        $db = \Config\Database::connect();

        // 0. Identify viewer (optional JWT + IP)
        $authHeader = $this->request->getHeaderLine('Authorization');
        $userId = null;
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
            $payload = \App\Libraries\JWT::decode($token);
            if ($payload) $userId = $payload['user_id'];
        }
        $ip = $this->request->getIPAddress();
        $agent = $this->request->getUserAgent()->getAgentString();

        // 1. Check for recent view (last 24h) to prevent redundant increments
        $isDuplicate = false;
        $check = $db->table('product_views_log')
            ->where('product_id', $id)
            ->where('created_at >', date('Y-m-d H:i:s', strtotime('-24 hours')));

        if ($userId) {
            $check->where('user_id', $userId);
        } else {
            $check->where('ip_address', $ip);
        }

        if ($check->countAllResults() > 0) {
            $isDuplicate = true;
        }

        if (!$isDuplicate) {
            // Increment view count
            $db->table('products')->where('id', $id)->set('views_count', 'views_count + 1', false)->update();

            // Log this view
            $db->table('product_views_log')->insert([
                'product_id' => $id,
                'user_id'    => $userId,
                'ip_address' => $ip,
                'user_agent' => substr($agent, 0, 255),
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }

        // 2. Fetch product details
        $product = $db->table('products p')
            ->select('p.*, u.name as seller_name, u.email as seller_email, u.mobile as seller_mobile, u.seller_rating_avg, u.seller_rating_count, ob.brand_name as brand, lt.usage_label')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->join('orignal_brands ob', 'ob.id = p.brand_id AND ob.is_active = 1 AND ob.is_blocked = 0', 'left')
            ->join('listing_types lt', 'lt.type_name = p.listing_type_category', 'left')
            ->where('p.id', $id)
            ->get()->getRowArray();

        if (!$product) {
            return $this->respond(['success' => false, 'message' => 'Product not found'], 404);
        }

        $images = $db->table('product_images')->where('product_id', $id)->get()->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => [
                'product' => $product,
                'images' => $images,
                'min_rental_days' => (int) getSystemSetting('min_rental_days', 3),
            ],
        ]);
    }

    /**
     * GET /api/v1/product/{id}/similar
     * Returns similar products based on category, brand, listing type, and gender.
     */
    public function similarProducts(int $id)
    {
        $db = \Config\Database::connect();

        $product = $db->table('products')->where('id', $id)->get()->getRowArray();
        if (!$product) {
            return $this->respond(['success' => false, 'message' => 'Product not found'], 404);
        }

        // Build a scored similarity query
        // Priority: same category > same brand > same listing type > same gender
        $builder = $db->table('products p')
            ->select('p.*, u.name as seller_name, u.seller_rating_avg, ob.brand_name as brand_name,
                (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.display_order ASC LIMIT 1) as image')
            ->join('users u', 'u.id = p.seller_id', 'left')
            ->join('orignal_brands ob', 'ob.id = p.brand_id AND ob.is_active = 1', 'left')
            ->where('p.status', 'approved')
            ->where('p.id !=', $id);

        // Match on at least one attribute: category, brand, or listing_type
        $builder->groupStart();
        if (!empty($product['category'])) {
            $builder->where('p.category', $product['category']);
        }
        if (!empty($product['brand_id'])) {
            $builder->orWhere('p.brand_id', $product['brand_id']);
        }
        if (!empty($product['listing_type'])) {
            $builder->orWhere('p.listing_type', $product['listing_type']);
        }
        if (!empty($product['gender'])) {
            $builder->orWhere('p.gender', $product['gender']);
        }
        $builder->groupEnd();

        $similar = $builder->orderBy('p.views_count', 'DESC')
            ->limit(8)
            ->get()->getResultArray();

        // Score and sort by relevance
        $scored = array_map(function ($item) use ($product) {
            $score = 0;
            if ($item['category'] === $product['category'])
                $score += 4;
            if ($item['brand_id'] === $product['brand_id'])
                $score += 3;
            if ($item['listing_type'] === $product['listing_type'])
                $score += 2;
            if ($item['gender'] === $product['gender'])
                $score += 1;
            $item['_score'] = $score;
            return $item;
        }, $similar);

        usort($scored, function ($a, $b) {
            return $b['_score'] - $a['_score'];
        });

        // Remove internal score before responding
        $scored = array_map(function ($item) {
            unset($item['_score']);
            return $item;
        }, $scored);

        return $this->respond([
            'success' => true,
            'data' => $scored,
        ]);
    }

    public function myOffers()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $offers = $db->table('offers o')
            ->select('o.*, o.offer_price as offered_price,
                p.title as product_title, p.listing_type, p.original_price,
                p.rental_cost as rental_cost,
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

        $historyModel = new \App\Models\OfferHistoryModel();
        foreach ($offers as &$o) {
            $o['history'] = $historyModel->getHistoryByOffer($o['id']);
            
            // Check for conflicts
            if ((int)($o['is_product_sold'] ?? 0) > 0) {
                $o['conflict_info'] = [
                    'message' => 'This item has been sold to someone else.',
                    'type' => 'sold_conflict'
                ];
            } else if ((int)($o['is_rental_blocked'] ?? 0) > 0) {
                $o['conflict_info'] = [
                    'message' => 'The selected dates are now unavailable. Please update your proposal.',
                    'type' => 'rent_conflict'
                ];
            }
        }
        unset($o);

        return $this->respond([
            'success' => true,
            'data' => $offers,
            'minRentalDays' => (int) getSystemSetting('min_rental_days', 3),
            'acceptanceLimitDays' => (float) getSystemSetting('offer_acceptance_limit_days', 7),
            'ratingPeriod' => (float) getSystemSetting('seller_rating_period_days', 7),
            'rejectionWindowHours' => (float) getSystemSetting('seller_rejection_window_hours', 24),
        ]);
    }

    public function myOrders()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $orders = $db->table('orders o')
            ->select('o.*, p.title as product_title, p.listing_type, u.name as seller_name, (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.display_order ASC LIMIT 1) as primary_image')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users u', 'u.id = o.seller_id', 'left')
            ->where('o.buyer_id', $jwtUser['user_id'])
            ->orderBy('o.created_at', 'DESC')
            ->get()->getResultArray();

        foreach ($orders as &$order) {
            $review = $db->table('reviews')
                ->where('order_id', $order['id'])
                ->where('reviewer_id', $jwtUser['user_id'])
                ->get()->getRowArray();
            $order['review'] = $review ?: null;
            $order['can_review'] = in_array($order['status'], ['delivered', 'completed']) && !$review;
        }
        unset($order);

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

    /**
     * GET /api/v1/product/:id/booked-dates  (public)
     */
    public function getBookedDates(int $productId)
    {
        $db = \Config\Database::connect();

        $product = $db->table('products')->where('id', $productId)->where('status', 'approved')->get()->getRowArray();
        if (!$product || $product['listing_type'] !== 'rent') {
            return $this->respond(['success' => true, 'data' => ['booked_ranges' => []]], 200);
        }

        $offers = $db->table('offers')
            ->select('rental_start_date, rental_end_date')
            ->where('product_id', $productId)
            ->where('status', 'accepted')
            ->where('rental_start_date IS NOT NULL', null, false)
            ->where('rental_end_date IS NOT NULL', null, false)
            ->get()->getResultArray();

        $bookedRanges = array_map(fn($o) => [
            'start' => $o['rental_start_date'],
            'end' => $o['rental_end_date'],
        ], $offers);

        return $this->respond(['success' => true, 'data' => ['booked_ranges' => $bookedRanges]], 200);
    }

    /**
     * GET /api/v1/buyer/offer-status/:productId
     * Returns whether the authenticated buyer already has an active offer on a product.
     */
    public function offerStatus($productId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $offer = $db->table('offers')
            ->where('product_id', $productId)
            ->where('buyer_id', $jwtUser['user_id'])
            ->whereIn('status', ['pending', 'accepted', 'rejected'])
            ->get()->getRowArray();

        return $this->respond([
            'success' => true,
            'data' => [
                'has_offer' => !empty($offer),
                'offer' => $offer ?: null,
            ],
        ]);
    }

    /**
     * POST /api/v1/buyer/make-offer
     */
    public function makeOffer()
    {
        $jwtUser = $this->request->jwt_user;
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $product = $db->table('products')->where('id', $data['product_id'])->where('status', 'approved')->get()->getRowArray();
        if (!$product)
            return $this->respond(['success' => false, 'message' => 'Product not found or currently unavailable'], 404);

        // Check if seller is blocked
        $seller = $db->table('users')->where('id', $product['seller_id'])->get()->getRowArray();
        if ($seller && !empty($seller['blocked_seller'])) {
            return $this->respond(['success' => false, 'message' => 'This seller is currently blocked and cannot receive offers.'], 403);
        }

        if ($product['seller_id'] == $jwtUser['user_id'])
            return $this->respond(['success' => false, 'message' => 'Cannot make offer on your own product'], 400);

        // Prevent duplicate active offers from the same buyer on the same product
        $existingOffer = $db->table('offers')
            ->where('product_id', $data['product_id'])
            ->where('buyer_id', $jwtUser['user_id'])
            ->whereIn('status', ['pending', 'accepted'])
            ->get()->getRowArray();
        if ($existingOffer) {
            return $this->respond(['success' => false, 'message' => 'You already have an active offer on this product.'], 409);
        }

        // SuperAdmin bypasses subscription check
        if ($jwtUser['role'] !== 'super_admin') {
            $activeSub = $db->table('user_subscriptions')
                ->where('user_id', $jwtUser['user_id'])
                ->where('is_active', 1)
                ->where('expires_at >=', date('Y-m-d H:i:s'))
                ->get()->getRowArray();
            if (!$activeSub) {
                return $this->respond(['success' => false, 'message' => 'You need an active subscription to make offers. Please subscribe to a plan.'], 403);
            }
        }

        $offerType = $data['offer_type'] ?? $product['listing_type'];

        // For rent offers, validate dates and minimum rental period
        if ($offerType === 'rent') {
            if (empty($data['rental_start_date']) || empty($data['rental_end_date'])) {
                return $this->respond(['success' => false, 'message' => 'Rental start and end dates are required'], 400);
            }

            $start = new \DateTime($data['rental_start_date']);
            $end   = new \DateTime($data['rental_end_date']);
            $days  = (int) $start->diff($end)->days + 1;
            if ($days < 3) {
                return $this->respond(['success' => false, 'message' => 'Minimum rental period is 3 days.'], 400);
            }

            $overlapping = $db->table('offers')
                ->where('product_id', $data['product_id'])
                ->where('status', 'accepted')
                ->where('rental_start_date <=', $data['rental_end_date'])
                ->where('rental_end_date >=', $data['rental_start_date'])
                ->countAllResults();

            if ($overlapping > 0) {
                return $this->respond(['success' => false, 'message' => 'This product already has an active offer for the selected dates. Please choose different dates.'], 409);
            }
        }

        $offerData = [
            'product_id' => $data['product_id'],
            'buyer_id' => $jwtUser['user_id'],
            'seller_id' => $product['seller_id'],
            'offer_type' => $offerType,
            'offer_price' => $data['offer_price'],
            'deposit_amount' => $data['deposit_amount'] ?? null,
            'rental_start_date' => $data['rental_start_date'] ?? null,
            'rental_end_date' => $data['rental_end_date'] ?? null,
            'delivery_address' => $data['delivery_address'] ?? null,
            'delivery_pin_code' => $data['delivery_pin_code'] ?? null,
            'status' => 'pending',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        $offerId = $db->table('offers')->insert($offerData, true);

        // Create notification for seller
        $db->table('notifications')->insert([
            'user_id' => $product['seller_id'],
            'title' => 'New Offer Received',
            'message' => 'You received a new offer of ₹' . $data['offer_price'] . ' on "' . $product['title'] . '"',
            'type' => 'offer',
            'is_read' => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Offer submitted successfully', 'data' => ['offer_id' => $offerId]], 201);
    }

    /**
     * POST /api/v1/buyer/update-offer-dates/{id}
     */
    public function updateOfferDates(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?: $this->request->getPost();

        $offer = $db->table('offers')->where('id', $id)->where('buyer_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$offer)
            return $this->respond(['success' => false, 'message' => 'Offer not found'], 404);

        if (!in_array($offer['status'], ['pending', 'negotiating', 'rejected'])) {
            return $this->respond(['success' => false, 'message' => 'Dates can only be updated for active or rejected offers.'], 400);
        }

        $startDate = $data['rental_start_date'] ?? null;
        $endDate = $data['rental_end_date'] ?? null;
        $newPrice = $data['offer_price'] ?? null;

        $offerType = $offer['offer_type'] ?? $offer['listing_type'];
        $isRent = $offerType === 'rent';

        if ($isRent) {
            if (!$startDate || !$endDate) {
                return $this->respond(['success' => false, 'message' => 'Start and end dates are required for rental products.'], 400);
            }

            // Enforce minimum rental days from system settings
            helper('price_calculator');
            $minDays = (int) getSystemSetting('min_rental_days', 3);
            $days = (int)ceil((strtotime($endDate) - strtotime($startDate)) / 86400) + 1; // inclusive
            if ($days < $minDays) {
                return $this->respond(['success' => false, 'message' => "Minimum rental period is {$minDays} days. You selected {$days} day(s)."], 400);
            }

            // Check for conflicts with already accepted offers
            $overlapping = $db->table('offers')
                ->where('product_id', $offer['product_id'])
                ->where('id !=', $id)
                ->where('status', 'accepted')
                ->where('rental_start_date <=', $endDate)
                ->where('rental_end_date >=', $startDate)
                ->countAllResults();

            if ($overlapping > 0) {
                return $this->respond(['success' => false, 'message' => 'The selected dates conflict with an existing booking.'], 409);
            }
        }

        // Update offer — if negotiating or rejected, flip back to pending
        $updateData = [
            'updated_at' => date('Y-m-d H:i:s'),
        ];
        if ($isRent) {
            $updateData['rental_start_date'] = $startDate;
            $updateData['rental_end_date'] = $endDate;
        }

        if ($newPrice !== null && $offer['status'] !== 'rejected') {
            $updateData['offer_price'] = $newPrice;
        }

        if (in_array($offer['status'], ['negotiating', 'rejected'])) {
            $updateData['status'] = 'pending';
            if ($offer['status'] === 'rejected') {
                $updateData['message'] = 'Buyer has re-submitted the offer.';
            } else if ($isRent) {
                $updateData['message'] = 'Buyer has proposed new dates: ' . date('d M Y', strtotime($startDate)) . ' to ' . date('d M Y', strtotime($endDate)) . '.';
            }
        }

        $db->table('offers')->where('id', $id)->update($updateData);

        // Add to history
        $db->table('offer_history')->insert([
            'offer_id'       => $id,
            'changed_by'     => $jwtUser['user_id'],
            'action'         => 'buyer_date_update',
            'old_start_date' => $offer['rental_start_date'],
            'old_end_date'   => $offer['rental_end_date'],
            'new_start_date' => $startDate,
            'new_end_date'   => $endDate,
            'new_price'      => $newPrice ?? $offer['offer_price'],
            'created_at'     => date('Y-m-d H:i:s'),
        ]);

        // Notify seller when buyer counter-proposes after negotiation or rejection
        if (in_array($offer['status'], ['negotiating', 'rejected'])) {
            $product = $db->table('products')->where('id', $offer['product_id'])->get()->getRowArray();
            $buyer   = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();
            $db->table('notifications')->insert([
                'user_id'    => $offer['seller_id'],
                'title'      => 'Buyer Proposed New Dates',
                'message'    => ($buyer['name'] ?? 'The buyer') . ' has counter-proposed new dates for "' . ($product['title'] ?? '') . '": ' . date('d M Y', strtotime($startDate)) . ' to ' . date('d M Y', strtotime($endDate)) . '. Please review.',
                'type'       => 'offer',
                'is_read'    => 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }

        return $this->respond(['success' => true, 'message' => 'Offer dates updated successfully.']);
    }

    /**
     * POST /api/v1/buyer/cancel-offer/{id}
     */
    public function cancelOffer(int $id)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $offer = $db->table('offers')->where('id', $id)->where('buyer_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$offer)
            return $this->respond(['success' => false, 'message' => 'Offer not found'], 404);
        if (!in_array($offer['status'], ['pending', 'negotiating', 'accepted', 'rejected']))
            return $this->respond(['success' => false, 'message' => 'This offer can no longer be cancelled'], 400);

        // If offer was accepted, also cancel the associated order
        if ($offer['status'] === 'accepted') {
            $db->table('orders')
                ->where('buyer_id', $offer['buyer_id'])
                ->where('product_id', $offer['product_id'])
                ->where('status', 'pending')
                ->update(['status' => 'cancelled', 'updated_at' => date('Y-m-d H:i:s')]);
        }

        $db->table('offers')->where('id', $id)->update(['status' => 'cancelled', 'updated_at' => date('Y-m-d H:i:s')]);
        return $this->respond(['success' => true, 'message' => 'Offer cancelled']);
    }

    /**
     * POST /api/v1/buyer/confirm-delivery/{orderId}
     */
    public function confirmDelivery(int $orderId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $order = $db->table('orders')->where('id', $orderId)->where('buyer_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$order)
            return $this->respond(['success' => false, 'message' => 'Order not found'], 404);
        if (!in_array($order['status'], ['dispatched', 'delivered']))
            return $this->respond(['success' => false, 'message' => 'Order cannot be confirmed in current status'], 400);

        $db->table('orders')->where('id', $orderId)->update(['status' => 'completed', 'completed_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')]);

        $db->table('order_status_history')->insert([
            'order_id' => $orderId,
            'status' => 'completed',
            'updated_by' => $jwtUser['user_id'],
            'remarks' => 'Delivery confirmed by buyer',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Delivery confirmed']);
    }

    /**
     * POST /api/v1/buyer/cancel-order/{orderId}
     */
    public function cancelOrder(int $orderId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $order = $db->table('orders')->where('id', $orderId)->where('buyer_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$order)
            return $this->respond(['success' => false, 'message' => 'Order not found'], 404);
        if (!in_array($order['status'], ['pending']))
            return $this->respond(['success' => false, 'message' => 'Only pending orders can be cancelled'], 400);

        $db->table('orders')->where('id', $orderId)->update(['status' => 'cancelled', 'updated_at' => date('Y-m-d H:i:s')]);

        $db->table('order_status_history')->insert([
            'order_id' => $orderId,
            'status' => 'cancelled',
            'updated_by' => $jwtUser['user_id'],
            'remarks' => 'Cancelled by buyer',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Order cancelled']);
    }

    /**
     * POST /api/v1/buyer/submit-review
     */
    public function submitReview()
    {
        $jwtUser = $this->request->jwt_user;
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $order = $db->table('orders')->where('id', $data['order_id'])->where('buyer_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$order)
            return $this->respond(['success' => false, 'message' => 'Order not found'], 404);
        if (!in_array($order['status'], ['delivered', 'completed']))
            return $this->respond(['success' => false, 'message' => 'You can only review after the order is delivered'], 400);

        $existing = $db->table('reviews')->where('order_id', $data['order_id'])->where('reviewer_id', $jwtUser['user_id'])->get()->getRowArray();
        if ($existing)
            return $this->respond(['success' => false, 'message' => 'Already reviewed'], 400);

        $db->table('reviews')->insert([
            'order_id' => $data['order_id'],
            'product_id' => $order['product_id'],
            'reviewer_id' => $jwtUser['user_id'],
            'reviewed_id' => $order['seller_id'],
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? '',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Update seller rating incrementally (same as rateSeller) to avoid counting
        // rows from other review types (e.g. 'seller_rating') in the reviews table.
        $seller = $db->table('users')->where('id', $order['seller_id'])->get()->getRowArray();
        $oldCount = (int) ($seller['seller_rating_count'] ?? 0);
        $oldAvg = (float) ($seller['seller_rating_avg'] ?? 0);
        $newCount = $oldCount + 1;
        $newAvg = (($oldAvg * $oldCount) + (float) $data['rating']) / $newCount;
        $db->table('users')->where('id', $order['seller_id'])->update([
            'seller_rating_avg' => round($newAvg, 2),
            'seller_rating_count' => $newCount,
        ]);

        return $this->respond(['success' => true, 'message' => 'Review submitted']);
    }

    /**
     * POST /api/v1/buyer/pay-order/{orderId}
     */
    public function payOrder(int $orderId)
    {
        $jwtUser = $this->request->jwt_user;
        $buyerId = $jwtUser['user_id'];
        $db = \Config\Database::connect();

        $order = $db->table('orders')->where('id', $orderId)->get()->getRowArray();
        if (!$order || $order['buyer_id'] != $buyerId) {
            return $this->respond(['success' => false, 'message' => 'Invalid order'], 404);
        }
        if ($order['status'] !== 'pending') {
            return $this->respond(['success' => false, 'message' => 'Order is already ' . $order['status']], 400);
        }

        $db->table('orders')->where('id', $orderId)->update(['status' => 'confirmed', 'payment_status' => 'paid', 'updated_at' => date('Y-m-d H:i:s')]);
        $db->table('order_status_history')->insert([
            'order_id' => $orderId,
            'status' => 'confirmed',
            'updated_by' => $buyerId,
            'remarks' => 'Payment received - Order confirmed by buyer',
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        $db->table('notifications')->insert([
            'user_id' => $order['seller_id'],
            'title' => 'Order Confirmed',
            'message' => "Payment received for order #{$orderId}. You can now dispatch the item.",
            'type' => 'order_confirmed',
            'related_id' => $orderId,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Payment successful! Order confirmed.']);
    }

    /**
     * POST /api/v1/buyer/initiate-order-payment
     * Creates a PhonePe checkout session for an order payment
     * Body: { order_id, callback_url }
     */
    public function initiateOrderPayment()
    {
        $jwtUser = $this->request->jwt_user;
        $buyerId = (int) $jwtUser['user_id'];
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $orderId = (int) ($data['order_id'] ?? 0);
        $callbackUrl = trim($data['callback_url'] ?? '');

        $order = $db->table('orders')->where('id', $orderId)->where('buyer_id', $buyerId)->get()->getRowArray();
        if (!$order) {
            return $this->respond(['success' => false, 'message' => 'Order not found'], 404);
        }
        if ($order['payment_status'] === 'paid') {
            return $this->respond(['success' => false, 'message' => 'This order is already paid'], 400);
        }
        if ($order['status'] !== 'pending') {
            return $this->respond(['success' => false, 'message' => 'Order is not in a payable state'], 400);
        }

        $amount = (float) $order['final_price'];
        $amountInPaise = (int) ($amount * 100);
        $merchantOrderId = 'ORD-' . $buyerId . '-' . $orderId . '-' . time();

        $redirectUrl = $callbackUrl
            ? str_replace('{id}', $merchantOrderId, $callbackUrl)
            : base_url("buyer/order-payment-callback?id={$merchantOrderId}");

        $payload = [
            'merchantOrderId' => $merchantOrderId,
            'amount' => $amountInPaise,
            'paymentFlow' => [
                'type' => 'PG_CHECKOUT',
                'merchantUrls' => ['redirectUrl' => $redirectUrl],
            ],
        ];

        // Store the merchant transaction ID on the order so we can match it on callback
        $db->table('orders')->where('id', $orderId)->update([
            'merchant_transaction_id' => $merchantOrderId,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        $phonepe = new \App\Libraries\PhonePe();
        $response = $phonepe->createPayment($payload);

        if (isset($response['redirectUrl'])) {
            return $this->respond([
                'success' => true,
                'data' => [
                    'redirect_url' => $response['redirectUrl'],
                    'merchant_order_id' => $merchantOrderId,
                ],
            ]);
        }

        return $this->respond([
            'success' => false,
            'message' => 'Failed to initiate payment. Please try again.',
            'debug' => $response,
        ]);
    }

    /**
     * GET /api/v1/buyer/verify-order-payment?id={merchantOrderId}
     * Verifies PhonePe payment and confirms the order on success
     */
    public function verifyOrderPayment()
    {
        $merchantOrderId = $this->request->getGet('id');
        $db = \Config\Database::connect();

        if (!$merchantOrderId) {
            return $this->respond(['status' => 'error', 'message' => 'No transaction ID provided'], 400);
        }

        $order = $db->table('orders')
            ->where('merchant_transaction_id', $merchantOrderId)
            ->get()->getRowArray();

        if (!$order) {
            return $this->respond(['status' => 'error', 'message' => 'Order not found for this transaction'], 404);
        }

        // Already paid — return success immediately
        if ($order['payment_status'] === 'paid') {
            return $this->respond(['status' => 'success', 'message' => 'Order is already confirmed', 'order_id' => $order['id']]);
        }

        $phonepe = new \App\Libraries\PhonePe();
        $status = $phonepe->getOrderStatus($merchantOrderId);

        log_message('debug', 'PhonePe Order Payment Status for ' . $merchantOrderId . ': ' . json_encode($status));

        $state = $status['state'] ?? ($status['data']['state'] ?? 'PENDING');

        if ($state === 'COMPLETED') {
            $buyerId = $order['buyer_id'];
            $orderId = $order['id'];

            $db->table('orders')->where('id', $orderId)->update([
                'status' => 'confirmed',
                'payment_status' => 'paid',
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            $db->table('order_status_history')->insert([
                'order_id' => $orderId,
                'status' => 'confirmed',
                'updated_by' => $buyerId,
                'remarks' => 'PhonePe payment verified - Order confirmed',
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $db->table('transactions')->insert([
                'user_id' => $buyerId,
                'order_id' => $orderId,
                'type' => 'order_payment',
                'amount' => $order['final_price'],
                'description' => 'Order Payment: #' . ($order['order_number'] ?: $orderId),
                'payment_method' => 'phonepe',
                'payment_status' => 'completed',
                'transaction_id' => $status['data']['transactionId'] ?? ($status['paymentDetails'][0]['transactionId'] ?? 'PNP-' . time()),
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $db->table('notifications')->insert([
                'user_id' => $order['seller_id'],
                'title' => 'Order Confirmed',
                'message' => "Payment received for order #{$orderId}. You can now dispatch the item.",
                'type' => 'order_confirmed',
                'related_id' => $orderId,
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            return $this->respond([
                'status' => 'success',
                'message' => 'Payment successful! Your order has been confirmed.',
                'order_id' => $orderId,
            ]);
        }

        if ($state === 'FAILED') {
            return $this->respond(['status' => 'failed', 'message' => 'Payment failed. Please try again.']);
        }

        return $this->respond(['status' => 'pending', 'message' => 'Payment is being processed…']);
    }

    /**
     * POST /api/v1/buyer/confirm-date-change/{offerId}
     */
    public function confirmDateChange(int $offerId)
    {
        $jwtUser = $this->request->jwt_user;
        $userId = $jwtUser['user_id'];
        $db = \Config\Database::connect();

        $offer = $db->table('offers')->where('id', $offerId)->get()->getRowArray();
        if (!$offer || $offer['buyer_id'] != $userId) {
            return $this->respond(['success' => false, 'message' => 'Invalid offer'], 404);
        }

        if ($offer['status'] !== 'negotiating') {
            return $this->respond(['success' => false, 'message' => 'Only negotiating offers can be confirmed'], 400);
        }

        $product = $db->table('products')->where('id', $offer['product_id'])->get()->getRowArray();

        // Record history
        $db->table('offer_history')->insert([
            'offer_id'       => $offerId,
            'changed_by'     => $userId,
            'action'         => 'buyer_accept_negotiation',
            'new_start_date' => $offer['rental_start_date'],
            'new_end_date'   => $offer['rental_end_date'],
            'new_price'      => $offer['offer_price'],
            'created_at'     => date('Y-m-d H:i:s'),
        ]);

        // Accept the offer
        $db->table('offers')->where('id', $offerId)->update([
            'status'      => 'accepted',
            'accepted_at' => date('Y-m-d H:i:s'),
            'message'     => 'Buyer approved the suggested dates. Deal finalized.',
            'updated_at'  => date('Y-m-d H:i:s'),
        ]);

        // Create order from the now-finalised dates
        $orderId = $db->table('orders')->insert([
            'order_number'      => 'FLX' . strtoupper(uniqid()),
            'product_id'        => $offer['product_id'],
            'buyer_id'          => $offer['buyer_id'],
            'seller_id'         => $offer['seller_id'],
            'order_type'        => $offer['offer_type'] ?? 'rent',
            'final_price'       => $offer['offer_price'],
            'deposit_amount'    => $offer['deposit_amount'] ?? null,
            'rental_start_date' => $offer['rental_start_date'],
            'rental_end_date'   => $offer['rental_end_date'],
            'delivery_address'  => $offer['delivery_address']  ?? null,
            'delivery_pin_code' => $offer['delivery_pin_code'] ?? null,
            'payment_status'    => 'pending',
            'status'            => 'pending',
            'created_at'        => date('Y-m-d H:i:s'),
            'updated_at'        => date('Y-m-d H:i:s'),
        ], true);

        $db->table('order_status_history')->insert([
            'order_id'   => $orderId,
            'status'     => 'pending',
            'updated_by' => $userId,
            'remarks'    => 'Order created after buyer accepted seller-suggested dates',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Mark product as sold only for sell-type offers; rental products stay active/approved so they remain listed
        $finalOfferType = $offer['offer_type'] ?? $product['listing_type'];
        if ($finalOfferType !== 'rent') {
            $db->table('products')->where('id', $offer['product_id'])->update([
                'status'     => 'sold',
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }

        // Notify seller
        $db->table('notifications')->insert([
            'user_id'    => $offer['seller_id'],
            'title'      => 'Offer Finalized',
            'message'    => "The buyer has accepted your suggested dates for \"{$product['title']}\". An order has been created.",
            'type'       => 'offer_update',
            'is_read'    => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Auto-reject competing offers (pending + negotiating) for this product
        // For 'sell' products, reject ALL others. For 'rent' products, reject only those that overlap in dates.
        $otherOffersQuery = $db->table('offers')
            ->where('product_id', $offer['product_id'])
            ->where('id !=', $offerId)
            ->whereIn('status', ['pending', 'negotiating']);

        if ($finalOfferType === 'rent') {
            $otherOffersQuery->groupStart()
                ->where('rental_start_date <=', $offer['rental_end_date'])
                ->where('rental_end_date >=', $offer['rental_start_date'])
                ->groupEnd();
        }

        $otherOffers = $otherOffersQuery->get()->getResultArray();

        foreach ($otherOffers as $other) {
            $rejectMsg = ($finalOfferType === 'rent') 
                ? 'Another buyer\'s offer for these dates has been accepted.'
                : 'Another buyer\'s offer for this product has been accepted.';

            $db->table('offers')->where('id', $other['id'])->update([
                'status'         => 'rejected',
                'seller_remarks' => $rejectMsg,
                'updated_at'     => date('Y-m-d H:i:s'),
            ]);

            $notifMsg = ($finalOfferType === 'rent')
                ? 'Sorry, another buyer\'s offer on "' . ($product['title'] ?? '') . '" for overlapping dates was accepted. Your offer has been closed.'
                : 'Sorry, another buyer\'s offer on "' . ($product['title'] ?? '') . '" was accepted. Your offer has been closed.';

            $db->table('notifications')->insert([
                'user_id'    => $other['buyer_id'],
                'title'      => 'Offer Not Accepted',
                'message'    => $notifMsg,
                'type'       => 'offer',
                'is_read'    => 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }

        return $this->respond(['success' => true, 'message' => 'Dates accepted! The deal is now finalized and an order has been created.', 'data' => ['order_id' => $orderId]]);
    }

    /**
     * POST /api/v1/buyer/rate-seller
     */
    public function rateSeller()
    {
        $jwtUser = $this->request->jwt_user;
        $userId = $jwtUser['user_id'];
        $db = \Config\Database::connect();

        $data = $this->request->getPost() ?: $this->request->getJSON(true);
        $offerId = $data['offer_id'] ?? null;
        $rating = (float) ($data['rating'] ?? 5.0);

        $offer = $db->table('offers')->where('id', $offerId)->get()->getRowArray();
        if (!$offer || $offer['buyer_id'] != $userId) {
            return $this->respond(['success' => false, 'message' => 'Invalid offer'], 404);
        }
        if ($offer['status'] !== 'accepted') {
            return $this->respond(['success' => false, 'message' => 'Offer must be accepted before rating'], 400);
        }
        if ($offer['buyer_rated_seller']) {
            return $this->respond(['success' => false, 'message' => 'You have already rated this seller'], 400);
        }
        if ($rating < 1 || $rating > 5) {
            return $this->respond(['success' => false, 'message' => 'Rating must be between 1 and 5'], 400);
        }

        $limitSetting = $db->table('system_settings')->where('setting_key', 'buyer_rating_period_days')->get()->getRowArray();
        $ratingPeriod = $limitSetting ? (float) $limitSetting['setting_value'] : 7;
        if (!empty($offer['accepted_at']) && time() > strtotime($offer['accepted_at']) + ($ratingPeriod * 86400)) {
            return $this->respond(['success' => false, 'message' => 'Rating window has expired'], 400);
        }

        $sellerId = $offer['seller_id'];
        $seller = $db->table('users')->where('id', $sellerId)->get()->getRowArray();
        $oldCount = (int) ($seller['seller_rating_count'] ?? 0);
        $oldAvg = (float) ($seller['seller_rating_avg'] ?? 0);
        $newCount = $oldCount + 1;
        $newAvg = (($oldAvg * $oldCount) + $rating) / $newCount;

        $db->transStart();
        $db->table('offers')->where('id', $offerId)->update(['buyer_rated_seller' => 1]);
        $db->table('users')->where('id', $sellerId)->update([
            'seller_rating_avg' => round($newAvg, 2),
            'seller_rating_count' => $newCount,
        ]);
        $db->table('reviews')->insert([
            'reviewer_id' => $userId,
            'reviewed_id' => $sellerId,
            'product_id' => $offer['product_id'],
            'reviewer_type' => 'buyer',
            'rating' => (int) round($rating),
            'comment' => 'Buyer rated seller star: ' . $rating,
            'review_type' => 'seller_rating',
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->respond(['success' => false, 'message' => 'Failed to save rating'], 500);
        }

        return $this->respond(['success' => true, 'message' => 'Seller rated successfully!']);
    }

    /**
     * POST /api/v1/buyer/rate-self-delivery-seller
     */
    public function rateSelfDeliverySeller()
    {
        $jwtUser = $this->request->jwt_user;
        $buyerId = $jwtUser['user_id'];
        $db = \Config\Database::connect();

        $sellerId = $this->request->getPost('seller_id');
        $productId = $this->request->getPost('product_id');
        if (!$sellerId || !$productId) {
            return $this->respond(['success' => false, 'message' => 'seller_id and product_id are required'], 400);
        }

        $view = $db->table('contact_views')
            ->where('user_id', $buyerId)->where('seller_id', $sellerId)->where('product_id', $productId)
            ->get()->getRowArray();
        if (!$view) {
            return $this->respond(['success' => false, 'message' => 'Contact details not viewed.'], 400);
        }
        if (time() > strtotime($view['viewed_at']) + (20 * 24 * 60 * 60)) {
            return $this->respond(['success' => false, 'message' => '20-day rating window has expired.'], 400);
        }
        if (!$view['return_confirmed']) {
            return $this->respond(['success' => false, 'message' => 'You can only rate the seller after they confirm the safe return of the product.'], 400);
        }

        $existing = $db->table('reviews')
            ->where('reviewer_id', $buyerId)->where('reviewed_id', $sellerId)
            ->where('review_type', 'self_delivery')->where('product_id', $productId)
            ->get()->getRowArray();
        if ($existing) {
            return $this->respond(['success' => false, 'message' => 'You have already rated this seller for self-delivery.'], 400);
        }

        $totalContacts = $db->table('contact_views')->where('user_id', $buyerId)->countAllResults();
        $totalRatings = $db->table('reviews')->where('reviewer_id', $buyerId)->where('review_type', 'self_delivery')->countAllResults();
        if ($totalRatings >= floor($totalContacts / 3)) {
            return $this->respond(['success' => false, 'message' => 'Your rating limit has been reached. You get 1 rating opportunity for every 3 unique sellers you contact.'], 400);
        }

        $db->table('reviews')->insert([
            'reviewer_id' => $buyerId,
            'reviewed_id' => $sellerId,
            'product_id' => $productId,
            'reviewer_type' => 'buyer',
            'rating' => 1,
            'comment' => $this->request->getPost('comment') ?: 'Self-delivery completed successfully',
            'review_type' => 'self_delivery',
            'created_at' => date('Y-m-d H:i:s'),
        ]);
        $seller = $db->table('users')->where('id', $sellerId)->get()->getRowArray();
        $newScore = ($seller['seller_reliability_score'] ?? 0) + 1;
        $db->table('users')->where('id', $sellerId)->update(['seller_reliability_score' => $newScore]);
        $db->table('notifications')->insert([
            'user_id' => $sellerId,
            'title' => 'Self-Delivery Rating Received',
            'message' => 'You received a reliability point for safe self-delivery!',
            'type' => 'rating_received',
            'related_id' => $productId,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Reliability point awarded successfully!']);
    }

    /**
     * POST /api/v1/buyer/mark-notifications-read
     */
    public function markNotificationsRead()
    {
        $jwtUser = $this->request->jwt_user;
        $userId = $jwtUser['user_id'];
        $db = \Config\Database::connect();
        $db->table('notifications')->where('user_id', $userId)->update(['is_read' => 1]);
        return $this->respond(['success' => true, 'message' => 'All notifications marked as read']);
    }

    /**
     * GET /api/v1/buyer/offer-messages/{offerId}
     */
    public function getOfferMessages(int $offerId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $offer = $db->table('offers')->where('id', $offerId)->where('buyer_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$offer)
            return $this->respond(['success' => false, 'message' => 'Offer not found'], 404);

        $messages = $db->table('offer_messages om')
            ->select('om.*, u.name as sender_name')
            ->join('users u', 'u.id = om.sender_id', 'left')
            ->where('om.offer_id', $offerId)
            ->orderBy('om.created_at', 'ASC')
            ->get()->getResultArray();

        // Mark seller messages as read
        $db->table('offer_messages')->where('offer_id', $offerId)->where('sender_role', 'seller')->update(['is_read' => 1]);

        return $this->respond(['success' => true, 'data' => $messages]);
    }

    /**
     * POST /api/v1/buyer/offer-messages/{offerId}/upload
     */
    public function uploadOfferMedia(int $offerId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $offer = $db->table('offers')->where('id', $offerId)->where('buyer_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$offer)
            return $this->respond(['success' => false, 'message' => 'Offer not found'], 404);

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
        if (!is_dir($uploadPath))
            mkdir($uploadPath, 0755, true);

        $newName = uniqid('chat_') . '.' . $file->getClientExtension();
        $file->move($uploadPath, $newName);

        $mediaUrl = 'uploads/chat/' . $newName;
        $caption = trim($this->request->getPost('message') ?? '');

        $db->table('offer_messages')->insert([
            'offer_id' => $offerId,
            'sender_id' => $jwtUser['user_id'],
            'sender_role' => 'buyer',
            'message' => $caption ?: '',
            'media_url' => $mediaUrl,
            'is_read' => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        $product = $db->table('products')->where('id', $offer['product_id'])->get()->getRowArray();
        $db->table('notifications')->insert([
            'user_id' => $offer['seller_id'],
            'title' => 'Buyer sent a file',
            'message' => 'Buyer shared media on offer for "' . ($product['title'] ?? '') . '".',
            'type' => 'offer',
            'is_read' => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'media_url' => $mediaUrl]);
    }

    /**
     * POST /api/v1/buyer/offer-messages/{offerId}
     */
    public function sendOfferMessage(int $offerId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $body = $this->request->getJSON(true) ?? [];

        $offer = $db->table('offers')->where('id', $offerId)->where('buyer_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$offer)
            return $this->respond(['success' => false, 'message' => 'Offer not found'], 404);

        $message = trim($body['message'] ?? '');
        if ($message === '')
            return $this->respond(['success' => false, 'message' => 'Message cannot be empty'], 400);

        $db->table('offer_messages')->insert([
            'offer_id' => $offerId,
            'sender_id' => $jwtUser['user_id'],
            'sender_role' => 'buyer',
            'message' => $message,
            'is_read' => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        $product = $db->table('products')->where('id', $offer['product_id'])->get()->getRowArray();
        $db->table('notifications')->insert([
            'user_id' => $offer['seller_id'],
            'title' => 'New message from buyer',
            'message' => 'Buyer sent a message on offer for "' . ($product['title'] ?? '') . '".',
            'type' => 'offer',
            'is_read' => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Message sent']);
    }

    /**
     * GET /api/v1/buyer/order/{orderId}
     */
    public function orderDetail(int $orderId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $order = $db->table('orders o')
            ->select('o.*, p.title as product_title, p.listing_type as product_listing_type, p.description as product_description, u.name as seller_name, u.mobile as seller_mobile, (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.display_order ASC LIMIT 1) as primary_image, (SELECT COUNT(*) FROM offers WHERE product_id = o.product_id AND status = "accepted" AND listing_type = "rent" AND rental_start_date <= o.rental_end_date AND rental_end_date >= o.rental_start_date AND p.listing_type = "rent") as is_rental_blocked')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users u', 'u.id = o.seller_id', 'left')
            ->where('o.id', $orderId)
            ->where('o.buyer_id', $jwtUser['user_id'])
            ->get()->getRowArray();

        if (!$order)
            return $this->respond(['success' => false, 'message' => 'Order not found'], 404);

        $statusHistory = $db->table('order_status_history')->where('order_id', $orderId)->orderBy('created_at', 'ASC')->get()->getResultArray();
        $review = $db->table('reviews')->where('order_id', $orderId)->where('reviewer_id', $jwtUser['user_id'])->get()->getRowArray();

        return $this->respond(['success' => true, 'data' => ['order' => $order, 'status_history' => $statusHistory, 'review' => $review]]);
    }

    /**
     * POST /api/v1/buyer/report-user/:id
     * Buyer reports a seller. Auto-suspends after 3 reports in 7 days.
     */
    public function reportUser(int $reportedId)
    {
        $jwtUser = $this->request->jwt_user;
        $reporter = (int) $jwtUser['user_id'];
        $db = \Config\Database::connect();

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
            'reporter_id' => $reporter,
            'reported_id' => $reportedId,
            'reporter_role' => 'buyer',
            'reason' => $reason,
            'status' => 'pending',
            'assigned_admin_id' => $assignedAdminId,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        // Count reports against this user in the last 7 days
        $weeklyReports = $db->table('user_reports')
            ->where('reported_id', $reportedId)
            ->where('created_at >=', date('Y-m-d H:i:s', strtotime('-7 days')))
            ->countAllResults();

        if ($weeklyReports >= 3 && !$reported['is_suspended']) {
            $db->table('users')->where('id', $reportedId)->update([
                'is_suspended' => 1,
                'suspended_at' => date('Y-m-d H:i:s'),
                'suspension_reason' => 'Auto-suspended: received ' . $weeklyReports . ' reports within 7 days.',
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            // Notify all admins about the auto-suspension
            foreach ($admins as $admin) {
                $db->table('notifications')->insert([
                    'user_id' => $admin['id'],
                    'title' => 'User Auto-Suspended',
                    'message' => 'User "' . $reported['name'] . '" has been auto-suspended after receiving ' . $weeklyReports . ' reports in 7 days.',
                    'type' => 'user_suspended',
                    'is_read' => 0,
                    'created_at' => date('Y-m-d H:i:s'),
                ]);
            }
        } elseif ($assignedAdminId) {
            // Notify the assigned admin
            $db->table('notifications')->insert([
                'user_id' => $assignedAdminId,
                'title' => 'New User Report',
                'message' => 'A buyer reported user "' . $reported['name'] . '". Reason: ' . substr($reason, 0, 100),
                'type' => 'user_report',
                'is_read' => 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);
        }

        return $this->respond(['success' => true, 'message' => 'Report submitted successfully']);
    }

    /**
     * POST /api/v1/buyer/view-seller-contact/{productId}
     */
    public function viewSellerContact(int $productId)
    {
        $jwtUser = $this->request->jwt_user;
        $buyerId = (int) $jwtUser['user_id'];
        $db = \Config\Database::connect();

        $product = $db->table('products')->where('id', $productId)->get()->getRowArray();
        if (!$product) {
            return $this->respond(['success' => false, 'message' => 'Product not found'], 404);
        }

        $sellerId = (int) $product['seller_id'];

        if ($sellerId === $buyerId) {
            return $this->respond(['success' => false, 'message' => 'You cannot view your own contact'], 400);
        }

        // Check if this buyer has already viewed this specific product's seller contact
        $existingView = $db->table('contact_views')
            ->where('user_id', $buyerId)
            ->where('seller_id', $sellerId)
            ->where('product_id', $productId)
            ->get()->getRowArray();

        // Check if this buyer has previously made any offer to this seller
        // (if so, contact is revealed without consuming subscription quota)
        $previousOffer = $db->table('offers')
            ->where('buyer_id', $buyerId)
            ->where('seller_id', $sellerId)
            ->get()->getRowArray();

        $activeSub = null;

        if (!$existingView) {
            if (!$previousOffer) {
                // Check if any buyer subscription plans are enabled in the system
                $enabledBuyerPlans = $db->table('subscription_plans')
                    ->where('user_type', 'buyer')
                    ->where('is_active', 1)
                    ->countAllResults();

                if ($enabledBuyerPlans > 0) {
                    // Fetch all active, non-expired subscriptions for this user
                    $activeSubs = $db->table('user_subscriptions')
                        ->select('user_subscriptions.*, subscription_plans.plan_type, subscription_plans.limit_value')
                        ->join('subscription_plans', 'subscription_plans.id = user_subscriptions.plan_id')
                        ->where('user_subscriptions.user_id', $buyerId)
                        ->where('user_subscriptions.is_active', 1)
                        ->where('user_subscriptions.expires_at >=', date('Y-m-d H:i:s'))
                        ->orderBy('subscription_plans.plan_type', 'DESC')
                        ->get()->getResultArray();

                    if (empty($activeSubs)) {
                        $expiredSub = $db->table('user_subscriptions')
                            ->where('user_id', $buyerId)
                            ->where('is_active', 1)
                            ->where('expires_at <', date('Y-m-d H:i:s'))
                            ->orderBy('expires_at', 'DESC')
                            ->get()->getRowArray();

                        if ($expiredSub) {
                            return $this->respond([
                                'success' => false,
                                'message' => 'Your buyer subscription expired on ' . date('d M Y', strtotime($expiredSub['expires_at'])) . '. Please renew your plan to view contact details.'
                            ], 403);
                        }
                        return $this->respond(['success' => false, 'message' => 'No active subscription found. Please subscribe to view contact details.'], 403);
                    }

                    foreach ($activeSubs as $sub) {
                        if ($sub['plan_type'] === 'duration') {
                            $activeSub = $sub;
                            break;
                        } elseif ((int) $sub['usage_count'] < (int) $sub['limit_value']) {
                            $activeSub = $sub;
                            break;
                        }
                    }

                    if (!$activeSub) {
                        return $this->respond(['success' => false, 'message' => 'Your contact limit has been reached. Please upgrade or renew your plan.'], 403);
                    }
                }
            }

            // Check if already viewed to prevent duplicate entry error
            $existingView = $db->table('contact_views')
                ->where('user_id', $buyerId)
                ->where('seller_id', $sellerId)
                ->get()
                ->getRow();

            if (!$existingView) {
                // Record the contact view
                $db->table('contact_views')->insert([
                    'user_id' => $buyerId,
                    'seller_id' => $sellerId,
                    'product_id' => $productId,
                    'subscription_id' => $activeSub ? $activeSub['id'] : null,
                    'viewed_at' => date('Y-m-d H:i:s'),
                ]);

                // Deduct from quantity-based subscription
                if ($activeSub && $activeSub['plan_type'] === 'quantity') {
                    $newCount = (int) $activeSub['usage_count'] + 1;
                    $update = ['usage_count' => $newCount];
                    // Auto-deactivate when all contacts are exhausted
                    if ($newCount >= (int) $activeSub['limit_value']) {
                        $update['is_active'] = 0;
                    }
                    $db->table('user_subscriptions')
                        ->where('id', $activeSub['id'])
                        ->update($update);
                }
            }
        }

        $seller = $db->table('users u')
            ->select('u.name, u.email, u.mobile, u.pin_code, apc.city, apc.state')
            ->join('allowed_pin_codes apc', 'apc.pin_code = u.pin_code', 'left')
            ->where('u.id', $sellerId)
            ->get()->getRowArray();

        return $this->respond([
            'success' => true,
            'data' => [
                'seller_name'    => $seller ? ($seller['name'] ?? 'Unknown') : 'Unknown',
                'seller_email'   => $seller ? ($seller['email'] ?? 'N/A') : 'N/A',
                'seller_mobile'  => $seller ? ($seller['mobile'] ?? 'N/A') : 'N/A',
                'seller_city'    => $seller ? ($seller['city'] ?? '') : '',
                'seller_state'   => $seller ? ($seller['state'] ?? '') : '',
                'seller_pincode' => $seller ? ($seller['pin_code'] ?? '') : '',
                'product_id'     => (int) $productId,
                'already_viewed' => (bool) $existingView,
            ],
        ]);
    }

    /**
     * POST /api/v1/buyer/block-seller/{sellerId}
     * Block a seller from appearing in the buyer's browse view
     */
    public function blockSeller(int $sellerId)
    {
        $jwtUser = $this->request->jwt_user;
        $buyerId = (int) $jwtUser['user_id'];
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?? [];

        if ($buyerId === $sellerId) {
            return $this->respond(['success' => false, 'message' => 'You cannot block yourself'], 400);
        }

        $seller = $db->table('users')->where('id', $sellerId)->get()->getRowArray();
        if (!$seller) {
            return $this->respond(['success' => false, 'message' => 'Seller not found'], 404);
        }

        // Check if already blocked
        $alreadyBlocked = $db->table('buyer_blocked_sellers')
            ->where('buyer_id', $buyerId)
            ->where('blocked_seller_id', $sellerId)
            ->countAllResults();

        if ($alreadyBlocked > 0) {
            return $this->respond(['success' => false, 'message' => 'You have already blocked this seller'], 400);
        }

        $db->table('buyer_blocked_sellers')->insert([
            'buyer_id' => $buyerId,
            'blocked_seller_id' => $sellerId,
            'reason' => $data['reason'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Seller blocked successfully']);
    }

    /**
     * POST /api/v1/buyer/unblock-seller/{sellerId}
     * Unblock a previously blocked seller
     */
    public function unblockSeller(int $sellerId)
    {
        $jwtUser = $this->request->jwt_user;
        $buyerId = (int) $jwtUser['user_id'];
        $db = \Config\Database::connect();

        $blocked = $db->table('buyer_blocked_sellers')
            ->where('buyer_id', $buyerId)
            ->where('blocked_seller_id', $sellerId)
            ->delete();

        if (!$blocked) {
            return $this->respond(['success' => false, 'message' => 'This seller is not blocked'], 400);
        }

        return $this->respond(['success' => true, 'message' => 'Seller unblocked successfully']);
    }

    /**
     * GET /api/v1/buyer/blocked-sellers
     * Get list of all blocked sellers by current buyer
     */
    public function blockedSellers()
    {
        $jwtUser = $this->request->jwt_user;
        $buyerId = (int) $jwtUser['user_id'];
        $db = \Config\Database::connect();

        $blockedSellers = $db->table('buyer_blocked_sellers bbs')
            ->select('bbs.*, u.id as seller_id, u.name as seller_name, u.email as seller_email, u.mobile as seller_mobile, u.seller_rating_avg, u.seller_rating_count')
            ->join('users u', 'u.id = bbs.blocked_seller_id', 'left')
            ->where('bbs.buyer_id', $buyerId)
            ->orderBy('bbs.created_at', 'DESC')
            ->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $blockedSellers]);
    }

    /**
     * GET /api/v1/buyer/plan-checkout-details/{planId}
     * Returns plan info + platform charge breakdown + referral discount for checkout page
     */
    public function planCheckoutDetails($planId)
    {
        $jwtUser = $this->request->jwt_user;
        $userId = $jwtUser['user_id'];
        $db = \Config\Database::connect();

        $plan = $db->table('subscription_plans')
            ->where(['id' => $planId, 'is_active' => 1, 'user_type' => 'buyer'])
            ->get()->getRowArray();
        if (!$plan) {
            return $this->respond(['success' => false, 'message' => 'Plan not found or inactive'], 404);
        }

        $user = $db->table('users')->where('id', $userId)->get()->getRowArray();

        // Platform charges breakdown
        $chargeModel = new \App\Models\PlatformChargeModel();
        $activeCharges = $chargeModel->getActiveCharges();
        $chargeBreakdown = [];
        $totalCharges = 0;
        foreach ($activeCharges as $charge) {
            $amt = $charge['charge_type'] === 'percentage'
                ? ($plan['price'] * $charge['charge_value']) / 100
                : (float) $charge['charge_value'];
            $chargeBreakdown[] = [
                'name' => $charge['charge_name'],
                'type' => $charge['charge_type'],
                'value' => $charge['charge_value'],
                'amount' => $amt,
            ];
            $totalCharges += $amt;
        }

        // Referral discount
        $referralDiscount = 0;
        $referralBalance = (float) ($user['referral_balance'] ?? 0);
        $hasUsed = (int) ($user['has_used_referral'] ?? 0);
        $expiry = $user['referral_expires_at'] ?? null;
        if ($referralBalance > 0 && $hasUsed === 0) {
            if (!$expiry || $expiry === '' || $expiry === '0000-00-00 00:00:00' || strtotime($expiry) > time()) {
                $referralDiscount = $referralBalance;
            }
        }

        $total = max(0, (float) $plan['price'] + $totalCharges - $referralDiscount);

        return $this->respond([
            'success' => true,
            'data' => [
                'plan' => $plan,
                'user' => [
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'mobile' => $user['mobile'] ?? '',
                    'address' => $user['address'] ?? '',
                ],
                'charge_breakdown' => $chargeBreakdown,
                'total_charges' => $totalCharges,
                'referral_discount' => $referralDiscount,
                'total' => $total,
            ],
        ]);
    }

    /**
     * POST /api/v1/buyer/apply-coupon
     * Validates a coupon code against a plan and returns the discount amount
     */
    public function applyCoupon()
    {
        $jwtUser = $this->request->jwt_user;
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $code = strtoupper(trim($data['code'] ?? ''));
        $planId = (int) ($data['plan_id'] ?? 0);

        if (!$code)
            return $this->respond(['success' => false, 'message' => 'Coupon code is required'], 400);

        $plan = $db->table('subscription_plans')->where('id', $planId)->get()->getRowArray();
        if (!$plan)
            return $this->respond(['success' => false, 'message' => 'Plan not found'], 404);

        $coupon = $db->table('coupons')->where(['code' => $code, 'is_active' => 1])->get()->getRowArray();
        if (!$coupon)
            return $this->respond(['success' => false, 'message' => 'Invalid or expired coupon code.']);

        if ($coupon['valid_until'] && strtotime($coupon['valid_until']) < time()) {
            return $this->respond(['success' => false, 'message' => 'Coupon has expired.']);
        }

        if ($coupon['usage_limit'] !== null) {
            $usedCount = $db->table('coupon_usage')->where('coupon_id', $coupon['id'])->countAllResults();
            if ($usedCount >= $coupon['usage_limit']) {
                return $this->respond(['success' => false, 'message' => 'Coupon usage limit reached.']);
            }
        }

        if ((float) $plan['price'] < (float) $coupon['min_order_amount']) {
            return $this->respond(['success' => false, 'message' => 'Minimum purchase for this coupon is ₹' . $coupon['min_order_amount']]);
        }

        $discountValue = 0;
        if ($coupon['discount_type'] === 'percentage') {
            $discountValue = ($plan['price'] * $coupon['discount_value']) / 100;
            if ($coupon['max_discount'] && $discountValue > $coupon['max_discount']) {
                $discountValue = $coupon['max_discount'];
            }
        } else {
            $discountValue = (float) $coupon['discount_value'];
        }

        return $this->respond([
            'success' => true,
            'message' => 'Coupon applied successfully!',
            'data' => ['discount' => round($discountValue, 2)],
        ]);
    }

    /**
     * POST /api/v1/buyer/initiate-payment
     * Creates a pending subscription record and initiates PhonePe checkout
     * Body: { plan_id, coupon_code?, callback_url }
     */
    public function initiatePayment()
    {
        $jwtUser = $this->request->jwt_user;
        $userId = $jwtUser['user_id'];
        $data = $this->request->getJSON(true);
        $db = \Config\Database::connect();

        $planId = (int) ($data['plan_id'] ?? 0);
        $couponCode = strtoupper(trim($data['coupon_code'] ?? ''));
        $callbackUrl = trim($data['callback_url'] ?? '');
        $useReferral = isset($data['use_referral']) ? (bool) $data['use_referral'] : true;

        $plan = $db->table('subscription_plans')
            ->where(['id' => $planId, 'is_active' => 1, 'user_type' => 'buyer'])
            ->get()->getRowArray();
        if (!$plan)
            return $this->respond(['success' => false, 'message' => 'Invalid or inactive plan.'], 404);

        // Note: Allowing users to buy multiple subscriptions/stack them.
        // The reveal logic will automatically pick the first valid active subscription.

        $basePrice = (float) $plan['price'];
        $chargeModel = new \App\Models\PlatformChargeModel();
        $activeCharges = $chargeModel->getActiveCharges();
        $totalCharges = 0;
        foreach ($activeCharges as $charge) {
            $totalCharges += $charge['charge_type'] === 'percentage'
                ? ($basePrice * $charge['charge_value']) / 100
                : (float) $charge['charge_value'];
        }

        // Coupon discount
        $discount = 0;
        $couponId = null;
        if ($couponCode) {
            $coupon = $db->table('coupons')->where(['code' => $couponCode, 'is_active' => 1])->get()->getRowArray();
            if (
                $coupon && $basePrice >= (float) $coupon['min_order_amount']
                && (!$coupon['valid_until'] || strtotime($coupon['valid_until']) >= time())
            ) {
                if ($coupon['discount_type'] === 'percentage') {
                    $discount = ($basePrice * $coupon['discount_value']) / 100;
                    if ($coupon['max_discount'] && $discount > $coupon['max_discount'])
                        $discount = $coupon['max_discount'];
                } else {
                    $discount = (float) $coupon['discount_value'];
                }
                $couponId = $coupon['id'];
            }
        }

        $finalAmount = ($basePrice + $totalCharges) - $discount;

        // Referral discount (only if user chose to apply it)
        $user = $db->table('users')->where('id', $userId)->get()->getRowArray();
        $referralDiscountApplied = 0;
        if ($useReferral) {
            $referralBalance = (float) ($user['referral_balance'] ?? 0);
            $hasUsed = (int) ($user['has_used_referral'] ?? 0);
            $expiry = $user['referral_expires_at'] ?? null;
            if ($referralBalance > 0 && $hasUsed === 0) {
                if (!$expiry || $expiry === '' || $expiry === '0000-00-00 00:00:00' || strtotime($expiry) > time()) {
                    $referralDiscountApplied = $referralBalance;
                    $finalAmount -= $referralDiscountApplied;
                }
            }
        }

        $finalAmount = max(1, $finalAmount);
        $amountInPaise = (int) ($finalAmount * 100);
        $merchantOrderId = 'SUB-' . $userId . '-' . time();

        // Build redirect URL — Next.js passes its own callback URL with {id} placeholder
        $redirectUrl = $callbackUrl
            ? str_replace('{id}', $merchantOrderId, $callbackUrl)
            : base_url("buyer/subscriptionPaymentCallback?id={$merchantOrderId}");

        $payload = [
            'merchantOrderId' => $merchantOrderId,
            'amount' => $amountInPaise,
            'paymentFlow' => [
                'type' => 'PG_CHECKOUT',
                'merchantUrls' => ['redirectUrl' => $redirectUrl],
            ],
        ];

        // Persist pending subscription record
        $db->table('user_subscriptions')->insert([
            'user_id' => $userId,
            'plan_id' => $planId,
            'starts_at' => date('Y-m-d H:i:s'),
            'expires_at' => date('Y-m-d H:i:s'),
            'usage_count' => 0,
            'is_active' => 0,
            'payment_status' => 'pending',
            'amount_paid' => $finalAmount,
            'referral_discount_applied' => $referralDiscountApplied,
            'merchant_transaction_id' => $merchantOrderId,
        ]);

        $phonepe = new \App\Libraries\PhonePe();
        $response = $phonepe->createPayment($payload);

        if (isset($response['redirectUrl'])) {
            return $this->respond([
                'success' => true,
                'data' => [
                    'redirect_url' => $response['redirectUrl'],
                    'merchant_order_id' => $merchantOrderId,
                ],
            ]);
        }

        return $this->respond([
            'success' => false,
            'message' => 'Failed to initiate payment. Please try again.',
            'debug' => $response,
        ]);
    }

    /**
     * GET /api/v1/buyer/verify-payment?id={merchantOrderId}
     * Checks PhonePe payment status and activates subscription on success
     */
    public function verifyPayment()
    {
        log_message('error', 'DEBUG: verifyPayment CRITICAL hit');
        $merchantOrderId = $this->request->getGet('id');
        log_message('error', 'DEBUG: verifyPayment ID: ' . ($merchantOrderId ?? 'NULL'));
        $db = \Config\Database::connect();

        if (!$merchantOrderId) {
            return $this->respond(['status' => 'error', 'message' => 'No transaction ID provided'], 400);
        }

        $dbSub = $db->table('user_subscriptions')
            ->where('merchant_transaction_id', $merchantOrderId)
            ->get()->getRowArray();

        if (!$dbSub)
            return $this->respond(['status' => 'error', 'message' => 'Transaction not found'], 404);
        $userId = $dbSub['user_id'];
        if (false) { // Skip check for debug
            return $this->respond(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        // Already activated — return success immediately
        if ($dbSub['is_active'] == 1 && $dbSub['payment_status'] === 'paid') {
            return $this->respond(['status' => 'success', 'message' => 'Subscription is already active']);
        }

        $phonepe = new \App\Libraries\PhonePe();
        $status = $phonepe->getOrderStatus($merchantOrderId);

        // Log the response for debugging
        log_message('debug', 'PhonePe Status Response for ' . $merchantOrderId . ': ' . json_encode($status));

        $state = $status['state'] ?? ($status['data']['state'] ?? 'PENDING');

        if ($state === 'COMPLETED') {
            if ($dbSub['is_active'] == 0) {
                $plan = $db->table('subscription_plans')->where('id', $dbSub['plan_id'])->get()->getRowArray();
                $startsAt = date('Y-m-d H:i:s');
                $expiresAt = ((int) $plan['duration_hours'] > 0)
                    ? date('Y-m-d H:i:s', strtotime("+{$plan['duration_hours']} hours"))
                    : '2099-12-31 23:59:59';

                $db->table('user_subscriptions')->where('id', $dbSub['id'])->update([
                    'is_active' => 1,
                    'payment_status' => 'paid',
                    'starts_at' => $startsAt,
                    'expires_at' => $expiresAt,
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);

                // Update users table for redundancy/quick lookup
                $db->table('users')->where('id', $dbSub['user_id'])->update([
                    'subscription_tier' => $plan['name'],
                    'subscription_expires_at' => $expiresAt,
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);

                // Record transaction
                $db->table('transactions')->insert([
                    'user_id' => $dbSub['user_id'],
                    'type' => 'subscription',
                    'amount' => $dbSub['amount_paid'],
                    'description' => 'Subscription Purchase: ' . $plan['name'],
                    'payment_method' => 'online',
                    'payment_status' => 'completed',
                    'transaction_id' => $status['data']['transactionId'] ?? ($status['paymentDetails'][0]['transactionId'] ?? 'PNP-' . time()),
                    'created_at' => date('Y-m-d H:i:s'),
                ]);

                // Note: Not deactivating previous subscriptions to allow stacking/sequential usage.
                // The reveal logic handles picking the first valid one.

                // Mark referral discount as used if buyer used their own referral balance
                if ((float) $dbSub['referral_discount_applied'] > 0) {
                    $db->table('users')->where('id', $dbSub['user_id'])->update([
                        'has_used_referral' => 1,
                        'referral_balance'  => 0,
                        'updated_at'        => date('Y-m-d H:i:s'),
                    ]);
                }

                // Credit referrer if this buyer was referred and hasn't triggered the reward yet
                $buyer = $db->table('users')->select('referred_by, has_used_referral')->where('id', $dbSub['user_id'])->get()->getRowArray();
                if (!empty($buyer['referred_by']) && (int) $buyer['has_used_referral'] === 0) {
                    $referrer = $db->table('users')->where('referral_code', $buyer['referred_by'])->get()->getRowArray();
                    if ($referrer) {
                        $settings = $db->table('system_settings')
                            ->whereIn('setting_key', ['referral_reward_amount', 'referral_expiry_days', 'referral_enabled'])
                            ->get()->getResultArray();
                        $cfg = [];
                        foreach ($settings as $s) $cfg[$s['setting_key']] = $s['setting_value'];

                        if (($cfg['referral_enabled'] ?? '1') === '1') {
                            $rewardAmount = (float) ($cfg['referral_reward_amount'] ?? 40);
                            $expiryDays   = (int)   ($cfg['referral_expiry_days']   ?? 7);
                            $newBalance   = (float) ($referrer['referral_balance']   ?? 0) + $rewardAmount;
                            $expiresAt    = date('Y-m-d H:i:s', strtotime("+{$expiryDays} days"));

                            $db->table('users')->where('id', $referrer['id'])->update([
                                'referral_balance'    => $newBalance,
                                'referral_expires_at' => $expiresAt,
                                'updated_at'          => date('Y-m-d H:i:s'),
                            ]);
                            // Mark buyer's referral as processed so referrer isn't credited again
                            $db->table('users')->where('id', $dbSub['user_id'])->update([
                                'has_used_referral' => 1,
                                'updated_at'        => date('Y-m-d H:i:s'),
                            ]);
                        }
                    }
                }
            }
            return $this->respond(['status' => 'success', 'message' => 'Payment successful! Subscription activated.']);
        }

        if ($state === 'FAILED' || $state === 'CANCELLED') {
            $db->table('user_subscriptions')->where('id', $dbSub['id'])->update([
                'payment_status' => 'failed',
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
            $errorMsg = $status['errorContext']['description'] ?? ($status['message'] ?? 'Payment failed');
            return $this->respond(['status' => 'failed', 'message' => $errorMsg]);
        }

        return $this->respond([
            'status' => 'pending',
            'message' => 'Payment is still processing',
            'debug' => [
                'state' => $state,
                'phonepe_response' => $status
            ]
        ]);
    }
}
