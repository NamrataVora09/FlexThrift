<?php

/**
 * Price Calculator Helper Functions
 * Handles pricing calculations and validations for the marketplace
 */

/**
 * Get internal system setting with fallback
 */
if (!function_exists('getSystemSetting')) {
    function getSystemSetting(string $key, $default = null)
    {
        try {
            $db = \Config\Database::connect();
            $row = $db->table('system_settings')
                ->where('setting_key', $key)
                ->get()
                ->getRowArray();
            return $row ? $row['setting_value'] : $default;
        } catch (\Exception $e) {
            return $default;
        }
    }
}

/**
 * Calculate depreciation percentage based on tiered usage
 * (Legacy fallback - used when no filter-based pricing rules match)
 */
if (!function_exists('calculateDepreciationPercent')) {
    function calculateDepreciationPercent(int $usedTimes, string $tierKey = 'pricing_tiers'): float
    {
        $noDepMax = (int) getSystemSetting('usage_no_dep_max', 2);
        if ($usedTimes <= $noDepMax)
            return 0;

        $tiersJson = getSystemSetting($tierKey);
        if (!$tiersJson)
            return 0;

        $tiers = json_decode($tiersJson, true);
        if (!is_array($tiers))
            return 0;

        // Sort tiers by 'min' uses descending
        usort($tiers, function ($a, $b) {
            return $b['min'] <=> $a['min'];
        });

        foreach ($tiers as $tier) {
            if ($usedTimes >= (int) $tier['min']) {
                return (float) $tier['dep'];
            }
        }

        return 0;
    }
}

/**
 * Get matched pricing rule deductions based on product's listing type, category, sub-category and usage
 * Returns ['base_threshold' => %, 'depreciation' => %, 'total_deduction' => %, 'matched_rules' => count]
 * Logic: Among all matching active rules, pick MAX deduction_threshold (base, always applies)
 * and MAX depreciation_amount (only among rules where usage falls in range). They are NOT summed across rules.
 */
if (!function_exists('getPricingRuleDeduction')) {
    function getPricingRuleDeduction($listingTypeId = null, $categoryId = null, $subCategoryId = null, int $usedTimes = 0): array
    {
        try {
            $pricingRuleModel = new \App\Models\PricingRuleModel();
            return $pricingRuleModel->calculateDeduction($listingTypeId, $categoryId, $subCategoryId, $usedTimes);
        } catch (\Exception $e) {
            return [
                'base_threshold' => 0,
                'depreciation' => 0,
                'total_deduction' => 0,
                'matched_rules' => 0,
            ];
        }
    }
}

/**
 * Get matched RENTAL pricing rule deductions based on product's listing type, category, sub-category and usage
 * Returns ['base_threshold' => %, 'depreciation' => %, 'total_deduction' => %, 'deposit_percentage' => %, 'max_cost_cap_per_day' => %, 'matched_rules' => count]
 * Logic: Among all matching active rental rules, pick MAX values (NOT sum).
 */
if (!function_exists('getRentalPricingRuleDeduction')) {
    function getRentalPricingRuleDeduction($listingTypeId = null, $categoryId = null, $subCategoryId = null, int $usedTimes = 0): array
    {
        try {
            $rentalPricingRuleModel = new \App\Models\RentalPricingRuleModel();
            return $rentalPricingRuleModel->calculateDeduction($listingTypeId, $categoryId, $subCategoryId, $usedTimes);
        } catch (\Exception $e) {
            return [
                'base_threshold' => 0,
                'depreciation' => 0,
                'total_deduction' => 0,
                'deposit_percentage' => 0,
                'max_cost_cap_per_day' => 0,
                'matched_rules' => 0,
            ];
        }
    }
}

/**
 * Calculate suggested sale price using filter-based pricing rules
 * Falls back to legacy tier-based calculation if no rules match
 */
if (!function_exists('calculateSalePriceWithRules')) {
    function calculateSalePriceWithRules(float $originalPrice, int $usedTimes, $listingTypeId = null, $categoryId = null, $subCategoryId = null): float
    {
        $ruleResult = getPricingRuleDeduction($listingTypeId, $categoryId, $subCategoryId, $usedTimes);

        if ($ruleResult['matched_rules'] > 0) {
            // Filter-based calculation
            $baseThreshold = $ruleResult['base_threshold'];
            $depreciation = $ruleResult['depreciation'];
            $totalDeduction = $baseThreshold + $depreciation;

            $suggestedPrice = $originalPrice - ($originalPrice * ($totalDeduction / 100));
            // Ensure at least base threshold deduction
            $maxPrice = $originalPrice * (1 - ($baseThreshold / 100));
            return round(min(max($suggestedPrice, 0), $maxPrice), 2);
        }

        // Fallback to legacy tier-based calculation
        return calculateSalePrice($originalPrice, $usedTimes);
    }
}

