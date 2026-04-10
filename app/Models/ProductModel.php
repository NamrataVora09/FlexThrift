<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductModel extends Model
{
    protected $table = 'products';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'product_number',
        'seller_id',
        'subscription_id',
        'brand_id',
        'orignal_brand_id',
        'listing_type',
        'listing_type_category',
        'gender',
        'gender_ids',
        'product_type',
        'title',
        'description',
        'category',
        'category_ids',
        'sub_category',
        'sub_category_ids',
        'size',
        'color',
        'specifications',
        'used_times',
        'original_price',
        'suggested_sale_price',
        'suggested_rent_price',
        'suggested_deposit',
        'suggested_rental_cost',
        'price',
        'rental_cost',
        'rental_deposit',
        'fitting_charge',
        'allow_alter_fitting',
        'has_bill',
        'bill_image',
        'original_purchase_price',
        'dispatch_address',
        'dispatch_pin_code',
        'dispatch_state',
        'dispatch_city',
        'rental_start_date',
        'rental_end_date',
        'status',
        'admin_remarks',
        'views_count',
        'is_featured',
        'price_category',
        'required_badges'
    ];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    protected array $casts = [];
    protected array $castHandlers = [];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';
    protected $deletedField = 'deleted_at';

    protected $validationRules = [];

    // Removed strict validation - controller handles it

    protected $validationMessages = [];
    protected $skipValidation = false;
    protected $cleanValidationRules = true;

    protected $allowCallbacks = true;
    protected $beforeInsert = [];
    protected $afterInsert = [];
    protected $beforeUpdate = [];
    protected $afterUpdate = [];
    protected $beforeFind = [];
    protected $afterFind = [];
    protected $beforeDelete = [];
    protected $afterDelete = [];

    public function getProductWithImages($productId)
    {
        return $this->db->table('products p')
            ->select('p.*, u.name as seller_name, u.email as seller_email, u.reliability_score')
            ->select('GROUP_CONCAT(pi.image_path) as images')
            ->join('users u', 'u.id = p.seller_id')
            ->join('product_images pi', 'pi.product_id = p.id', 'left')
            ->where('p.id', $productId)
            ->groupBy('p.id')
            ->get()
            ->getRowArray();
    }

    public function getSellerProducts($sellerId, $status = null)
    {
        $builder = $this->db->table('products p')
            ->select('p.*, COUNT(DISTINCT o.id) as offer_count, COUNT(DISTINCT pi.id) as image_count')
            ->join('offers o', 'o.product_id = p.id AND o.status = "pending"', 'left')
            ->join('product_images pi', 'pi.product_id = p.id', 'left')
            ->where('p.seller_id', $sellerId)
            ->groupBy('p.id')
            ->orderBy('p.created_at', 'DESC');

        if ($status) {
            $builder->where('p.status', $status);
        }

        return $builder->get()->getResultArray();
    }

    public function getPendingApprovals($excludeAdmin = false)
    {
        $builder = $this->db->table('products p')
            ->select('p.*, u.name as seller_name, u.email as seller_email, u.mobile, u.seller_rating_avg, u.seller_rating_count, COUNT(pi.id) as image_count')
            ->join('users u', 'u.id = p.seller_id')
            ->join('product_images pi', 'pi.product_id = p.id', 'left')
            ->where('p.status', 'pending');

        if ($excludeAdmin) {
            $builder->where('u.role !=', 'admin');
        }

        return $builder->groupBy('p.id')
            ->orderBy('p.created_at', 'ASC')
            ->get()
            ->getResultArray();
    }

    public function approveProduct($productId, $remarks = null)
    {
        return $this->update($productId, [
            'status' => 'approved',
            'admin_remarks' => $remarks
        ]);
    }

    public function countPendingApprovals($excludeAdmin = false)
    {
        $builder = $this->db->table('products p')
            ->join('users u', 'u.id = p.seller_id')
            ->where('p.status', 'pending');

        if ($excludeAdmin) {
            $builder->where('u.role !=', 'admin');
        }

        return $builder->countAllResults();
    }

    public function getTotalModerationCount($excludeAdmin = false)
    {
        $pendingProducts = $this->countPendingApprovals($excludeAdmin);

        $editBuilder = $this->db->table('product_edit_requests per')
            ->join('products p', 'p.id = per.product_id')
            ->join('users u', 'u.id = p.seller_id')
            ->where('per.status', 'pending');

        if ($excludeAdmin) {
            $editBuilder->where('u.role !=', 'admin');
        }

        $pendingEdits = $editBuilder->countAllResults();

        return $pendingProducts + $pendingEdits;
    }

    public function rejectProduct($productId, $remarks)
    {
        return $this->update($productId, [
            'status' => 'rejected',
            'admin_remarks' => $remarks
        ]);
    }

    public function incrementViews($productId)
    {
        $this->db->query("UPDATE products SET views_count = views_count + 1 WHERE id = ?", [$productId]);
    }
}
