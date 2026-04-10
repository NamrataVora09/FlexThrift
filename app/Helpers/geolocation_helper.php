<?php

/**
 * Geolocation Helper (Updated for Polygon Zones)
 * Provides IP-based location detection and polygon zone validation
 */

if (!function_exists('getLocationFromIP')) {
    /**
     * Get location data from IP address using ipapi.co
     * 
     * @param string $ip IP address to lookup
     * @return array|null Location data or null on failure
     */
    function getLocationFromIP($ip)
    {
        // Skip for localhost/private IPs - return default Mumbai location
        if ($ip === '127.0.0.1' || $ip === '::1' || filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return [
                'country' => 'India',
                'state' => 'Maharashtra',
                'city' => 'Mumbai',
                'latitude' => 19.0760,
                'longitude' => 72.8777,
                'ip' => $ip
            ];
        }

        try {
            // Use ipapi.co free API (1000 requests/day)
            $url = "https://ipapi.co/{$ip}/json/";

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_USERAGENT, 'FlexMarket/1.0');

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $response) {
                $data = json_decode($response, true);

                if (isset($data['error']) && $data['error']) {
                    log_message('error', 'IP Geolocation API Error: ' . ($data['reason'] ?? 'Unknown'));
                    return null;
                }

                return [
                    'country' => $data['country_name'] ?? null,
                    'state' => $data['region'] ?? null,
                    'city' => $data['city'] ?? null,
                    'latitude' => $data['latitude'] ?? null,
                    'longitude' => $data['longitude'] ?? null,
                    'ip' => $ip
                ];
            }

            log_message('error', 'IP Geolocation API returned HTTP ' . $httpCode);
            return null;

        } catch (\Exception $e) {
            log_message('error', 'IP Geolocation Error: ' . $e->getMessage());
            return null;
        }
    }
}

if (!function_exists('isPointInPolygon')) {
    /**
     * Check if a point (lat/lng) is inside a polygon using ray-casting algorithm
     * 
     * @param float $lat Latitude of the point
     * @param float $lng Longitude of the point
     * @param array $polygon Array of [lat, lng] coordinates
     * @return bool True if point is inside polygon
     */
    function isPointInPolygon($lat, $lng, $polygon)
    {
        $vertices = count($polygon);
        $inside = false;

        for ($i = 0, $j = $vertices - 1; $i < $vertices; $j = $i++) {
            $xi = $polygon[$i][0];
            $yi = $polygon[$i][1];
            $xj = $polygon[$j][0];
            $yj = $polygon[$j][1];

            $intersect = (($yi > $lng) != ($yj > $lng))
                && ($lat < ($xj - $xi) * ($lng - $yi) / ($yj - $yi) + $xi);

            if ($intersect) {
                $inside = !$inside;
            }
        }

        return $inside;
    }
}

if (!function_exists('isLocationAllowed')) {
    /**
     * Check if a location (lat/lng) is in any allowed zone polygon
     * 
     * @param float $latitude Latitude
     * @param float $longitude Longitude
     * @return array|false Zone data if allowed, false otherwise
     */
    function isLocationAllowed($latitude, $longitude)
    {
        if (empty($latitude) || empty($longitude)) {
            return false;
        }

        $db = \Config\Database::connect();

        // Get all active zones
        $zones = $db->table('allowed_zones')
            ->where('is_active', 1)
            ->get()
            ->getResultArray();

        foreach ($zones as $zone) {
            $polygon = json_decode($zone['zone_polygon'], true);

            if (is_array($polygon) && isPointInPolygon($latitude, $longitude, $polygon)) {
                return $zone;
            }
        }

        return false;
    }
}

if (!function_exists('logRegistrationAttempt')) {
    /**
     * Log a registration attempt to the database
     * 
     * @param array $data Registration attempt data
     * @return int|bool Insert ID or false on failure
     */
    function logRegistrationAttempt($data)
    {
        $db = \Config\Database::connect();

        $insertData = [
            'mobile' => $data['mobile'] ?? null,
            'name' => $data['name'] ?? null,
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
            'pin_code' => $data['pin_code'] ?? null,
            'user_type' => $data['user_type'] ?? null,
            'ip_address' => $data['ip'] ?? null,
            'country' => $data['country'] ?? null,
            'state' => $data['state'] ?? null,
            'city' => $data['city'] ?? null,
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'is_allowed' => $data['is_allowed'] ?? 0,
            'zone_id' => $data['zone_id'] ?? null,
            'user_id' => $data['user_id'] ?? null,
            'created_at' => date('Y-m-d H:i:s')
        ];

        if ($db->table('registration_attempts')->insert($insertData)) {
            return $db->insertID();
        }

        return false;
    }
}

if (!function_exists('getUserIP')) {
    /**
     * Get the real IP address of the user
     * 
     * @return string IP address
     */
    function getUserIP()
    {
        $ipKeys = [
            'HTTP_CF_CONNECTING_IP', // Cloudflare
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'REMOTE_ADDR'
        ];

        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];

                // Handle comma-separated IPs (proxy chain)
                if (strpos($ip, ',') !== false) {
                    $ips = explode(',', $ip);
                    $ip = trim($ips[0]);
                }

                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }
}