/**
 * Calculate suggested rental prices using filter-based RENTAL pricing rules
 * Falls back to legacy tier-based calculation if no rental rules match
 */
if (!function_exists('calculateRentalPricesWithRules')) {
    function calculateRentalPricesWithRules(float $originalPrice, int $usedTimes, $listingTypeId = null, $categoryId = null, $subCategoryId = null): array
    {
        $ruleResult = getRentalPricingRuleDeduction($listingTypeId, $categoryId, $subCategoryId, $usedTimes);

        if ($ruleResult['matched_rules'] > 0) {
            // Filter-based calculation using rental-specific rules
            $baseThreshold = $ruleResult['base_threshold'];
            $depreciation = $ruleResult['depreciation'];
            $totalDeduction = $baseThreshold + $depreciation;

            $depreciatedValue = $originalPrice - ($originalPrice * ($totalDeduction / 100));
            $maxDepreciatedValue = $originalPrice * (1 - ($baseThreshold / 100));
            $depreciatedValue = min(max($depreciatedValue, 0), $maxDepreciatedValue);

            // Use rule-specific deposit percentage and cost cap
            $depositPercent = $ruleResult['deposit_percentage'];
            $deposit = $depreciatedValue * ($depositPercent / 100);

            $maxRentalCapPerDay = $ruleResult['max_cost_cap_per_day'];
            $suggestedCostPercent = (float) getSystemSetting('rental_suggested_cost_percent', 10);

            $suggestedRentalCost = $deposit * ($suggestedCostPercent / 100);
            $maxRental = $deposit * ($maxRentalCapPerDay / 100);
            $rentalCost = min($suggestedRentalCost, $maxRental);

            return [
                'deposit' => round($deposit, 2),
                'rental_cost' => round($rentalCost, 2),
                'depreciated_value' => round($depreciatedValue, 2)
            ];
        }

        // Fallback to legacy tier-based calculation
        return calculateRentalPrices($originalPrice, $usedTimes);
    }
}

/**
 * Validate sale price using filter-based rules (with legacy fallback)
 */
if (!function_exists('validateSalePriceWithRules')) {
    function validateSalePriceWithRules(float $originalPrice, float $salePrice, int $usedTimes = 0, $listingTypeId = null, $categoryId = null, $subCategoryId = null): bool
    {
        $ruleResult = getPricingRuleDeduction($listingTypeId, $categoryId, $subCategoryId, $usedTimes);

        if ($ruleResult['matched_rules'] > 0) {
            $baseThreshold = $ruleResult['base_threshold'];
            $maxAllowed = $originalPrice * (1 - ($baseThreshold / 100));
            return $salePrice <= (round($maxAllowed) + 0.01);
        }

        // Fallback
        return validateSalePrice($originalPrice, $salePrice);
    }
}

/**
 * Validate deposit using filter-based RENTAL rules (with legacy fallback)
 */
if (!function_exists('validateDepositWithRules')) {
    function validateDepositWithRules(float $originalPrice, float $deposit, int $usedTimes = 0, $listingTypeId = null, $categoryId = null, $subCategoryId = null): bool
    {
        if ($originalPrice <= 0) return true;

        $ruleResult = getRentalPricingRuleDeduction($listingTypeId, $categoryId, $subCategoryId, $usedTimes);

        if ($ruleResult['matched_rules'] > 0) {
            $baseThreshold = $ruleResult['base_threshold'];
            $maxAllowed = $originalPrice * (1 - ($baseThreshold / 100));
            return $deposit <= (round($maxAllowed) + 0.01);
        }

        // Fallback
        return validateDeposit($originalPrice, $deposit);
    }
}

/**
 * Validate rental cost using filter-based RENTAL rules (with legacy fallback)
 * Uses rule-specific max_cost_cap_per_day if rental rules match
 */
