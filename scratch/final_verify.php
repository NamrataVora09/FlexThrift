<?php
/**
 * Final verification: checks every message key referenced in BaseApiController::$messageKeyMap
 */

// All unique DB keys from BaseApiController::$messageKeyMap
$allKeys = [
    'login_fields_required','login_failed','account_blocked_admin','buyer_role_blocked',
    'seller_role_blocked','account_roles_blocked','login_success','email_required',
    'email_not_found','account_blocked','otp_send_success','otp_verify_fields_required',
    'otp_verify_failed','otp_verify_success','password_reset_otp_sent',
    'password_reset_fields_required','password_too_short','password_reset_success',
    'password_update_failed','validation_failed','email_already_exists_role',
    'account_upgraded_success','mobile_already_exists','register_failed','register_success',
    'role_switch_not_allowed','auth_login_required','user_not_found','invalid_role',
    'google_credential_required','google_token_invalid','google_token_parse_failed',
    'product_not_found_or_unavailable','buyer_blocked_from_offers','seller_blocked_from_offers',
    'cannot_offer_own_product','offer_dates_required','rental_dates_required',
    'overlap_dates_offer_exists','active_offer_already_exists','buyer_subscription_required',
    'min_rental_duration','booking_conflict','booking_dates_conflict',
    'offer_sent_success','offer_not_found','offer_not_found_or_denied','offer_invalid',
    'offer_status_not_pending','offer_update_success','action_not_allowed',
    'offer_cancelled_success','offer_cancel_success','offer_cancel_not_allowed',
    'offer_address_required','offer_suggestion_sent','offer_dates_accepted',
    'offer_dates_accepted_with_order','offer_dates_updated','offer_dates_update_status_error',
    'offer_must_be_negotiating','offer_must_be_accepted_for_rating','offer_suggest_pending_only',
    'offer_reject_status_error','offer_expired','offer_action_success',
    'offer_accepted_order_created','offer_rejected_success','offer_acceptance_retracted',
    'offer_rating_submitted','seller_rated_success','buyer_rated_success',
    'already_rated_seller','already_rated_seller_self_delivery','already_rated_buyer',
    'rating_window_expired','rating_range_invalid','rating_save_failed',
    'rating_requires_return_confirmed','rating_limit_reached',
    'order_not_found','order_invalid','order_cancel_success','order_delivery_confirmed',
    'delivery_confirmed_success','order_review_submitted','order_review_failed',
    'order_must_be_pending','order_confirm_status_error','order_not_payable',
    'order_already_paid','order_create_failed','order_dispatched',
    'order_confirm_after_dispatch','order_dispatch_after_payment',
    'review_requires_delivery','order_action_failed','payment_order_success',
    'product_not_found','product_upload_success','product_fields_required',
    'product_update_success','product_edit_pending','product_delete_success',
    'product_deleted','product_delete_has_active_offers','product_delete_has_orders',
    'product_create_failed','product_approved','product_rejected',
    'seller_blocked_from_listing','seller_privileges_restricted',
    'offer_reject_finalized_error','offer_cancel_window_expired',
    'rejection_window_expired','rejection_window_unavailable','suggested_dates_conflict',
    'seller_subscription_required','seller_subscription_purchase_blocked',
    'seller_role_blocked_upload','seller_role_restricted','seller_role_blocked_access',
    'delivery_photo_required','reason_required','dates_both_required',
    'date_end_before_start','payment_initiate_failed',
    'buyer_subscription_purchase_blocked','buyer_role_restricted','buyer_role_blocked_access',
    'contact_limit_reached','subscription_required_for_contact','contact_not_viewed',
    'cannot_view_own_contact','cannot_block_self','cannot_report_self','cannot_report_admin',
    'seller_already_blocked','seller_not_blocked','seller_blocked_success',
    'seller_unblocked_success','already_reported_user','report_submitted_success',
    'seller_not_found','seller_product_id_required',
    'coupon_invalid','coupon_expired','coupon_usage_limit','coupon_code_required',
    'coupon_applied_success','plan_not_found','plan_not_found_or_inactive','plan_inactive',
    'payment_failed','payment_success','payment_processing','transaction_not_found',
    'subscription_already_active','subscription_activated','transaction_id_required',
    'wishlist_update_success','cart_update_success','notifications_all_read',
    'message_sent','message_empty','reliability_point_awarded',
    'file_too_large','file_type_not_allowed','no_valid_file',
    'settings_save_success','settings_saved_success','settings_message_updated',
    'settings_message_added','settings_message_deleted','faq_save_success','faq_delete_success',
    'plan_create_success','plan_update_success','plan_delete_success',
    'plan_activate_success','plan_deactivate_success','plan_assigned',
    'plan_marked_premium','plan_premium_removed','plan_most_selected','plan_most_selected_removed',
    'coupon_create_success','coupon_update_success','coupon_toggle_success','coupon_delete_success',
    'brand_create_success','brand_updated','charge_create_success','charge_update_success',
    'charge_delete_success','template_create_success','template_update_success',
    'template_delete_success','zone_save_success','zone_delete_success','zone_status_toggled',
    'admin_blocked_from_approvals','admin_blocked_from_user_management',
    'admin_blocked_from_product_approval','report_not_found','reported_user_not_found',
    'report_handled_success','report_reassigned','not_found_error',
    'edit_request_approve_success','edit_request_reject_success',
    'user_suspended_success','user_activated_success',
    'category_added','category_updated','subcategory_added','subcategory_updated',
    'gender_added','gender_updated','color_added','color_updated',
    'listing_type_added','listing_type_updated','product_type_added','product_type_updated',
    'item_deleted','status_toggled','rule_toggled',
    'original_brand_added','original_brand_updated','original_brand_deleted',
    'original_brand_activated','original_brand_blocked','original_brand_deactivated',
    'original_brand_unblocked','seller_brand_created','seller_brand_updated',
    'seller_brand_deleted','seller_brand_activated','seller_brand_blocked',
    'seller_brand_deactivated','seller_brand_unblocked',
    'pricing_rule_created','pricing_rule_updated','pricing_rule_deleted',
    'rental_rule_created','rental_rule_updated','rental_rule_deleted','rental_rule_toggled',
    'admin_created','admin_deleted','admin_suspended','admin_activated','rights_updated',
    'ad_uploaded','ad_updated','ad_deleted','cms_page_created','cms_page_deleted',
    'page_saved','page_updated','page_not_found','seo_updated','seo_not_found',
    'error_message_created','error_message_updated','error_message_deleted',
    'profile_updated','profile_image_updated','kyc_uploaded',
    'key_value_required','message_key_exists','no_data_to_update',
    'no_valid_image','invalid_image_type','superadmin_approve_only','superadmin_reject_only',
    'delivery_accept_assigned_only','delivery_accepted','delivery_picked_up',
    'delivery_marked_delivered','delivery_profile_updated',
];

