<?php
$url = "https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token";
$headers = [
    "Content-Type: application/x-www-form-urlencoded"
];
$data = [
    'client_id' => 'M23VOBTCAAKA3_2604100302',
    'client_secret' => 'ZjMzYWQzM2UtOTA1OC00MWE1LTgxNmItZmQ4ZDllZjY0ZTFi',
    'client_version' => 1,
    'grant_type' => 'client_credentials'
];

$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_POSTFIELDS => http_build_query($data),
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 10
]);

$response = curl_exec($curl);
$err = curl_error($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

echo "HTTP Code: $httpCode\n";
echo "Error: $err\n";
echo "Response: $response\n";