if (!function_exists('validateRentalCostWithRules')) {
    function validateRentalCostWithRules(float $deposit, float $rentalCost, int $usedTimes = 0, $listingTypeId = null, $categoryId = null, $subCategoryId = null): bool
    {
        $ruleResult = getRentalPricingRuleDeduction($listingTypeId, $categoryId, $subCategoryId, $usedTimes);

        if ($ruleResult['matched_rules'] > 0) {
            $maxCap = $ruleResult['max_cost_cap_per_day'];
            $maxAllowed = $deposit * ($maxCap / 100);
            return $rentalCost <= (round($maxAllowed) + 0.01);
        }

        // Fallback
        return validateRentalCost($deposit, $rentalCost);
    }
}

/**
 * Calculate suggested sale price based on original price and usage
 * (Legacy - used as fallback)
 */
if (!function_exists('calculateSalePrice')) {
    function calculateSalePrice(float $originalPrice, int $usedTimes): float
    {
        // Sale Base Deduction Threshold (default: 0%)
        $baseDiscountPercent = (float) getSystemSetting('sale_base_discount', 0);

        // Tiered Depreciation
        $usageDepPercent = calculateDepreciationPercent($usedTimes);

        // Formula: Original - (Original * Base%) - (Original * Usage%)
        $suggestedPrice = $originalPrice - ($originalPrice * ($baseDiscountPercent / 100)) - ($originalPrice * ($usageDepPercent / 100));

        // Ensure it's at least the base discount percent less than original
        $maxPrice = $originalPrice * (1 - ($baseDiscountPercent / 100));

        return round(min($suggestedPrice, $maxPrice), 2);
    }
}

/**
 * Calculate suggested rental prices (deposit and rental cost)
 */
if (!function_exists('calculateRentalPrices')) {
    function calculateRentalPrices(float $originalPrice, int $usedTimes): array
    {
        // 1. Calculate Depreciated Value (similar to Sale logic)
        // Rent Base Deduction Threshold (default: 10%)
        $baseDiscountPercent = (float) getSystemSetting('rental_base_deposit_deduction', 10);

        // Tiered Depreciation for Rental
        $usageDepPercent = calculateDepreciationPercent($usedTimes, 'rental_pricing_tiers');

        // Formula for Depreciated Value: Original - (Original * Base%) - (Original * Usage%)
        $depreciatedValue = $originalPrice - ($originalPrice * ($baseDiscountPercent / 100)) - ($originalPrice * ($usageDepPercent / 100));

        // Ensure depreciated value doesn't exceed original minus base discount
        $maxDepreciatedValue = $originalPrice * (1 - ($baseDiscountPercent / 100));
        $depreciatedValue = min($depreciatedValue, $maxDepreciatedValue);

        // 2. Deposit = Depreciated Value * (Deposit Percentage)
        $depositPercent = (float) getSystemSetting('rental_deposit_percentage', 40);
        $deposit = $depreciatedValue * ($depositPercent / 100);

        // 3. Rental cost calculation
        $fallbackPct = (float) getSystemSetting('fallback_rental_cost_per_day', 0);
        
        if ($fallbackPct > 0) {
            // New logic: Rental Cost is a percentage of deposit (which defaults to original price in fallback mode)
            $deposit = $originalPrice;
            $rentalCost = $deposit * ($fallbackPct / 100);
            $depreciatedValue = $originalPrice;
        } else {
            $maxRentalCapPerDay = (float) getSystemSetting('rental_max_cost_cap_per_day', 14);
            $suggestedCostPercent = (float) getSystemSetting('rental_suggested_cost_percent', 10);

            // Suggested rental cost
            $suggestedRentalCost = $deposit * ($suggestedCostPercent / 100);
            $maxRental = $deposit * ($maxRentalCapPerDay / 100);
            $rentalCost = min($suggestedRentalCost, $maxRental);
        }

        return [
            'deposit' => round($deposit, 2),
            'rental_cost' => round($rentalCost, 2),
            'depreciated_value' => round($depreciatedValue, 2)
        ];
    }
}

/**
 * Validate that sale price is at least X% less than original
 */
if (!function_exists('validateSalePrice')) {
    function validateSalePrice(float $originalPrice, float $salePrice): bool
    {
        $baseDiscountPercent = (float) getSystemSetting('sale_base_discount', 0);
        $maxAllowed = $originalPrice * (1 - ($baseDiscountPercent / 100));
        return $salePrice <= (round($maxAllowed) + 0.01);
    }
}

/**
 * Validate that deposit is at least X% less than original price
 */
