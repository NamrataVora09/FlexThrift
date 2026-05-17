<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "http://localhost:8080/api/v1/shared/advertisements?position=footer&page=browse");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Status Code: " . $http_code . "\n";
echo "Response Output:\n";
$data = json_decode($response, true);
if ($data) {
    print_r($data);
} else {
    echo $response . "\n";
}
