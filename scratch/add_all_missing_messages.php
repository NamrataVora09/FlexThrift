<?php
$workspace = 'c:/Users/harpreet singh/Downloads/flex/flex';
$baseFile = $workspace . '/app/Controllers/Api/BaseApiController.php';

$mappings = [
    '$count rejected products deleted.' => 'rejected_products_deleted_count',
    '20-day rating window has expired.' => 'rating_window_20day_expired',
    'A buyer reported user "' => 'buyer_reported_user_notify',
    'A seller has submitted an edit request for product "' => 'seller_edit_request_submitted_notify',
    'A seller reported user "' => 'seller_reported_user_notify',
    'A user has submitted an edit request for product "' => 'user_edit_request_submitted_notify',
    'All' => 'status_all',
    'Already reviewed' => 'already_reviewed',
    'An account with this email and mobile number already exists.' => 'account_email_mobile_exists',
    'An admin has submitted an edit request for product "' => 'admin_edit_request_submitted_notify',
    'Another buyer\\\\' => 'another_buyer_conflict',
    'Buyer approved the suggested dates. Deal finalized.' => 'buyer_approved_dates_deal_finalized',
    'Buyer sent a message on offer for "' => 'buyer_sent_offer_message',
    'Buyer shared media on offer for "' => 'buyer_shared_offer_media',
    'Buyer subscription plan requires buyer role. Please enable buyer role to purchase this plan.' => 'buyer_subscription_requires_buyer_role',
    'Cannot remove genders from "' => 'cannot_remove_genders',
    'Coupon applied successfully!' => 'coupon_applied_success',
    'Edit request not found' => 'edit_request_not_found',
    'Failed to activate subscription' => 'subscription_activate_failed',
    'Failed to update message:' => 'message_update_failed_prefix',
    'Failed to update product' => 'product_update_failed',
    'Good news! The seller has retracted their acceptance on "' => 'seller_retracted_acceptance_notify',
    'Image size exceeds maximum limit of {$maxImageSizeMB}MB. Your image is {$imageSizeMB}MB.' => 'image_size_exceeds_limit',
    'Invalid category IDs:' => 'invalid_category_ids_prefix',
    'Invalid gender_config value. Must be one of:' => 'invalid_gender_config_prefix',
    'Invalid image:' => 'invalid_image_prefix',
    'Invalid listing type ID:' => 'invalid_listing_type_id_prefix',
    'Invalid product type IDs:' => 'invalid_product_type_ids_prefix',
    'Invalid type. Must be one of:' => 'invalid_type_prefix',
    'Invalid update data' => 'invalid_update_data',
    'Landing content updated ({$saved} keys saved).' => 'landing_content_updated_count',
    'Latitude and longitude are required.' => 'lat_lng_required',
    'Marked {$count} expired offers as missed. Notifications sent to sellers and buyers.' => 'expired_offers_marked_missed_count',
    'Maximum {$maxImages} images allowed per product. You uploaded {$imageCount} images.' => 'product_max_images_exceeded',
    'Minimum purchase for this coupon is ₹' => 'coupon_min_purchase_prefix',
    'None of the provided category IDs are valid.' => 'category_ids_none_valid',
    'None of the provided category IDs exist in the database.' => 'category_ids_none_exist',
    'None of the provided product type IDs are valid.' => 'product_type_ids_none_valid',
    'None of the provided product type IDs exist in the database.' => 'product_type_ids_none_exist',
    'Order is already' => 'order_is_already_prefix',
    'Order is already confirmed' => 'order_already_confirmed',
    'Order not found for this transaction' => 'order_not_found_transaction',
    "Overlap detected with existing rule (Range: {\$existing['depreciation_range_min']} -" => 'rule_overlap_detected_prefix',
    'Payload ({$payloadMB}MB) exceeds PHP post_max_size ({$postMax}). Loaded ini: {$iniFile}' => 'payload_size_exceeds_post_max',
    'Payment failed. Please try again.' => 'payment_failed_retry',
    'Payment is being processed…' => 'payment_being_processed',
    'Payment is still processing' => 'payment_still_processing',
    'Payment received for order #{$orderId}. You can now dispatch the item.' => 'payment_received_dispatch_ready',
    'Payment successful! Subscription activated.' => 'payment_success_subscription_activated',
    'Payment successful! Your order has been confirmed.' => 'payment_success_order_confirmed',
    'Plan activated successfully' => 'plan_activated_success',
    'Please upload a bill image or uncheck "I have a bill".' => 'upload_bill_image_required',
    'Please verify your account before logging in. Check your email for verification instructions.' => 'verify_account_before_login',
    'Product edit rejected and restored.' => 'product_edit_rejected_restored',
    'Product pending edit not found' => 'product_pending_edit_not_found',
    'Product status changed to {$newStatus}.' => 'product_status_changed',
    'Seller sent a message on your offer for "' => 'seller_sent_offer_message',
    'Seller shared media on your offer for "' => 'seller_shared_offer_media',
    'Seller subscription plan requires seller role. Please enable seller role to purchase this plan.' => 'seller_subscription_requires_seller_role',
    'Server error:' => 'server_error_prefix',
    'Sorry, access is not available in' => 'access_not_available_location_prefix',
    'Sorry, our services are not yet available in' => 'services_not_available_location_prefix',
    'Subscription is already active' => 'subscription_already_active_status',
    'Switched to $newRole' => 'role_switched_success',
    'The buyer has accepted your suggested dates for "' => 'buyer_accepted_suggested_dates_notify',
    'The selected original brand is not available for this listing type. Please select a different brand or change the listing type.' => 'original_brand_listing_type_mismatch',
    'The seller has retracted their acceptance of your offer on "' => 'seller_retracted_acceptance_buyer_notify',
    'The seller has suggested new rental dates for "' => 'seller_suggested_rental_dates_notify',
    'This email address and mobile number are each associated with different existing accounts. Please use credentials that belong to a single account.' => 'email_mobile_different_accounts',
    'This email address is already registered.' => 'email_already_registered',
    'This mobile number is already registered.' => 'mobile_already_registered',
    'This plan requires payment' => 'plan_requires_payment',
    'Unable to resolve state from coordinates.' => 'unable_resolve_state_coordinates',
    'User "' => 'user_prefix_notify',
    'You already have an active buyer subscription. Please wait until it expires or is exhausted before activating a new plan.' => 'buyer_sub_already_active',
    'You have already used this coupon the maximum number of times.' => 'coupon_max_usage_user_reached',
    'You received a new offer of ₹' => 'received_new_offer_amount_notify',
    'You received a reliability point for safe self-delivery!' => 'reliability_point_self_delivery',
    'Your account is blocked. Please contact support.' => 'account_blocked_support',
    'Your buyer role is blocked by superadmin. You cannot purchase a buyer subscription plan.' => 'buyer_role_blocked_purchase',
    'Your buyer subscription expired on' => 'buyer_subscription_expired_on',
    'Your edit request for "' => 'edit_request_for_product_prefix',
    'Your offer for "' => 'offer_for_product_prefix',
    'Your offer of ₹' => 'offer_amount_prefix',
    'Your offer on "' => 'offer_on_product_prefix',
    'Your order #' => 'order_number_prefix',
    'Your seller role is blocked by superadmin. You cannot purchase a seller subscription plan.' => 'seller_role_blocked_purchase',
    '{$fieldName} must be a number greater than 0.' => 'field_must_be_greater_than_zero',
    '{$fieldName} must be a whole number (no decimals allowed).' => 'field_must_be_whole_number',
    '{$fieldName} must be an integer greater than or equal to 1.' => 'field_must_be_gte_one',
    '{$inserted} brands inserted, {$skipped} skipped.' => 'brands_csv_import_result',
    '{$inserted} coupons inserted, {$updated} updated, {$skipped} skipped.' => 'coupons_csv_import_result',
    '{$inserted} plans inserted, {$updated} updated, {$skipped} skipped.' => 'plans_csv_import_result',
    '{$inserted} products inserted, {$skipped} skipped.' => 'products_csv_import_result',
    '{$inserted} records inserted, {$updated} records updated, {$skipped} skipped.' => 'records_csv_import_result',
    '{$inserted} records inserted, {$updated} updated, {$skipped} skipped.' => 'records_csv_import_summary',
    '{$inserted} rules inserted, {$skipped} skipped.' => 'rules_csv_import_result',
    '{$label} is mandatory and cannot be empty.' => 'label_mandatory_cannot_be_empty',
    '{$typeLabel} rights {$actionLabel} all administrators.' => 'admin_rights_bulk_action_result',
];

