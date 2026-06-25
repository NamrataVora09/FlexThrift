<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
/**
 * BaseApiController
 *
 * Every API controller extends this class. The respond() method is overridden
 * to intercept the 'message' field of every JSON response and replace it with
 * the value stored in the `app_messages` database table (keyed by $messageKeyMap).
 *
 * This means the SuperAdmin can customise every API response message from the
 * Business Settings → App Messages page without touching code.
 *
 * HOW IT WORKS
 * ─────────────
 *  1. Controller calls:  $this->respond(['success' => false, 'message' => 'User not found'], 404)
 *  2. respond() calls translateResponseData() which finds the 'message' key.
 *  3. translateMessage() looks up 'User not found' in $messageKeyMap → 'user_not_found'.
 *  4. getAppMessage('user_not_found', 'User not found') fetches the DB row.
 *  5. The DB value (customised by superadmin) is returned instead of the hardcoded string.
 *
 * ADDING NEW MESSAGES
 * ────────────────────
 *  1. Add the hardcoded string → 'db_key' to $messageKeyMap below.
 *  2. Insert a row in app_messages with that message_key.
 *  3. No other code changes required – the interception is automatic.
 */
class BaseApiController extends ResourceController
{
    protected $format = 'json';

    /**
     * Complete map of every hardcoded API response message → app_messages DB key.
     * Superadmin configures the values; the key here is the lookup identifier.
     */
    protected static array $messageKeyMap = [

        // ── AUTH & ACCOUNT ──────────────────────────────────────────────────
        'Email and password are required'                                         => 'login_fields_required',
        'Invalid email or password'                                               => 'login_failed',
        'Your account has been blocked by admin'                                  => 'account_blocked_admin',
        'Your buyer role has been blocked by admin'                               => 'buyer_role_blocked',
        'Your seller role has been blocked by admin'                              => 'seller_role_blocked',
        'Your account roles have been blocked by admin'                           => 'account_roles_blocked',
        'Login successful'                                                        => 'login_success',
        'Email is required'                                                       => 'email_required',
        'No account found with this email'                                        => 'email_not_found',
        'Your account has been blocked'                                           => 'account_blocked',
        'OTP sent to your email'                                                  => 'otp_send_success',
        'Email and OTP are required'                                              => 'otp_verify_fields_required',
        'Invalid or expired OTP'                                                  => 'otp_verify_failed',
        'OTP verified successfully'                                               => 'otp_verify_success',
        'Password reset OTP sent to your email'                                   => 'password_reset_otp_sent',
        'Email, OTP, and new password are required'                               => 'password_reset_fields_required',
        'Password must be at least 6 characters long'                             => 'password_too_short',
        'Password reset successfully. You can now login with your new password.'  => 'password_reset_success',
        'Failed to update password. Please try again.'                            => 'password_update_failed',
        'Validation failed'                                                       => 'validation_failed',
        'This email is already registered with the selected role.'                => 'email_already_exists_role',
        'Account upgraded successfully. OTP sent to your email.'                  => 'account_upgraded_success',
        'Mobile number already registered'                                        => 'mobile_already_exists',
        'Registration failed'                                                     => 'register_failed',
        'Registration successful. OTP sent to your email.'                        => 'register_success',
        'Role switching not allowed'                                              => 'role_switch_not_allowed',
        'Unauthorized'                                                            => 'auth_login_required',
        'User not found'                                                          => 'user_not_found',
        'Invalid role'                                                            => 'invalid_role',
        'Google credential is required'                                           => 'google_credential_required',
        'Invalid Google token'                                                    => 'google_token_invalid',
        'Failed to parse Google token'                                            => 'google_token_parse_failed',

        // ── OFFERS & BUYER ──────────────────────────────────────────────────
        'Product not found or currently unavailable'                              => 'product_not_found_or_unavailable',
        'Your account is currently blocked from making offers as a buyer.'        => 'buyer_blocked_from_offers',
        'This seller is currently blocked and cannot receive offers.'             => 'seller_blocked_from_offers',
        'Cannot make offer on your own product'                                   => 'cannot_offer_own_product',
        'Rental start and end dates are required'                                 => 'offer_dates_required',
        'Start and end dates are required for rental products.'                   => 'rental_dates_required',
        'You already have an active offer overlapping with these dates.'          => 'overlap_dates_offer_exists',
        'You already have an active offer on this product.'                       => 'active_offer_already_exists',
        'You need an active buyer subscription to make offers. Please subscribe to a buyer plan.' => 'buyer_subscription_required',
        'Minimum rental period is {min} days. You selected {selected} day(s).' => 'rental_min_days_error',
        'This product already has an active offer for the selected dates. Please choose different dates.' => 'booking_conflict',
        'The selected dates conflict with an existing booking.'                   => 'booking_dates_conflict',
        'Offer submitted successfully'                                            => 'offer_sent_success',
        'Offer not found'                                                         => 'offer_not_found',
        'Offer not found or permission denied'                                    => 'offer_not_found_or_denied',
        'Invalid offer'                                                           => 'offer_invalid',
        'Offer status is not pending'                                             => 'offer_status_not_pending',
        'Offer update successful'                                                 => 'offer_update_success',
        'Action not allowed'                                                      => 'action_not_allowed',
        'Offer cancelled successfully.'                                           => 'offer_cancelled_success',
        'Offer cancelled'                                                         => 'offer_cancel_success',
        'This offer can no longer be cancelled'                                   => 'offer_cancel_not_allowed',
        'Address and pin code are required for delivery'                          => 'offer_address_required',
        'Dates suggested successfully'                                            => 'offer_suggestion_sent',
        'Date suggestion sent to buyer'                                           => 'offer_suggestion_sent',
        'Dates accepted'                                                          => 'offer_dates_accepted',
        'Dates accepted! The deal is now finalized and an order has been created.' => 'offer_dates_accepted_with_order',
        'Offer dates updated successfully.'                                       => 'offer_dates_updated',
        'Dates can only be updated for active or rejected offers.'                => 'offer_dates_update_status_error',
        'Only negotiating offers can be confirmed'                                => 'offer_must_be_negotiating',
        'Offer must be accepted before rating'                                    => 'offer_must_be_accepted_for_rating',
        'Date suggestions are only allowed on pending offers'                     => 'offer_suggest_pending_only',
        'Only pending or accepted (within window) offers can be rejected'         => 'offer_reject_status_error',
        'This offer has expired.'                                                 => 'offer_expired',
        'Action failed'                                                           => 'order_action_failed',
        'Offer action successful'                                                 => 'offer_action_success',
        'Offer accepted, order created'                                           => 'offer_accepted_order_created',
        'Offer rejected'                                                          => 'offer_rejected_success',
        'Acceptance retracted. Offer has been rejected.'                          => 'offer_acceptance_retracted',

        // ── RATINGS ─────────────────────────────────────────────────────────
        'Rating submitted'                                                        => 'offer_rating_submitted',
        'Seller rated successfully!'                                              => 'seller_rated_success',
        'Buyer rated successfully!'                                               => 'buyer_rated_success',
        'You already rated this seller.'                                          => 'already_rated_seller',
        'You have already rated this seller'                                      => 'already_rated_seller',
        'You have already rated this seller for self-delivery.'                   => 'already_rated_seller_self_delivery',
        'You have already rated this buyer'                                       => 'already_rated_buyer',
        'Rating period has expired.'                                              => 'rating_window_expired',
        'Rating window has expired'                                               => 'rating_window_expired',
        'Rating must be between 1 and 5'                                          => 'rating_range_invalid',
        'Failed to save rating'                                                   => 'rating_save_failed',
        'You can only rate the seller after they confirm the safe return of the product.' => 'rating_requires_return_confirmed',
        'Your rating limit has been reached. You get 1 rating opportunity for every 3 unique sellers you contact.' => 'rating_limit_reached',

        // ── ORDERS ──────────────────────────────────────────────────────────
        'Order not found'                                                         => 'order_not_found',
        'Invalid order'                                                           => 'order_invalid',
        'Order cancelled'                                                         => 'order_cancel_success',
        'Delivery confirmed'                                                      => 'order_delivery_confirmed',
        'Delivery confirmed successfully'                                         => 'delivery_confirmed_success',
        'Review submitted'                                                        => 'order_review_submitted',
        'Review already submitted'                                                => 'order_review_failed',
        'Only pending orders can be cancelled'                                    => 'order_must_be_pending',
        'Order cannot be confirmed in current status'                             => 'order_confirm_status_error',
        'Order is not in a payable state'                                         => 'order_not_payable',
        'This order is already paid'                                              => 'order_already_paid',
        'Failed to create order'                                                  => 'order_create_failed',
        'Order marked as dispatched'                                              => 'order_dispatched',
        'Order can only be confirmed after dispatching'                           => 'order_confirm_after_dispatch',
        'Order can only be dispatched after payment is received'                  => 'order_dispatch_after_payment',
        'You can only review after the order is delivered'                        => 'review_requires_delivery',
        'Payment successful! Order confirmed.'                                    => 'payment_order_success',

        // ── PRODUCTS ────────────────────────────────────────────────────────
        'Product not found'                                                       => 'product_not_found',
        'Product not found.'                                                      => 'product_not_found',
        'Product listed successfully. Wait for admin approval.'                   => 'product_upload_success',
        'Category and brand are required'                                         => 'product_fields_required',
        'Product updated successfully'                                            => 'product_update_success',
        'Edit request submitted. Wait for admin approval.'                        => 'product_edit_pending',
        'Product deleted successfully'                                            => 'product_delete_success',
        'Product deleted'                                                         => 'product_deleted',
        'Product deleted.'                                                        => 'product_deleted',
        'You have active offers/orders on this product. Complete or cancel them first.' => 'product_delete_has_active_offers',
        'Cannot delete product with active orders'                                => 'product_delete_has_orders',
        'Failed to create product'                                                => 'product_create_failed',
        'Product approved'                                                        => 'product_approved',
        'Product rejected'                                                        => 'product_rejected',

        // ── SELLER ACCOUNT & SUBSCRIPTION ───────────────────────────────────
        'Your account is currently blocked from listing products.'                => 'seller_blocked_from_listing',
        'Seller privileges restricted'                                            => 'seller_privileges_restricted',
        'You cannot reject a finalized offer.'                                    => 'offer_reject_finalized_error',
        'You cannot cancel after the rejection window has expired.'               => 'offer_cancel_window_expired',
        'Rejection window has expired. You can no longer retract this accepted offer.' => 'rejection_window_expired',
        'Rejection window unavailable for this offer'                             => 'rejection_window_unavailable',
        'The suggested dates conflict with an existing booking'                   => 'suggested_dates_conflict',
        'No active seller subscription found. Please subscribe to a seller plan to upload products.' => 'seller_subscription_required',
        'Your account is restricted from purchasing seller subscriptions.'        => 'seller_subscription_purchase_blocked',
        'Your seller role has been blocked by the admin. You cannot upload products.' => 'seller_role_blocked_upload',
        'Your seller role has been restricted by the administrator.'              => 'seller_role_restricted',
        'Your seller role is currently blocked. Access restricted.'               => 'seller_role_blocked_access',
        'A delivery photograph is required to confirm delivery'                   => 'delivery_photo_required',
        'A reason is required'                                                    => 'reason_required',
        'Both start and end dates are required'                                   => 'dates_both_required',
        'End date must be after start date'                                       => 'date_end_before_start',
        'Failed to initiate payment. Please try again.'                           => 'payment_initiate_failed',

        // ── BUYER ACCOUNT & SUBSCRIPTION ────────────────────────────────────
        'Your account is restricted from purchasing buyer subscriptions.'         => 'buyer_subscription_purchase_blocked',
        'Your buyer role has been restricted by the administrator.'               => 'buyer_role_restricted',
        'Your buyer role is currently blocked. Access restricted.'                => 'buyer_role_blocked_access',
        'Your contact limit has been reached. Please upgrade or renew your plan.' => 'contact_limit_reached',
        'No active subscription found. Please subscribe to view contact details.' => 'subscription_required_for_contact',
        'Contact details not viewed.'                                             => 'contact_not_viewed',
        'You cannot view your own contact'                                        => 'cannot_view_own_contact',

        // ── BLOCKING / REPORTING ─────────────────────────────────────────────
        'You cannot block yourself'                                               => 'cannot_block_self',
        'You cannot report yourself'                                              => 'cannot_report_self',
        'Cannot report an admin'                                                  => 'cannot_report_admin',
        'You have already blocked this seller'                                    => 'seller_already_blocked',
        'This seller is not blocked'                                              => 'seller_not_blocked',
        'Seller blocked successfully'                                             => 'seller_blocked_success',
        'Seller unblocked successfully'                                           => 'seller_unblocked_success',
        'You have already reported this user in the past 7 days'                 => 'already_reported_user',
        'Report submitted successfully'                                           => 'report_submitted_success',
        'Seller not found'                                                        => 'seller_not_found',
        'seller_id and product_id are required'                                   => 'seller_product_id_required',

        // ── COUPONS ──────────────────────────────────────────────────────────
        'Invalid or expired coupon code.'                                         => 'coupon_invalid',
        'Coupon has expired.'                                                     => 'coupon_expired',
        'Coupon usage limit reached.'                                             => 'coupon_usage_limit',
        'Coupon code is required'                                                 => 'coupon_code_required',
        'Coupon applied!'                                                         => 'coupon_applied_success',

        // ── PLANS & PAYMENTS ─────────────────────────────────────────────────
        'Plan not found'                                                          => 'plan_not_found',
        'Plan not found or inactive'                                              => 'plan_not_found_or_inactive',
        'Invalid or inactive plan.'                                               => 'plan_inactive',
        'Payment initiation failed.'                                              => 'payment_failed',
        'Payment verified and plans stacked!'                                     => 'payment_success',
        'Payment failed or was cancelled.'                                        => 'payment_failed',
        'Payment is being processed.'                                             => 'payment_processing',
        'Transaction not found'                                                   => 'transaction_not_found',
        'Already active'                                                          => 'subscription_already_active',
        'Subscription activated'                                                  => 'subscription_activated',
        'No transaction ID provided'                                              => 'transaction_id_required',

        // ── MISC BUYER ───────────────────────────────────────────────────────
        'Wishlist updated'                                                        => 'wishlist_update_success',
        'Cart updated'                                                            => 'cart_update_success',
        'All notifications marked as read'                                        => 'notifications_all_read',
        'Message sent'                                                            => 'message_sent',
        'Message cannot be empty'                                                 => 'message_empty',
        'Reliability point awarded successfully!'                                 => 'reliability_point_awarded',
        'File too large. Max 10 MB.'                                              => 'file_too_large',
        'File type not allowed'                                                   => 'file_type_not_allowed',
        'No valid file uploaded'                                                  => 'no_valid_file',

        // ── ADMIN & SUPERADMIN ───────────────────────────────────────────────
        'Settings saved'                                                          => 'settings_save_success',
        'Settings saved successfully.'                                            => 'settings_saved_success',
        'Message updated'                                                         => 'settings_message_updated',
        'Message added'                                                           => 'settings_message_added',
        'Message deleted'                                                         => 'settings_message_deleted',
        'FAQ created'                                                             => 'faq_save_success',
        'FAQ updated'                                                             => 'faq_save_success',
        'FAQ deleted'                                                             => 'faq_delete_success',
        'Plan created'                                                            => 'plan_create_success',
        'Plan updated'                                                            => 'plan_update_success',
        'Plan deleted'                                                            => 'plan_delete_success',
        'Plan activated'                                                          => 'plan_activate_success',
        'Plan deactivated'                                                        => 'plan_deactivate_success',
        'Plan assigned successfully.'                                             => 'plan_assigned',
        'Plan marked as premium'                                                  => 'plan_marked_premium',
        'Premium removed'                                                         => 'plan_premium_removed',
        'Marked as Most Selected'                                                 => 'plan_most_selected',
        'Removed Most Selected'                                                   => 'plan_most_selected_removed',
        'Coupon created'                                                          => 'coupon_create_success',
        'Coupon updated'                                                          => 'coupon_update_success',
        'Coupon toggled'                                                          => 'coupon_toggle_success',
        'Coupon deleted'                                                          => 'coupon_delete_success',
        'Brand created'                                                           => 'brand_create_success',
        'Brand created successfully.'                                             => 'brand_create_success',
        'Brand updated.'                                                          => 'brand_updated',
        'Platform charge created'                                                 => 'charge_create_success',
        'Platform charge updated'                                                 => 'charge_update_success',
        'Platform charge deleted'                                                 => 'charge_delete_success',
        'Charge created.'                                                         => 'charge_create_success',
        'Charge updated.'                                                         => 'charge_update_success',
        'Charge deleted.'                                                         => 'charge_delete_success',
        'Template created'                                                        => 'template_create_success',
        'Template added'                                                          => 'template_create_success',
        'Template updated'                                                        => 'template_update_success',
        'Template deleted'                                                        => 'template_delete_success',
        'Zone saved successfully'                                                 => 'zone_save_success',
        'Zone saved successfully.'                                                => 'zone_save_success',
        'Zone deleted successfully'                                               => 'zone_delete_success',
        'Zone deleted.'                                                           => 'zone_delete_success',
        'Zone status toggled.'                                                    => 'zone_status_toggled',
        'You are blocked from approvals.'                                         => 'admin_blocked_from_approvals',
        'Your access to user management is restricted.'                           => 'admin_blocked_from_user_management',
        'Report not found or not assigned to you'                                 => 'report_not_found',
        'Reported user not found'                                                 => 'reported_user_not_found',
        'Report handled successfully'                                             => 'report_handled_success',
        'Report reassigned'                                                       => 'report_reassigned',
        'Not found'                                                               => 'not_found_error',
        'Edit request approved and merged.'                                       => 'edit_request_approve_success',
        'Edit request rejected.'                                                  => 'edit_request_reject_success',
        'User suspended successfully.'                                            => 'user_suspended_success',
        'User activated successfully.'                                            => 'user_activated_success',
        'Category added.'                                                         => 'category_added',
        'Category updated.'                                                       => 'category_updated',
        'Sub-category added.'                                                     => 'subcategory_added',
        'Sub-category updated.'                                                   => 'subcategory_updated',
        'Gender added.'                                                           => 'gender_added',
        'Gender updated.'                                                         => 'gender_updated',
        'Color added.'                                                            => 'color_added',
        'Color updated.'                                                          => 'color_updated',
        'Listing type added.'                                                     => 'listing_type_added',
        'Listing type updated.'                                                   => 'listing_type_updated',
        'Product type added.'                                                     => 'product_type_added',
        'Product type updated.'                                                   => 'product_type_updated',
        'Item deleted.'                                                           => 'item_deleted',
        'Status toggled.'                                                         => 'status_toggled',
        'Rule toggled'                                                            => 'rule_toggled',
        'Original brand added.'                                                   => 'original_brand_added',
        'Original brand updated.'                                                 => 'original_brand_updated',
        'Original brand deleted.'                                                 => 'original_brand_deleted',
        'Original brand activated.'                                               => 'original_brand_activated',
        'Original brand blocked and products rejected.'                           => 'original_brand_blocked',
        'Original brand deactivated. Brand name hidden from all products (products are NOT detagged).' => 'original_brand_deactivated',
        'Original brand unblocked. Products restored to their original statuses.' => 'original_brand_unblocked',
        'Seller brand created and assigned.'                                      => 'seller_brand_created',
        'Seller brand updated.'                                                   => 'seller_brand_updated',
        'Seller brand deleted.'                                                   => 'seller_brand_deleted',
        'Seller brand activated.'                                                 => 'seller_brand_activated',
        'Seller brand blocked and products rejected.'                             => 'seller_brand_blocked',
        'Seller brand deactivated. Brand name hidden from all products (products are NOT detagged).' => 'seller_brand_deactivated',
        'Seller brand unblocked. Products restored to their original statuses.'   => 'seller_brand_unblocked',
        'Pricing rule created'                                                    => 'pricing_rule_created',
        'Pricing rule updated'                                                    => 'pricing_rule_updated',
        'Pricing rule deleted'                                                    => 'pricing_rule_deleted',
        'Rental rule created'                                                     => 'rental_rule_created',
        'Rental rule updated'                                                     => 'rental_rule_updated',
        'Rental rule deleted'                                                     => 'rental_rule_deleted',
        'Rental rule toggled'                                                     => 'rental_rule_toggled',
        'Admin created successfully.'                                             => 'admin_created',
        'Admin deleted successfully.'                                             => 'admin_deleted',
        'Admin suspended.'                                                        => 'admin_suspended',
        'Admin activated.'                                                        => 'admin_activated',
        'Rights updated successfully.'                                            => 'rights_updated',
        'Advertisement uploaded successfully.'                                    => 'ad_uploaded',
        'Advertisement updated successfully.'                                     => 'ad_updated',
        'Advertisement deleted.'                                                  => 'ad_deleted',
        'CMS page created successfully.'                                          => 'cms_page_created',
        'CMS page deleted successfully.'                                          => 'cms_page_deleted',
        'Page saved'                                                              => 'page_saved',
        'Page updated successfully.'                                              => 'page_updated',
        'Page not found.'                                                         => 'page_not_found',
        'SEO setting updated successfully.'                                       => 'seo_updated',
        'SEO settings not found for this page'                                    => 'seo_not_found',
        'Error message created successfully'                                      => 'error_message_created',
        'Error message updated successfully'                                      => 'error_message_updated',
        'Error message deleted successfully'                                      => 'error_message_deleted',
        'Profile updated'                                                         => 'profile_updated',
        'Profile image updated'                                                   => 'profile_image_updated',
        'KYC documents uploaded'                                                  => 'kyc_uploaded',
        'Key and value are required'                                              => 'key_value_required',
        'Message key already exists'                                              => 'message_key_exists',
        'No data to update'                                                       => 'no_data_to_update',
        'No valid image uploaded'                                                 => 'no_valid_image',
        'Only JPG, PNG, WEBP images are allowed'                                  => 'invalid_image_type',
        'Only super admin can approve system-user uploaded products'              => 'superadmin_approve_only',
        'Only super admin can reject system-user uploaded products'               => 'superadmin_reject_only',
        'You are blocked from approving products'                                 => 'admin_blocked_from_product_approval',

        // ── DELIVERY AGENT ───────────────────────────────────────────────────
        'Can only accept assigned deliveries'                                     => 'delivery_accept_assigned_only',
        'Delivery accepted'                                                       => 'delivery_accepted',
        'Marked as picked up'                                                     => 'delivery_picked_up',
        'Marked as delivered'                                                     => 'delivery_marked_delivered',
        'Delivery profile updated'                                                => 'delivery_profile_updated',
    ];

    /**
     * Override standard CodeIgniter respond() to translate every 'message' value.
     */
    public function respond($data = null, int $status = null, string $message = '')
    {
        if (is_array($data)) {
            $data = $this->translateResponseData($data);
        }
        return parent::respond($data, $status, $message);
    }

    /**
     * Recursively walk the response array and translate any string stored under 'message'.
     */
    protected function translateResponseData(array $data): array
    {
        foreach ($data as $key => $value) {
            if ($key === 'message' && is_string($value)) {
                $data[$key] = $this->translateMessage($value);
            } elseif (is_array($value)) {
                $data[$key] = $this->translateResponseData($value);
            }
        }
        return $data;
    }

    /**
     * Look up the exact message string in $messageKeyMap, then fetch its DB value.
     * Falls back to the original hardcoded string if no mapping / no DB row exists.
     */
    protected function translateMessage(string $message): string
    {
        $key = self::$messageKeyMap[trim($message)] ?? null;
        return $key ? getAppMessage($key, $message) : $message;
    }
}
