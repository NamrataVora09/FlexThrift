<?php

namespace App\Models;

use CodeIgniter\Model;

class BrandModel extends Model
{
    protected $table = 'brands';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = ['seller_id', 'brand_name', 'logo', 'description', 'is_blocked', 'created_by_admin'];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'seller_id' => 'required|integer',
        'brand_name' => 'required|min_length[2]|max_length[100]',
    ];

    protected $validationMessages = [];
    protected $skipValidation = false;

    public function getSellerBrands($sellerId)
    {
        return $this->where('seller_id', $sellerId)->findAll();
    }

    public function canCreateBrand($sellerId)
    {
        $userModel = new \App\Models\UserModel();
        $user = $userModel->find($sellerId);
        return $user && $user['reliability_score'] >= 25;
    }
}
