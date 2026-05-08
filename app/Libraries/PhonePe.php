<?php

namespace App\Libraries;

/**
 * PhonePe Payment Gateway Library
 * 
 * This library handles API interactions with PhonePe PG.
 * Documentation: https://developer.phonepe.com/payment-gateway/website-integration/standard-checkout/api-integration
 */
class PhonePe
{
    private $clientId;
    private $clientSecret;
    private $clientVersion;
    private $merchantId;
    private $env;
    private $baseUrl;

    public function __construct()
    {
        $db = \Config\Database::connect();
        $settings = $db->table('system_settings')->get()->getResultArray();

        $config = [];
        foreach ($settings as $s) {
            $config[$s['setting_key']] = $s['setting_value'];
        }

        $this->env = $config['phonepe_env'] ?? 'sandbox';
        $this->clientId = $config['phonepe_client_id'] ?? '';
        $this->clientSecret = $config['phonepe_client_secret'] ?? '';
        $this->clientVersion = $config['phonepe_client_version'] ?? 1;
        $this->merchantId = $config['phonepe_merchant_id'] ?? '';

        if ($this->env === 'production') {
            $this->baseUrl = 'https://api.phonepe.com/apis/pg';
        } else {
            $this->baseUrl = 'https://api-preprod.phonepe.com/apis/pg-sandbox';
        }
    }

    /**
     * Generate Authorization Token
     */
    public function getAuthToken()
    {
        $url = ($this->env === 'production')
            ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
            : "{$this->baseUrl}/v1/oauth/token";

        $headers = [
            "Content-Type: application/x-www-form-urlencoded"
        ];

        $data = [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'client_version' => $this->clientVersion,
            'grant_type' => 'client_credentials'
        ];

        $response = $this->callApi('POST', $url, $headers, http_build_query($data));
        return json_decode($response, true);
    }

    /**
     * Create Payment Request
     * 
     * @param array $payload Payment payload as per documentation
     */
    public function createPayment($payload)
    {
        $tokenData = $this->getAuthToken();
        if (!isset($tokenData['access_token'])) {
            return ['error' => 'Failed to obtain auth token', 'debug' => $tokenData];
        }

        $token = $tokenData['access_token'];
        $url = "{$this->baseUrl}/checkout/v2/pay";

        $headers = [
            "Content-Type: application/json",
            "Authorization: O-Bearer {$token}",
            "X-CLIENT-ID: {$this->clientId}",
            "X-MERCHANT-ID: {$this->merchantId}"
        ];

        $response = $this->callApi('POST', $url, $headers, json_encode($payload));
        return json_decode($response, true);
    }

    /**
     * Check Order Status
     */
    public function getOrderStatus($merchantOrderId)
    {
        $tokenData = $this->getAuthToken();
        if (!isset($tokenData['access_token'])) {
            return ['error' => 'Failed to obtain auth token'];
        }

        $token = $tokenData['access_token'];
        $url = "{$this->baseUrl}/checkout/v2/order/{$merchantOrderId}/status";

        $headers = [
            "Authorization: O-Bearer {$token}",
            "X-CLIENT-ID: {$this->clientId}",
            "X-MERCHANT-ID: {$this->merchantId}"
        ];

        $response = $this->callApi('GET', $url, $headers);
        return json_decode($response, true);
    }

    /**
     * Helper to call API via CURL
     */
    private function callApi($method, $url, $headers = [], $data = null)
    {
        $curl = curl_init();

        $options = [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => "",
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $headers,
            // Disable SSL verification for local development (Windows lacks CA bundle)
            // TODO: Remove these two lines in production
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ];

        if ($data) {
            $options[CURLOPT_POSTFIELDS] = $data;
        }

        curl_setopt_array($curl, $options);

        $response = curl_exec($curl);
        $err = curl_error($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);

        log_message('error', 'PhonePe API (' . $method . ') URL: ' . $url . ' Response Code: ' . $httpCode);
        if ($err) {
            log_message('error', 'PhonePe API cURL Error: ' . $err);
        }
        log_message('error', 'PhonePe API Response: ' . $response);

        curl_close($curl);

        if ($err) {
            return json_encode(['error' => "cURL Error #:" . $err]);
        } else {
            return $response;
        }
    }
}
