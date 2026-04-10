<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class DeliveryApi extends ResourceController
{
    protected $format = 'json';

    public function dashboard()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $user = $db->table('users')->where('id', $jwtUser['user_id'])->get()->getRowArray();
        $deliveryPerson = $db->table('delivery_persons')->where('user_id', $jwtUser['user_id'])->get()->getRowArray();

        $stats = [
            'total_deliveries' => $db->table('orders')->where('delivery_person_id', $jwtUser['user_id'])->countAllResults(),
            'completed' => $db->table('orders')->where('delivery_person_id', $jwtUser['user_id'])->where('status', 'delivered')->countAllResults(),
            'pending' => $db->table('orders')->where('delivery_person_id', $jwtUser['user_id'])->whereIn('status', ['assigned', 'picked_up', 'in_transit'])->countAllResults(),
        ];

        return $this->respond([
            'success' => true,
            'data' => [
                'user' => ['id' => (int) $user['id'], 'name' => $user['name'], 'role' => 'delivery'],
                'delivery_profile' => $deliveryPerson,
                'stats' => $stats,
            ],
        ]);
    }

    public function history()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $orders = $db->table('orders o')
            ->select('o.*, p.title as product_title, u.name as buyer_name')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users u', 'u.id = o.buyer_id', 'left')
            ->where('o.delivery_person_id', $jwtUser['user_id'])
            ->orderBy('o.created_at', 'DESC')
            ->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $orders]);
    }

    public function earnings()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $total = $db->table('transactions')
            ->where('user_id', $jwtUser['user_id'])
            ->where('type', 'delivery_earning')
            ->selectSum('amount')
            ->get()->getRowArray()['amount'] ?? 0;

        $recent = $db->table('transactions')
            ->where('user_id', $jwtUser['user_id'])
            ->where('type', 'delivery_earning')
            ->orderBy('created_at', 'DESC')
            ->limit(20)
            ->get()->getResultArray();

        return $this->respond([
            'success' => true,
            'data' => ['total_earnings' => (float) $total, 'recent' => $recent],
        ]);
    }

    /**
     * GET /api/v1/delivery/pending-deliveries
     */
    public function pendingDeliveries()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $orders = $db->table('orders o')
            ->select('o.*, p.title as product_title, p.listing_type, ub.name as buyer_name, ub.mobile as buyer_mobile, us.name as seller_name, us.mobile as seller_mobile')
            ->join('products p', 'p.id = o.product_id', 'left')
            ->join('users ub', 'ub.id = o.buyer_id', 'left')
            ->join('users us', 'us.id = o.seller_id', 'left')
            ->where('o.delivery_person_id', $jwtUser['user_id'])
            ->whereIn('o.status', ['assigned', 'dispatched', 'picked_up', 'in_transit'])
            ->orderBy('o.created_at', 'DESC')
            ->get()->getResultArray();

        return $this->respond(['success' => true, 'data' => $orders]);
    }

    /**
     * POST /api/v1/delivery/accept-delivery/{orderId}
     */
    public function acceptDelivery(int $orderId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $order = $db->table('orders')->where('id', $orderId)->where('delivery_person_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$order) return $this->respond(['success' => false, 'message' => 'Order not found'], 404);
        if ($order['status'] !== 'assigned') return $this->respond(['success' => false, 'message' => 'Can only accept assigned deliveries'], 400);

        $db->table('orders')->where('id', $orderId)->update(['status' => 'accepted_by_delivery', 'updated_at' => date('Y-m-d H:i:s')]);

        $db->table('order_status_history')->insert([
            'order_id' => $orderId, 'status' => 'accepted_by_delivery', 'updated_by' => $jwtUser['user_id'],
            'remarks' => 'Delivery accepted', 'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Delivery accepted']);
    }

    /**
     * POST /api/v1/delivery/picked-up/{orderId}
     */
    public function pickedUp(int $orderId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();

        $order = $db->table('orders')->where('id', $orderId)->where('delivery_person_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$order) return $this->respond(['success' => false, 'message' => 'Order not found'], 404);

        $db->table('orders')->where('id', $orderId)->update(['status' => 'picked_up', 'updated_at' => date('Y-m-d H:i:s')]);

        $db->table('order_status_history')->insert([
            'order_id' => $orderId, 'status' => 'picked_up', 'updated_by' => $jwtUser['user_id'],
            'remarks' => 'Item picked up from seller', 'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Marked as picked up']);
    }

    /**
     * POST /api/v1/delivery/mark-delivered/{orderId}
     */
    public function markDelivered(int $orderId)
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true) ?? [];

        $order = $db->table('orders')->where('id', $orderId)->where('delivery_person_id', $jwtUser['user_id'])->get()->getRowArray();
        if (!$order) return $this->respond(['success' => false, 'message' => 'Order not found'], 404);

        $status = !empty($data['has_defects']) ? 'delivered_with_defects' : 'delivered';
        $remarks = $data['remarks'] ?? 'Delivered to buyer';

        $db->table('orders')->where('id', $orderId)->update(['status' => $status, 'delivered_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')]);

        $db->table('order_status_history')->insert([
            'order_id' => $orderId, 'status' => $status, 'updated_by' => $jwtUser['user_id'],
            'remarks' => $remarks, 'created_at' => date('Y-m-d H:i:s'),
        ]);

        // Record delivery earning
        $db->table('transactions')->insert([
            'user_id' => $jwtUser['user_id'],
            'type' => 'delivery_earning',
            'amount' => 50, // base delivery fee
            'description' => 'Delivery earning for order #' . $orderId,
            'payment_status' => 'completed',
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        $db->table('notifications')->insert([
            'user_id' => $order['buyer_id'],
            'title' => 'Order Delivered',
            'message' => 'Your order #' . $orderId . ' has been delivered!',
            'type' => 'order',
            'is_read' => 0,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return $this->respond(['success' => true, 'message' => 'Marked as delivered']);
    }

    /**
     * POST /api/v1/delivery/update-profile
     */
    public function updateProfile()
    {
        $jwtUser = $this->request->jwt_user;
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);

        $deliveryPerson = $db->table('delivery_persons')->where('user_id', $jwtUser['user_id'])->get()->getRowArray();

        $dpData = [
            'vehicle_type' => $data['vehicle_type'] ?? $deliveryPerson['vehicle_type'] ?? null,
            'vehicle_number' => $data['vehicle_number'] ?? $deliveryPerson['vehicle_number'] ?? null,
            'license_number' => $data['license_number'] ?? $deliveryPerson['license_number'] ?? null,
            'is_available' => $data['is_available'] ?? 1,
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        if ($deliveryPerson) {
            $db->table('delivery_persons')->where('user_id', $jwtUser['user_id'])->update($dpData);
        } else {
            $dpData['user_id'] = $jwtUser['user_id'];
            $dpData['created_at'] = date('Y-m-d H:i:s');
            $db->table('delivery_persons')->insert($dpData);
        }

        return $this->respond(['success' => true, 'message' => 'Delivery profile updated']);
    }
}