if (!function_exists('validateDeposit')) {
    function validateDeposit(float $originalPrice, float $deposit): bool
    {
        if ($originalPrice <= 0) return true;

        $baseDeductionPercent = (float) getSystemSetting('rental_base_deposit_deduction', 10);
        $maxAllowed = $originalPrice * (1 - ($baseDeductionPercent / 100));
        return $deposit <= (round($maxAllowed) + 0.01);
    }
}

/**
 * Validate that rental cost doesn't exceed X% of deposit (per day)
 */
if (!function_exists('validateRentalCost')) {
    function validateRentalCost(float $deposit, float $rentalCost): bool
    {
        $maxRentalCapPerDay = (float) getSystemSetting('rental_max_cost_cap_per_day', 14);
        $maxAllowed = $deposit * ($maxRentalCapPerDay / 100);
        return $rentalCost <= (round($maxAllowed) + 0.01);
    }
}

/**
 * Get subscription tier limits
 */
if (!function_exists('getSubscriptionLimits')) {
    function getSubscriptionLimits(string $tier): array
    {
        // Default static limits (fallback)
        $defaults = [
            'free' => [
                'max_products' => 3,
                'monthly_price' => 0,
                'yearly_price' => 0,
                'features' => ['3 Product uploads', 'Basic support']
            ],
            'basic' => [
                'max_products' => 10,
                'monthly_price' => 99,
                'yearly_price' => 999,
                'features' => ['10 Product uploads', 'Priority support', 'Analytics']
            ],
            'pro' => [
                'max_products' => 50,
                'monthly_price' => 299,
                'yearly_price' => 2999,
                'features' => ['50 Product uploads', '24/7 Support', 'Advanced analytics', 'Featured listings']
            ],
            'enterprise' => [
                'max_products' => 999,
                'monthly_price' => 999,
                'yearly_price' => 9999,
                'features' => ['Unlimited uploads', 'Dedicated manager', 'API access', 'Custom branding']
            ]
        ];

        // Try to read from DB table `subscription_tier_settings` when available
        try {
            $db = \Config\Database::connect();
            if ($db->tableExists('subscription_tier_settings')) {
                $row = $db->table('subscription_tier_settings')
                    ->where('tier', $tier)
                    ->get()
                    ->getRowArray();

                if ($row) {
                    $features = [];
                    if (!empty($row['features'])) {
                        // Features may be stored as comma-separated string
                        if (is_string($row['features'])) {
                            $parts = array_map('trim', explode(',', $row['features']));
                            $features = array_filter($parts, function ($v) {
                                return $v !== '';
                            });
                        }
                    }

                    return [
                        'max_products' => (int) ($row['max_products'] ?? ($defaults[$tier]['max_products'] ?? 0)),
                        'monthly_price' => (float) ($row['monthly_price'] ?? ($defaults[$tier]['monthly_price'] ?? 0)),
                        'yearly_price' => (float) ($row['yearly_price'] ?? ($defaults[$tier]['yearly_price'] ?? 0)),
                        'features' => $features ?: ($defaults[$tier]['features'] ?? []),
                    ];
                }
            }
        } catch (\Exception $e) {
            // If DB is not available or table missing, fall back to defaults
            log_message('error', 'getSubscriptionLimits: failed to read DB - ' . $e->getMessage());
        }

        return $defaults[$tier] ?? $defaults['free'];
    }
}

/**
 * Get dynamic application message from SuperAdmin settings
 */
if (!function_exists('getAppMessage')) {
    function getAppMessage(string $key, $default = '', array $params = [])
    {
        try {
            $db = \Config\Database::connect();
            if (!$db->tableExists('app_messages')) {
                return $default;
            }

            $row = $db->table('app_messages')
                ->where('message_key', $key)
                ->get()
                ->getRowArray();

            if (!$row) {
                // Auto-create missing key if in development for easy discovery
                if (ENVIRONMENT === 'development') {
                    $db->table('app_messages')->insert([
                        'message_key' => $key,
                        'message_value' => $default,
                        'category' => 'general'
                    ]);
                }
                return $default;
            }

            $message = $row['message_value'];

            // Replace parameters like {min}, {days}, etc.
            if (!empty($params)) {
                foreach ($params as $k => $v) {
                    $message = str_replace('{' . $k . '}', $v, $message);
                }
            }

            return $message;
        } catch (\Exception $e) {
            return $default;
        }
    }
}
