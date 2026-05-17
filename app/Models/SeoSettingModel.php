<?php

namespace App\Models;

use CodeIgniter\Model;

class SeoSettingModel extends Model
{
    protected $table = 'seo_settings';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $protectFields = true;
    protected $allowedFields = [
        'page_key',
        'page_name',
        'route',
        'title',
        'meta_description',
        'meta_keywords',
        'og_title',
        'og_description',
        'updated_at'
    ];

    // Dates
    protected $useTimestamps = true;
    protected $dateFormat = 'datetime';
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    /**
     * Get SEO settings by page key
     * 
     * @param string $pageKey
     * @return array|null
     */
    public function getByPageKey($pageKey)
    {
        return $this->where('page_key', $pageKey)->first();
    }
}