$allKeys = array_unique($allKeys);

try {
    $pdo = new PDO('mysql:host=127.0.0.1;port=3306;dbname=flex', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $placeholders = implode(',', array_fill(0, count($allKeys), '?'));
    $stmt = $pdo->prepare("SELECT message_key FROM app_messages WHERE message_key IN ($placeholders)");
    $stmt->execute($allKeys);
    $foundKeys = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $found = array_flip($foundKeys);

    $missing = array_diff($allKeys, $foundKeys);
    $total   = $pdo->query("SELECT COUNT(*) FROM app_messages")->fetchColumn();

    echo "=== FINAL API MESSAGE VERIFICATION ===" . PHP_EOL;
    echo "Total keys in BaseApiController: " . count($allKeys) . PHP_EOL;
    echo "Found in app_messages DB:        " . count($foundKeys) . PHP_EOL;
    echo "Total rows in app_messages:      $total" . PHP_EOL;
    echo PHP_EOL;

    if (empty($missing)) {
        echo "✅  ALL " . count($allKeys) . " MESSAGE KEYS ARE PRESENT IN THE DATABASE!" . PHP_EOL;
        echo "    Every API response message is now fully configurable by the SuperAdmin." . PHP_EOL;
    } else {
        echo "❌  " . count($missing) . " missing keys:" . PHP_EOL;
        foreach ($missing as $k) {
            echo "    - $k" . PHP_EOL;
        }
    }

    echo PHP_EOL . "=== Sample (login) ===" . PHP_EOL;
    $samples = $pdo->query("SELECT message_key, message_value, category FROM app_messages WHERE message_key IN ('login_failed','login_success','auth_login_required','offer_sent_success','product_upload_success') ORDER BY message_key")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($samples as $s) {
        echo "[{$s['category']}] {$s['message_key']}: \"{$s['message_value']}\"" . PHP_EOL;
    }

} catch (Exception $e) {
    echo 'ERROR: ' . $e->getMessage() . PHP_EOL;
}
