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
        // Skip for localhost/private IPs, fallback to a public test IP (Delhi, India) during local development
        if ($ip === '127.0.0.1' || $ip === '::1' || filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            $ip = '103.48.198.141';
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
                        'country' => $data['country'] ?? null,
                        'state' => $data['regionName'] ?? ($data['region'] ?? null),
                        'city' => $data['city'] ?? null,
                        'latitude' => $data['lat'] ?? null,
                        'longitude' => $data['lon'] ?? null,
                        'ip' => $ip
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
                        'country' => $data['country_name'] ?? null,
                        'state' => $data['region'] ?? null,
                        'city' => $data['city'] ?? null,
                        'latitude' => $data['latitude'] ?? null,
                        'longitude' => $data['longitude'] ?? null,
                        'ip' => $ip
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
                $city = $address['city'] ?? $address['town'] ?? $address['village'] ?? $address['county'] ?? null;
                $country = $address['country'] ?? null;

                if ($state) {
                    return [
                        'state' => $state,
                        'city' => $city,
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

if (!function_exists('getLocationFromIPFindIP')) {
    /**
     * Get latitude and longitude from IP address using findip.net
     *
     * @param string $ip
     * @return array|null ['latitude' => float, 'longitude' => float, 'ip' => string] or null on failure
     */
    function getLocationFromIPFindIP($ip)
    {
        $token = '42c71af76cefdc0e709a25f272cff674';

        // Skip for localhost/private IPs, fallback to a public test IP (Delhi, India) during local development
        if ($ip === '127.0.0.1' || $ip === '::1' || filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            $ip = '103.241.12.115';
        }

        try {
            $url = "https://api.findip.net/{$ip}/?token={$token}";
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_USERAGENT, 'FlexMarket/1.0');

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $response) {
                $data = json_decode($response, true);
                if (isset($data['location']['latitude']) && isset($data['location']['longitude'])) {
                    return [
                        'latitude' => (float) $data['location']['latitude'],
                        'longitude' => (float) $data['location']['longitude'],
                        'city' => $data['city']['names']['en'] ?? null,
                        'state' => $data['subdivisions'][0]['names']['en'] ?? null,
                        'country' => $data['country']['names']['en'] ?? null,
                        'ip' => $ip
                    ];
                }
            }
        } catch (\Exception $e) {
            log_message('error', 'findip.net API Error: ' . $e->getMessage());
        }

        return null;
    }
}

if (!function_exists('isPointInPolygon')) {
    /**
     * Check if coordinates (lat/lng) are inside a GeoJSON polygon JSON string
     *
     * @param float|string $latitude
     * @param float|string $longitude
     * @param string $polygonJson
     * @return bool
     */
    function isPointInPolygon($latitude, $longitude, $polygonJson)
    {
        if (empty($polygonJson)) {
            return false;
        }

        $geo = json_decode($polygonJson, true);
        if (!$geo) {
            return false;
        }

        $coordinates = null;
        if (isset($geo['geometry']['coordinates'])) {
            $coordinates = $geo['geometry']['coordinates'];
        } elseif (isset($geo['coordinates'])) {
            $coordinates = $geo['coordinates'];
        }

        if (!$coordinates || !is_array($coordinates)) {
            return false;
        }

        // Polygon outer ring
        $polygon = $coordinates[0];
        if (!is_array($polygon)) {
            return false;
        }

        $inside = false;
        $numVertices = count($polygon);

        // Ray-casting algorithm
        for ($i = 0, $j = $numVertices - 1; $i < $numVertices; $j = $i++) {
            $xi = $polygon[$i][0]; // longitude
            $yi = $polygon[$i][1]; // latitude
            $xj = $polygon[$j][0]; // longitude
            $yj = $polygon[$j][1]; // latitude

            $intersect = (($yi > $latitude) != ($yj > $latitude))
                && ($longitude < ($xj - $xi) * ($latitude - $yi) / ($yj - $yi + 0.0000000001) + $xi);
            if ($intersect) {
                $inside = !$inside;
            }
        }

        return $inside;
    }
}
