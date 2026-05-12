<?php

/**
 * Render an ad slot based on the key name
 * 
 * @param string $slot_key The key identifier for the ad slot (e.g. 'sidebar', 'header', 'footer')
 * @return string The ad script/html content
 */
if (!function_exists('render_ad')) {
    function render_ad($slot_key, $page = 'all')
    {
        // Helper specifically for ad rendering
        // Ad slots are stored in system_settings with ad_slot_ prefix
        $key = 'ad_slot_' . $slot_key;
        $pageKey = $key . '_page';

        $db = \Config\Database::connect();
        
        // Check page targeting
        if ($page !== 'all') {
            $targetPageRow = $db->table('system_settings')->where('setting_key', $pageKey)->get()->getRowArray();
            $targetPage = $targetPageRow ? $targetPageRow['setting_value'] : 'all';
            
            if ($targetPage !== 'all' && $targetPage !== $page) {
                return '';
            }
        }

        // Use existing getSystemSetting if available, otherwise manual fetch
        if (function_exists('getSystemSetting')) {
            return getSystemSetting($key, '');
        }

        $row = $db->table('system_settings')->where('setting_key', $key)->get()->getRowArray();
        return $row ? $row['setting_value'] : '';
    }
}

/**
 * Render a rich media advertisement (Image/Video) from the database
 * 
 * @param string $position The slot position (e.g. 'top_banner', 'sidebar', 'footer')
 * @return string The HTML for the ad or empty string
 */
if (!function_exists('render_media_ad')) {
    function render_media_ad($position, $page = 'all')
    {
        $db = \Config\Database::connect();
        $today = date('Y-m-d');

        $builder = $db->table('advertisements')
            ->where('position', $position)
            ->where('is_active', 1)
            ->groupStart()
                ->where('start_date <=', $today)
                ->orWhere('start_date', null)
            ->groupEnd()
            ->groupStart()
                ->where('end_date >=', $today)
                ->orWhere('end_date', null)
            ->groupEnd();

        if ($page !== 'all') {
            $builder->groupStart()
                ->where('display_page', $page)
                ->orWhere('display_page', 'all')
            ->groupEnd();
        }

        $ad = $builder->orderBy('id', 'RANDOM')
            ->get()
            ->getRowArray();

        if (!$ad)
            return '';

        $mediaUrl = base_url('uploads/advertisements/' . $ad['media_path']);

        if ($ad['ad_type'] === 'video') {
            return '<video src="' . $mediaUrl . '" class="img-fluid rounded shadow-sm w-100" autoplay muted loop playsinline></video>';
        } else {
            return '<img src="' . $mediaUrl . '" alt="' . esc($ad['title']) . '" class="img-fluid rounded shadow-sm w-100">';
        }
    }
}
