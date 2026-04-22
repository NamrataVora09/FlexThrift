$filePath = "app\Config\Routes.php"
$content = [System.IO.File]::ReadAllText($filePath)
$searchStr = "test-phonepe', 'Api\SuperAdminApi::testPhonePeConnection');"
$replaceStr = "test-phonepe', 'Api\SuperAdminApi::testPhonePeConnection';" + "`r`n" + "        " + '$routes->post(' + "'upload-landing-card-image', 'Api\SuperAdminApi::uploadLandingCardImage');"
if ($content.Contains($searchStr)) {
    $content = $content.Replace($searchStr, $replaceStr)
    [System.IO.File]::WriteAllText($filePath, $content)
    Write-Host "Route added successfully"
} else {
    Write-Host "Search string not found - checking content..."
    $content | Select-String "test-phonepe"
}