echo "Updating BaseApiController.php...\n";
$baseContent = file_get_contents($baseFile);

// Find insertion point inside $messageKeyMap array before the closing bracket of the array
$newArrayLines = "\n        // ── AUTO-ADDED BACKEND MESSAGES ─────────────────────────────────────────\n";
foreach ($mappings as $msg => $key) {
    // Escaping single quotes in message string for PHP array syntax
    $cleanMsg = addcslashes($msg, "'");
    $newArrayLines .= "        '{$cleanMsg}' => '{$key}',\n";
}

// Insert before the end of $messageKeyMap
$baseContent = preg_replace('/(protected static array \$messageKeyMap = \[\n)/', "$1" . $newArrayLines, $baseContent, 1);
file_put_contents($baseFile, $baseContent);
echo "BaseApiController.php updated successfully!\n";

// Update DB app_messages table
echo "Inserting missing keys into Database app_messages table...\n";
try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=flex', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $pdo->prepare("INSERT INTO app_messages (message_key, message_value, category, created_at, updated_at) 
                           VALUES (:key, :val, :cat, NOW(), NOW()) 
                           ON DUPLICATE KEY UPDATE message_value = VALUES(message_value)");

    $insertedCount = 0;
    foreach ($mappings as $msg => $key) {
        $cat = (stripos($msg, 'failed') !== false || stripos($msg, 'invalid') !== false || stripos($msg, 'blocked') !== false || stripos($msg, 'error') !== false || stripos($msg, 'expired') !== false || stripos($msg, 'cannot') !== false || stripos($msg, 'required') !== false) ? 'error' : 'success';
        $stmt->execute([':key' => $key, ':val' => $msg, ':cat' => $cat]);
        $insertedCount++;
    }
    echo "Successfully inserted/updated {$insertedCount} keys into Database `app_messages`!\n";
} catch (Exception $e) {
    echo "DB Error: " . $e->getMessage() . "\n";
}

