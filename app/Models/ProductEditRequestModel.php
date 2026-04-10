<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductEditRequestModel extends Model
{
    protected $table = 'product_edit_requests';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'product_id',
        'updated_data',
        'temp_images',
        'deleted_images_ids',
        'status',
        'admin_remarks'
    ];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getPendingRequests($excludeAdmin = false)
    {
        $builder = $this->select('product_edit_requests.*, products.title as original_title, users.name as seller_name, users.reliability_score, pi.image_path as original_image')
            ->join('products', 'products.id = product_edit_requests.product_id')
            ->join('users', 'users.id = products.seller_id')
            ->join('product_images pi', 'pi.product_id = products.id AND pi.is_primary = 1', 'left')
            ->where('product_edit_requests.status', 'pending');

        if ($excludeAdmin) {
            $builder->where('users.role !=', 'admin');
        }

        return $builder->findAll();
    }
}
