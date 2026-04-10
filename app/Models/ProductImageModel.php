<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductImageModel extends Model
{
    protected $table = 'product_images';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = ['product_id', 'image_path', 'is_primary', 'display_order'];

    protected bool $allowEmptyInserts = false;
    protected bool $updateOnlyChanged = true;

    // product_images table in this project doesn't have timestamp columns
    // so disable automatic timestamps for this model to avoid SQL errors
    protected $useTimestamps = false;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    protected $validationRules = [
        'product_id' => 'required|integer',
        'image_path' => 'required',
    ];

    public function getProductImages($productId)
    {
        return $this->where('product_id', $productId)
                    ->orderBy('is_primary', 'DESC')
                    ->orderBy('display_order', 'ASC')
                    ->findAll();
    }

    public function setPrimaryImage($productId, $imageId)
    {
        // Remove primary from all images
        $this->where('product_id', $productId)->set(['is_primary' => 0])->update();
        
        // Set new primary
        return $this->update($imageId, ['is_primary' => 1]);
    }
}