// Create Migration File
$migPath = $workspace . '/app/Database/Migrations/2026-08-26-120000_SeedRemainingBackendMessages.php';
$migCode = "<?php\n\nnamespace App\Database\Migrations;\n\nuse CodeIgniter\Database\Migration;\n\nclass SeedRemainingBackendMessages extends Migration\n{\n    public function up()\n    {\n        \$db = \Config\Database::connect();\n        \$messages = [\n";

foreach ($mappings as $msg => $key) {
    $cleanMsg = addcslashes($msg, "'");
    $cat = (stripos($msg, 'failed') !== false || stripos($msg, 'invalid') !== false || stripos($msg, 'blocked') !== false || stripos($msg, 'error') !== false || stripos($msg, 'expired') !== false || stripos($msg, 'cannot') !== false || stripos($msg, 'required') !== false) ? 'error' : 'success';
    $migCode .= "            ['message_key' => '{$key}', 'message_value' => '{$cleanMsg}', 'category' => '{$cat}'],\n";
}

$migCode .= "        ];\n\n        foreach (\$messages as \$m) {\n            \$existing = \$db->table('app_messages')->where('message_key', \$m['message_key'])->get()->getRowArray();\n            if (!\$existing) {\n                \$db->table('app_messages')->insert(array_merge(\$m, ['created_at' => date('Y-m-d H:i:s'), 'updated_at' => date('Y-m-d H:i:s')]));\n            }\n        }\n    }\n\n    public function down()\n    {\n    }\n}\n";

file_put_contents($migPath, $migCode);
echo "Migration file created: {$migPath}\n";
