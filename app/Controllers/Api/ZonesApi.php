<?php

namespace App\Controllers\Api;

use App\Controllers\Api\BaseApiController;

class ZonesApi extends BaseApiController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        $zones = $db->table('allowed_zones')
            ->orderBy('created_at', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond([
            'success' => true,
            'data'    => $zones
        ]);
    }

    public function create()
    {
        // Require admin/superadmin roles
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'] ?? '', [ 'super_admin', 'superadmin'])) {
            return $this->respond(['success' => false, 'message' => getAppMessage('only_superadmin_can_access')], 403);
        }

        $db = \Config\Database::connect();
        $data = $this->request->getPost() ?: $this->request->getJSON(true) ?: [];

        if (empty($data['zone_name'])) {
            return $this->respond(['success' => false, 'message' => getAppMessage('zone_name_required')], 400);
        }

        $insertData = [
            'zone_name'    => $data['zone_name'],
            'zone_type'    => $data['zone_type'] ?? 'polygon',
            'state'        => $data['state'] ?? null,
            'city'         => $data['city'] ?? null,
            'zone_polygon' => $data['zone_polygon'] ?? null,
            'is_active'    => 1,
            'created_by'   => $jwtUser['id'] ?? null,
            'created_at'   => date('Y-m-d H:i:s'),
        ];

        $db->table('allowed_zones')->insert($insertData);

        return $this->respond([
            'success' => true,
            'message' => getAppMessage('zone_saved_successfully')
        ]);
    }

    public function update($id = null)
    {
        if ($id === null) {
            return $this->respond(['success' => false, 'message' => getAppMessage('zone_id_required')], 400);
        }

        // Require admin/superadmin roles
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'] ?? '', [ 'super_admin', 'superadmin'])) {
            return $this->respond(['success' => false, 'message' => getAppMessage('only_superadmin_can_access')], 403);
        }

        $db = \Config\Database::connect();
        $data = $this->request->getPost() ?: $this->request->getJSON(true) ?: [];

        $zone = $db->table('allowed_zones')->where('id', $id)->get()->getRowArray();
        if (!$zone) {
            return $this->respond(['success' => false, 'message' => getAppMessage('zone_not_found')], 404);
        }

        $updateData = [];
        if (isset($data['zone_name'])) {
            $updateData['zone_name'] = $data['zone_name'];
        }
        if (isset($data['zone_type'])) {
            $updateData['zone_type'] = $data['zone_type'];
        }
        if (isset($data['state'])) {
            $updateData['state'] = $data['state'];
        }
        if (isset($data['city'])) {
            $updateData['city'] = $data['city'];
        }
        if (isset($data['zone_polygon'])) {
            $updateData['zone_polygon'] = $data['zone_polygon'];
        }
        if (isset($data['is_active'])) {
            $updateData['is_active'] = $data['is_active'];
        }

        $updateData['updated_at'] = date('Y-m-d H:i:s');

        $db->table('allowed_zones')->where('id', $id)->update($updateData);

        $message = (isset($data['is_active']) && count($data) === 1) ? getAppMessage('zone_status_toggled') : getAppMessage('zone_saved_successfully');

        return $this->respond([
            'success' => true,
            'message' => $message
        ]);
    }

    public function delete($id = null)
    {
        if ($id === null) {
            return $this->respond(['success' => false, 'message' => getAppMessage('zone_id_required')], 400);
        }

        // Require admin/superadmin roles
        $jwtUser = $this->request->jwt_user;
        if (!in_array($jwtUser['role'] ?? '', ['admin', 'super_admin', 'superadmin'])) {
            return $this->respond(['success' => false, 'message' => getAppMessage('only_superadmin_can_access')], 403);
        }

        $db = \Config\Database::connect();
        $zone = $db->table('allowed_zones')->where('id', $id)->get()->getRowArray();
        if (!$zone) {
            return $this->respond(['success' => false, 'message' => getAppMessage('zone_not_found')], 404);
        }

        $db->table('allowed_zones')->where('id', $id)->delete();

        return $this->respond([
            'success' => true,
            'message' => getAppMessage('zone_deleted_successfully')
        ]);
    }
}
