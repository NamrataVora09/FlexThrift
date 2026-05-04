<?php

namespace App\Models;

use CodeIgniter\Model;

class PricingRuleModel extends Model
{
    protected $table = 'pricing_rules';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'filter_type',
        'filter_value',
        'filter_label',
        'deduction_threshold',
        'depreciation_range_min',
        'depreciation_range_max',
        'depreciation_amount',
        'is_active',
        'created_at',
        'updated_at'
    ];
    protected $useTimestamps = true;
    protected $returnType = 'array';

    /**
     * Get all active rules for a given set of filter values
     * @param int|null $listingTypeId
     * @param int|null $categoryId
     * @param int|null $subCategoryId
     * @return array
     */
    public function getMatchingRules($listingTypeId = null, $categoryId = null, $subCategoryId = null): array
    {
        $builder = $this->where('is_active', 1);

        $conditions = [];
        if ($listingTypeId) {
            $conditions[] = "(filter_type = 'listing_type' AND filter_value = " . (int)$listingTypeId . ")";
        }
        if ($categoryId) {
            $conditions[] = "(filter_type = 'category' AND filter_value = " . (int)$categoryId . ")";
        }
        if ($subCategoryId) {
            $conditions[] = "(filter_type = 'sub_category' AND filter_value = " . (int)$subCategoryId . ")";
        }

        if (empty($conditions)) {
            return [];
        }

        return $this->where('is_active', 1)
            ->where('(' . implode(' OR ', $conditions) . ')')
            ->findAll();
    }

    /**
     * Calculate deduction based on matching pricing rules
     * Returns [base_threshold%, depreciation%, total_deduction%]
     */
    public function calculateDeduction($listingTypeId, $categoryId, $subCategoryId, int $usedTimes): array
    {
        $rules = $this->getMatchingRules($listingTypeId, $categoryId, $subCategoryId);

        if (empty($rules)) {
            return [
                'base_threshold' => 0,
                'depreciation' => 0,
                'total_deduction' => 0,
                'matched_rules' => 0,
            ];
        }

        $maxThreshold = 0;
        $maxDepreciation = 0;
        $matchedCount = 0;

        foreach ($rules as $rule) {
            $rangeMin = (int) $rule['depreciation_range_min'];
            $rangeMax = (int) $rule['depreciation_range_max'];

            // max=0 means no upper limit (>= min)
            if ($usedTimes >= $rangeMin && ($rangeMax <= 0 || $usedTimes <= $rangeMax)) {
                $maxThreshold = max($maxThreshold, (float) $rule['deduction_threshold']);
                $maxDepreciation = max($maxDepreciation, (float) $rule['depreciation_amount']);
                $matchedCount++;
            }
        }

        return [
            'base_threshold' => $maxThreshold,
            'depreciation' => $maxDepreciation,
            'total_deduction' => $maxThreshold + $maxDepreciation,
            'matched_rules' => $matchedCount,
            'source' => 'filter_rules',
        ];
    }

    /**
     * Calculate deduction with cascading fallback:
     * filter-based rules → sub_category tiers → category tiers → listing_type tiers → global tiers
     */
    public function calculateDeductionCascading($listingTypeId, $categoryId, $subCategoryId, int $usedTimes): array
    {
        // 1. Try filter-based rules first
        $result = $this->calculateDeduction($listingTypeId, $categoryId, $subCategoryId, $usedTimes);
        if ($result['matched_rules'] > 0) return $result;

        // 2. Fallback to system_settings tiers with cascading
        $db = \Config\Database::connect();
        $settings = $db->table('system_settings')->get()->getResultArray();
        $cfg = [];
        foreach ($settings as $s) $cfg[$s['setting_key']] = $s['setting_value'];

        $baseThreshold = (float) ($cfg['sale_base_discount'] ?? 5);
        $noDepMax = (int) ($cfg['usage_no_dep_max'] ?? 2);

        if ($usedTimes <= $noDepMax) {
            return ['base_threshold' => $baseThreshold, 'depreciation' => 0, 'total_deduction' => $baseThreshold, 'matched_rules' => 0, 'source' => 'global'];
        }

        // Cascading tier lookup: sub_category → category → listing_type → global
        $tiers = null;
        $source = 'global';
        $tierKeys = [];
        if ($subCategoryId) $tierKeys[] = ['key' => "pricing_tiers_sub_category_{$subCategoryId}", 'source' => 'sub_category'];
        if ($categoryId) $tierKeys[] = ['key' => "pricing_tiers_category_{$categoryId}", 'source' => 'category'];
        if ($listingTypeId) $tierKeys[] = ['key' => "pricing_tiers_listing_type_{$listingTypeId}", 'source' => 'listing_type'];
        $tierKeys[] = ['key' => 'pricing_tiers', 'source' => 'global'];

        foreach ($tierKeys as $tk) {
            if (!empty($cfg[$tk['key']])) {
                $parsed = json_decode($cfg[$tk['key']], true);
                if (is_array($parsed) && count($parsed) > 0) {
                    $tiers = $parsed;
                    $source = $tk['source'];
                    break;
                }
            }
        }

        $depreciation = 0;
        if ($tiers) {
            foreach ($tiers as $tier) {
                $min = (int) ($tier['min'] ?? 0);
                $max = (int) ($tier['max'] ?? 0);
                if ($usedTimes >= $min && ($max <= 0 || $usedTimes <= $max)) {
                    $depreciation = max($depreciation, (float) ($tier['dep'] ?? 0));
                }
            }
        }

        return [
            'base_threshold' => $baseThreshold,
            'depreciation' => $depreciation,
            'total_deduction' => $baseThreshold + $depreciation,
            'matched_rules' => 0,
            'source' => $source,
        ];
    }
}
