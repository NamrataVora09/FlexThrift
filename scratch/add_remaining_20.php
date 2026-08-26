<?php
$workspace = 'c:/Users/harpreet singh/Downloads/flex/flex';
$baseFile = $workspace . '/app/Controllers/Api/BaseApiController.php';

$mappings = [
    'A buyer reported user "' => 'buyer_reported_user_notify',
    'A seller has submitted an edit request for product "' => 'seller_edit_request_submitted_notify',
    'A seller reported user "' => 'seller_reported_user_notify',
    'A user has submitted an edit request for product "' => 'user_edit_request_submitted_notify',
    'An admin has submitted an edit request for product "' => 'admin_edit_request_submitted_notify',
    'Buyer sent a message on offer for "' => 'buyer_sent_offer_message',
    'Buyer shared media on offer for "' => 'buyer_shared_offer_media',
    'Cannot remove genders from "' => 'cannot_remove_genders',
    'Good news! The seller has retracted their acceptance on "' => 'seller_retracted_acceptance_notify',
    "Overlap detected with existing rule (Range: {\$existing['depreciation_range_min']} -" => 'rule_overlap_detected_prefix',
    'Please upload a bill image or uncheck "I have a bill".' => 'upload_bill_image_required',
    'Seller sent a message on your offer for "' => 'seller_sent_offer_message',
    'Seller shared media on your offer for "' => 'seller_shared_offer_media',
    'The buyer has accepted your suggested dates for "' => 'buyer_accepted_suggested_dates_notify',
    'The seller has retracted their acceptance of your offer on "' => 'seller_retracted_acceptance_buyer_notify',
    'The seller has suggested new rental dates for "' => 'seller_suggested_rental_dates_notify',
    'User "' => 'user_prefix_notify',
    'Your edit request for "' => 'edit_request_for_product_prefix',
    'Your offer for "' => 'offer_for_product_prefix',
    'Your offer on "' => 'offer_on_product_prefix',
];

$baseContent = file_get_contents($baseFile);

$targetLine = "'System is currently locked by administration. Only Superadmin access is permitted.' => 'system_locked_error',";

$addition = "\n        // ── ADDITIONAL UNMAPPED MESSAGES ──────────────────────────────────────\n";
foreach ($mappings as $msg => $key) {
    $cleanMsg = addcslashes($msg, "'");
    $addition .= "        '{$cleanMsg}' => '{$key}',\n";
}

if (strpos($baseContent, $targetLine) !== false) {
    $baseContent = str_replace($targetLine, $targetLine . $addition, $baseContent);
    file_put_contents($baseFile, $baseContent);
    echo "BaseApiController.php successfully updated with remaining keys!\n";
}

try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=flex', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("INSERT INTO app_messages (message_key, message_value, category, created_at, updated_at) 
                           VALUES (:key, :val, :cat, NOW(), NOW()) 
                           ON DUPLICATE KEY UPDATE message_value = VALUES(message_value)");

    foreach ($mappings as $msg => $key) {
        $cat = (stripos($msg, 'failed') !== false || stripos($msg, 'invalid') !== false || stripos($msg, 'blocked') !== false || stripos($msg, 'error') !== false || stripos($msg, 'expired') !== false || stripos($msg, 'cannot') !== false || stripos($msg, 'required') !== false) ? 'error' : 'success';
        $stmt->execute([':key' => $key, ':val' => $msg, ':cat' => $cat]);
    }
    echo "Successfully inserted remaining 20 keys into Database `app_messages`!\n";
} catch (Exception $e) {
    echo "DB Error: " . $e->getMessage() . "\n";
}

// Append to migration file
$migPath = $workspace . '/app/Database/Migrations/2026-08-26-120000_SeedRemainingBackendMessages.php';
$migCode = file_get_contents($migPath);
$newMigLines = "";
foreach ($mappings as $msg => $key) {
    $cleanMsg = addcslashes($msg, "'");
    $cat = (stripos($msg, 'failed') !== false || stripos($msg, 'invalid') !== false || stripos($msg, 'blocked') !== false || stripos($msg, 'error') !== false || stripos($msg, 'expired') !== false || stripos($msg, 'cannot') !== false || stripos($msg, 'required') !== false) ? 'error' : 'success';
    $newMigLines .= "            ['message_key' => '{$key}', 'message_value' => '{$cleanMsg}', 'category' => '{$cat}'],\n";
}

$migCode = str_replace("        ];", $newMigLines . "        ];", $migCode);
file_put_contents($migPath, $migCode);
echo "Updated migration file: {$migPath}\n";
