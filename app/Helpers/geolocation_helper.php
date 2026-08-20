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
        // Skip for localhost/private IPs
        if ($ip === '127.0.0.1' || $ip === '::1' || filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            log_message('info', 'Local/Private IP detected, skipping geolocation: ' . $ip);
            return null;
        }

        // Priority 1: Try ip-api.com
        try {
            $url = "http://ip-api.com/json/{$ip}";
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
                if (isset($data['status']) && $data['status'] === 'success') {
                    return [
                        'country'   => $data['country'] ?? null,
                        'state'     => $data['regionName'] ?? ($data['region'] ?? null),
                        'city'      => $data['city'] ?? null,
                        'latitude'  => $data['lat'] ?? null,
                        'longitude' => $data['lon'] ?? null,
                        'ip'        => $ip
                    ];
                }
            }
        } catch (\Exception $e) {
            log_message('error', 'ip-api.com Error: ' . $e->getMessage());
        }

        // Priority 2: Fallback to ipapi.co
        try {
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
                if (!isset($data['error']) || !$data['error']) {
                    return [
                        'country'   => $data['country_name'] ?? null,
                        'state'     => $data['region'] ?? null,
                        'city'      => $data['city'] ?? null,
                        'latitude'  => $data['latitude'] ?? null,
                        'longitude' => $data['longitude'] ?? null,
                        'ip'        => $ip
                    ];
                }
            }
        } catch (\Exception $e) {
            log_message('error', 'ipapi.co Error: ' . $e->getMessage());
        }

        return null;
    }
}

if (!function_exists('getStateFromCoordinates')) {
    /**
     * Reverse geocode latitude and longitude to extract State and City
     * 
     * @param float|string $lat Latitude
     * @param float|string $lng Longitude
     * @return array|null ['state' => string, 'city' => string, 'country' => string] or null
     */
    function getStateFromCoordinates($lat, $lng)
    {
        if (empty($lat) || empty($lng)) {
            return null;
        }

        try {
            // Use OpenStreetMap Nominatim reverse geocoding
            $url = "https://nominatim.openstreetmap.org/reverse?lat={$lat}&lon={$lng}&format=json";

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_setopt($ch, CURLOPT_USERAGENT, 'FlexMarket/1.0 (contact@flexmarket.com)');

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $response) {
                $data = json_decode($response, true);
                $address = $data['address'] ?? [];

                $state = $address['state'] ?? $address['region'] ?? $address['state_district'] ?? null;
                $city  = $address['city'] ?? $address['town'] ?? $address['village'] ?? $address['county'] ?? null;
                $country = $address['country'] ?? null;

                if ($state) {
                    return [
                        'state'   => $state,
                        'city'    => $city,
                        'country' => $country,
                    ];
                }
            }
        } catch (\Exception $e) {
            log_message('error', 'Reverse geocode error: ' . $e->getMessage());
        }

        return null;
    }
}

if (!function_exists('isStateAllowed')) {
    /**
     * Check if a state name is present in any active allowed zone.
     * Used during registration to gate users by state.
     *
     * @param string $state State name (e.g. "Maharashtra")
     * @return array|false Zone data if state is allowed, false otherwise
     */
    function isStateAllowed($state)
    {
        if (empty($state)) {
            return false;
        }

        $db = \Config\Database::connect();

        $zones = $db->table('allowed_zones')
            ->where('is_active', 1)
            ->get()
            ->getResultArray();

        $stateNorm = strtolower(trim($state));

        foreach ($zones as $zone) {
            $zoneState = strtolower(trim($zone['state'] ?? $zone['zone_name'] ?? ''));
            if ($zoneState && (
                $zoneState === $stateNorm ||
                str_contains($stateNorm, $zoneState) ||
                str_contains($zoneState, $stateNorm)
            )) {
                return $zone;
            }
        }

        return false;
    }
}

if (!function_exists('getStateFromPinCode')) {
    /**
     * Get Indian state name from PIN code prefix
     * 
     * @param string $pinCode 6-digit PIN code
     * @return string|null State name or null
     */
    function getStateFromPinCode($pinCode)
    {
        $pin = substr(trim($pinCode), 0, 2);
        $map = [
            '11' => 'Delhi',
            '12' => 'Haryana', '13' => 'Haryana',
            '14' => 'Punjab', '15' => 'Punjab',
            '16' => 'Chandigarh',
            '17' => 'Himachal Pradesh',
            '18' => 'Jammu and Kashmir', '19' => 'Jammu and Kashmir',
            '20' => 'Uttar Pradesh', '21' => 'Uttar Pradesh', '22' => 'Uttar Pradesh', '23' => 'Uttar Pradesh', '24' => 'Uttar Pradesh', '25' => 'Uttar Pradesh', '26' => 'Uttar Pradesh', '27' => 'Uttar Pradesh', '28' => 'Uttar Pradesh',
            '30' => 'Rajasthan', '31' => 'Rajasthan', '32' => 'Rajasthan', '33' => 'Rajasthan', '34' => 'Rajasthan',
            '36' => 'Gujarat', '37' => 'Gujarat', '38' => 'Gujarat', '39' => 'Gujarat',
            '40' => 'Maharashtra', '41' => 'Maharashtra', '42' => 'Maharashtra', '43' => 'Maharashtra', '44' => 'Maharashtra',
            '45' => 'Madhya Pradesh', '46' => 'Madhya Pradesh', '47' => 'Madhya Pradesh', '48' => 'Madhya Pradesh',
            '49' => 'Chhattisgarh',
            '50' => 'Telangana', '51' => 'Andhra Pradesh', '52' => 'Andhra Pradesh', '53' => 'Andhra Pradesh',
            '56' => 'Karnataka', '57' => 'Karnataka', '58' => 'Karnataka', '59' => 'Karnataka',
            '60' => 'Tamil Nadu', '61' => 'Tamil Nadu', '62' => 'Tamil Nadu', '63' => 'Tamil Nadu', '64' => 'Tamil Nadu',
            '67' => 'Kerala', '68' => 'Kerala', '69' => 'Kerala',
            '70' => 'West Bengal', '71' => 'West Bengal', '72' => 'West Bengal', '73' => 'West Bengal', '74' => 'West Bengal',
            '75' => 'Odisha', '76' => 'Odisha', '77' => 'Odisha',
            '78' => 'Assam',
            '79' => 'Arunachal Pradesh', 
            '80' => 'Bihar', '81' => 'Bihar', '82' => 'Bihar', '83' => 'Jharkhand', '84' => 'Bihar', '85' => 'Bihar',
        ];
        return $map[$pin] ?? null;
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
