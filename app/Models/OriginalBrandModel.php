<?php

namespace App\Models;

use CodeIgniter\Model;

class OriginalBrandModel extends Model
{
    protected $table = 'orignal_brands';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = ['brand_name', 'brand_image', 'description', 'is_active', 'listing_type_id', 'listing_type_ids'];

    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function searchBrands($term, $listingTypeId = null)
    {
        $builder = $this->where('is_active', 1)->like('brand_name', $term);

        if ($listingTypeId) {
            $id = (int)$listingTypeId;
            $builder->groupStart()
                // listing_type_ids set and contains this id
                ->where("listing_type_ids IS NOT NULL AND JSON_CONTAINS(listing_type_ids, '$id')", null, false)
                // OR listing_type_ids not set, fall back to listing_type_id
                ->orGroupStart()
                    ->where('listing_type_ids IS NULL', null, false)
                    ->groupStart()
                        ->where('listing_type_id', $id)
                        ->orWhere('listing_type_id IS NULL', null, false)
                    ->groupEnd()
                ->groupEnd()
            ->groupEnd();
        }

        return $builder->findAll(10);
    }
}
