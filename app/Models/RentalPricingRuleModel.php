<?php

namespace App\Models;

use CodeIgniter\Model;

class RentalPricingRuleModel extends Model
{
    protected $table = 'rental_pricing_rules';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'filter_type',
        'filter_value',
        'filter_label',
        'deposit_deduction_threshold',
        'depreciation_range_min',
        'depreciation_range_max',
        'depreciation_amount',
        'deposit_percentage',
        'max_cost_cap_per_day',
        'is_active',
        'created_at',
        'updated_at'
    ];
    protected $useTimestamps = true;
    protected $returnType = 'array';

    /**
     * Get all active rules matching given filter values
     */
    public function getMatchingRules($listingTypeId = null, $categoryId = null, $subCategoryId = null): array
    {
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
     * Calculate rental deduction based on matching rules
     * Returns: base_threshold, depreciation, total_deduction, deposit_percentage, max_cost_cap_per_day, matched_rules
     * Logic: Pick MAX values across matching rules (NOT sum)
     */
    public function calculateDeduction($listingTypeId, $categoryId, $subCategoryId, int $usedTimes): array
    {
        $rules = $this->getMatchingRules($listingTypeId, $categoryId, $subCategoryId);

        if (empty($rules)) {
            return [
                'base_threshold'       => 0,
                'depreciation'         => 0,
                'total_deduction'      => 0,
                'deposit_percentage'   => 0,
                'max_cost_cap_per_day' => 0,
                'matched_rules'        => 0,
            ];
        }

        // 1. Pick MAX deposit_deduction_threshold (base deduction always applies)
        $maxThreshold = 0;
        // 2. Pick MAX deposit_percentage
        $maxDepositPct = 0;
        // 3. Pick MAX max_cost_cap_per_day
        $maxCostCap = 0;

        foreach ($rules as $rule) {
            $maxThreshold  = max($maxThreshold, (float) $rule['deposit_deduction_threshold']);
            $maxDepositPct = max($maxDepositPct, (float) $rule['deposit_percentage']);
            $maxCostCap    = max($maxCostCap, (float) $rule['max_cost_cap_per_day']);
        }

        // 4. Among rules where usedTimes falls in depreciation range, pick MAX depreciation_amount
        $maxDepreciation = 0;
        foreach ($rules as $rule) {
            $rangeMin = (int) $rule['depreciation_range_min'];
            $rangeMax = (int) $rule['depreciation_range_max'];
            $depAmt   = (float) $rule['depreciation_amount'];

            // max=0 means no upper limit (>= min)
            if ($usedTimes >= $rangeMin && ($rangeMax <= 0 || $usedTimes <= $rangeMax)) {
                $maxDepreciation = max($maxDepreciation, $depAmt);
            }
        }

        return [
            'base_threshold'       => $maxThreshold,
            'depreciation'         => $maxDepreciation,
            'total_deduction'      => $maxThreshold + $maxDepreciation,
            'deposit_percentage'   => $maxDepositPct,
            'max_cost_cap_per_day' => $maxCostCap,
            'matched_rules'        => count($rules),
            'source'               => 'filter_rules',
        ];
    }

    /**
     * Calculate rental deduction with cascading fallback:
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

        $baseThreshold = (float) ($cfg['rental_base_deposit_deduction'] ?? 10);
        $depositPct = (float) ($cfg['rental_deposit_percentage'] ?? 40);
        $maxCostCap = (float) ($cfg['rental_max_cost_cap_per_day'] ?? 14);

        // Cascading tier lookup: sub_category → category → listing_type → global
        $tiers = null;
        $source = 'global';
        $tierKeys = [];
        if ($subCategoryId) $tierKeys[] = ['key' => "rental_pricing_tiers_sub_category_{$subCategoryId}", 'source' => 'sub_category'];
        if ($categoryId) $tierKeys[] = ['key' => "rental_pricing_tiers_category_{$categoryId}", 'source' => 'category'];
        if ($listingTypeId) $tierKeys[] = ['key' => "rental_pricing_tiers_listing_type_{$listingTypeId}", 'source' => 'listing_type'];
        $tierKeys[] = ['key' => 'rental_pricing_tiers', 'source' => 'global'];

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
            'base_threshold'       => $baseThreshold,
            'depreciation'         => $depreciation,
            'total_deduction'      => $baseThreshold + $depreciation,
            'deposit_percentage'   => $depositPct,
            'max_cost_cap_per_day' => $maxCostCap,
            'matched_rules'        => 0,
            'source'               => $source,
        ];
    }
}
