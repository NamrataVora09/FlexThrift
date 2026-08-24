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
        'Email and password are required'                                                => 'login_fields_required',
        'Invalid email or password'                                                      => 'login_failed',
        'Your account has been blocked by admin'                                         => 'account_blocked_admin',
        'Your buyer role has been blocked by admin'                                      => 'buyer_role_blocked',
        'Your seller role has been blocked by admin'                                     => 'seller_role_blocked',
        'Your account roles have been blocked by admin'                                  => 'account_roles_blocked',
        'Login successful'                                                               => 'login_success',
        'Email is required'                                                              => 'email_required',
        'No account found with this email'                                               => 'email_not_found',
        // ── FRONTEND — AUTH FALLBACK ──────────────────────────────────────────
        'Your account has been blocked'                                                  => 'account_blocked',
        // ── AUTH & ACCOUNT ──────────────────────────────────────────────────
        'OTP sent to your email'                                                         => 'otp_send_success',
        'Email and OTP are required'                                                     => 'otp_verify_fields_required',
        'Invalid or expired OTP'                                                         => 'otp_verify_failed',
        'OTP verified successfully'                                                      => 'otp_verify_success',
        'Password reset OTP sent to your email'                                          => 'password_reset_otp_sent',
        'Email, OTP, and new password are required'                                      => 'password_reset_fields_required',
        'Password must be at least 6 characters long'                                    => 'password_too_short',
        'Password reset successfully. You can now login with your new password.'         => 'password_reset_success',
        'Failed to update password. Please try again.'                                   => 'password_update_failed',
        // ── FRONTEND — AUTH FALLBACK ──────────────────────────────────────────
        'Validation failed'                                                              => 'validation_failed',
        // ── AUTH & ACCOUNT ──────────────────────────────────────────────────
        'This email is already registered with the selected role.'                       => 'email_already_exists_role',
        'Account upgraded successfully. OTP sent to your email.'                         => 'account_upgraded_success',
        'Mobile number already registered'                                               => 'mobile_already_exists',
        'Registration failed'                                                            => 'register_failed',
        'Registration successful. OTP sent to your email.'                               => 'register_success',
        'Role switching not allowed'                                                     => 'role_switch_not_allowed',
        'Unauthorized'                                                                   => 'auth_login_required',
        'User not found'                                                                 => 'user_not_found',
        'Invalid role'                                                                   => 'invalid_role',
        'Google credential is required'                                                  => 'google_credential_required',
        'Invalid Google token'                                                           => 'google_token_invalid',
        'Failed to parse Google token'                                                   => 'google_token_parse_failed',
        // ── OFFERS & BUYER ──────────────────────────────────────────────────
        'Product not found or currently unavailable'                                     => 'product_not_found_or_unavailable',
        'Your account is currently blocked from making offers as a buyer.'               => 'buyer_blocked_from_offers',
        'This seller is currently blocked and cannot receive offers.'                    => 'seller_blocked_from_offers',
        'Cannot make offer on your own product'                                          => 'cannot_offer_own_product',
        'Rental start and end dates are required'                                        => 'offer_dates_required',
        'Start and end dates are required for rental products.'                          => 'rental_dates_required',
        'You already have an active offer overlapping with these dates.'                 => 'overlap_dates_offer_exists',
        'You already have an active offer on this product.'                              => 'active_offer_already_exists',
        'You need an active buyer subscription to make offers. Please subscribe to a buyer plan.' => 'buyer_subscription_required',
        'Minimum rental period is {min} days. You selected {selected} day(s).'           => 'rental_min_days_error',
        'This product already has an active offer for the selected dates. Please choose different dates.' => 'booking_conflict',
        'The selected dates conflict with an existing booking.'                          => 'booking_dates_conflict',
        'Offer submitted successfully'                                                   => 'offer_sent_success',
        'Offer not found'                                                                => 'offer_not_found',
        'Offer not found or permission denied'                                           => 'offer_not_found_or_denied',
        'Invalid offer'                                                                  => 'offer_invalid',
        'Offer status is not pending'                                                    => 'offer_status_not_pending',
        'Offer update successful'                                                        => 'offer_update_success',
        'Action not allowed'                                                             => 'action_not_allowed',
        'Offer cancelled successfully.'                                                  => 'offer_cancelled_success',
        'Offer cancelled'                                                                => 'offer_cancel_success',
        'This offer can no longer be cancelled'                                          => 'offer_cancel_not_allowed',
        'Address and pin code are required for delivery'                                 => 'offer_address_required',
        'Dates suggested successfully'                                                   => 'offer_suggestion_sent',
        'Date suggestion sent to buyer'                                                  => 'offer_suggestion_sent',
        'Dates accepted'                                                                 => 'offer_dates_accepted',
        'Dates accepted! The deal is now finalized and an order has been created.'       => 'offer_dates_accepted_with_order',
        'Offer dates updated successfully.'                                              => 'offer_dates_updated',
        'Dates can only be updated for active or rejected offers.'                       => 'offer_dates_update_status_error',
        'Only negotiating offers can be confirmed'                                       => 'offer_must_be_negotiating',
        'Offer must be accepted before rating'                                           => 'offer_must_be_accepted_for_rating',
        'Date suggestions are only allowed on pending offers'                            => 'offer_suggest_pending_only',
        'Only pending or accepted (within window) offers can be rejected'                => 'offer_reject_status_error',
        'This offer has expired.'                                                        => 'offer_expired',
        'Action failed'                                                                  => 'order_action_failed',
        'Offer action successful'                                                        => 'offer_action_success',
        'Offer accepted, order created'                                                  => 'offer_accepted_order_created',
        'Offer rejected'                                                                 => 'offer_rejected_success',
        'Acceptance retracted. Offer has been rejected.'                                 => 'offer_acceptance_retracted',
        // ── RATINGS ─────────────────────────────────────────────────────────
        'Rating submitted'                                                               => 'offer_rating_submitted',
        'Seller rated successfully!'                                                     => 'seller_rated_success',
        'Buyer rated successfully!'                                                      => 'buyer_rated_success',
        'You already rated this seller.'                                                 => 'already_rated_seller',
        'You have already rated this seller'                                             => 'already_rated_seller',
        'You have already rated this seller for self-delivery.'                          => 'already_rated_seller_self_delivery',
        'You have already rated this buyer'                                              => 'already_rated_buyer',
        'Rating period has expired.'                                                     => 'rating_window_expired',
        'Rating window has expired'                                                      => 'rating_window_expired',
        'Rating must be between 1 and 5'                                                 => 'rating_range_invalid',
        'Failed to save rating'                                                          => 'rating_save_failed',
        'You can only rate the seller after they confirm the safe return of the product.' => 'rating_requires_return_confirmed',
        'Your rating limit has been reached. You get 1 rating opportunity for every 3 unique sellers you contact.' => 'rating_limit_reached',
        // ── ORDERS ──────────────────────────────────────────────────────────
        'Order not found'                                                                => 'order_not_found',
        'Invalid order'                                                                  => 'order_invalid',
        'Order cancelled'                                                                => 'order_cancel_success',
        'Delivery confirmed'                                                             => 'order_delivery_confirmed',
        'Delivery confirmed successfully'                                                => 'delivery_confirmed_success',
        'Review submitted'                                                               => 'order_review_submitted',
        'Review already submitted'                                                       => 'order_review_failed',
        'Only pending orders can be cancelled'                                           => 'order_must_be_pending',
        'Order cannot be confirmed in current status'                                    => 'order_confirm_status_error',
        'Order is not in a payable state'                                                => 'order_not_payable',
        'This order is already paid'                                                     => 'order_already_paid',
        'Failed to create order'                                                         => 'order_create_failed',
        'Order marked as dispatched'                                                     => 'order_dispatched',
        'Order can only be confirmed after dispatching'                                  => 'order_confirm_after_dispatch',
        'Order can only be dispatched after payment is received'                         => 'order_dispatch_after_payment',
        'You can only review after the order is delivered'                               => 'review_requires_delivery',
        'Payment successful! Order confirmed.'                                           => 'payment_order_success',
        // ── PRODUCTS ────────────────────────────────────────────────────────
        'Product not found'                                                              => 'product_not_found',
        'Product not found.'                                                             => 'product_not_found',
        'Product listed successfully. Wait for admin approval.'                          => 'product_upload_success',
        'Category and brand are required'                                                => 'product_fields_required',
        'Product updated successfully'                                                   => 'product_update_success',
        'Edit request submitted. Wait for admin approval.'                               => 'product_edit_pending',
        'Product deleted successfully'                                                   => 'product_delete_success',
        'Product deleted'                                                                => 'product_deleted',
        'Product deleted.'                                                               => 'product_deleted',
        'You have active offers/orders on this product. Complete or cancel them first.'  => 'product_delete_has_active_offers',
        'Cannot delete product with active orders'                                       => 'product_delete_has_orders',
        'Failed to create product'                                                       => 'product_create_failed',
        'Product approved'                                                               => 'product_approved',
        'Product rejected'                                                               => 'product_rejected',
        // ── SELLER ACCOUNT & SUBSCRIPTION ───────────────────────────────────
        'Your account is currently blocked from listing products.'                       => 'seller_blocked_from_listing',
        'Seller privileges restricted'                                                   => 'seller_privileges_restricted',
        'You cannot reject a finalized offer.'                                           => 'offer_reject_finalized_error',
        'You cannot cancel after the rejection window has expired.'                      => 'offer_cancel_window_expired',
        'Rejection window has expired. You can no longer retract this accepted offer.'   => 'rejection_window_expired',
        'Rejection window unavailable for this offer'                                    => 'rejection_window_unavailable',
        'The suggested dates conflict with an existing booking'                          => 'suggested_dates_conflict',
        'No active seller subscription found. Please subscribe to a seller plan to upload products.' => 'seller_subscription_required',
        'Your account is restricted from purchasing seller subscriptions.'               => 'seller_subscription_purchase_blocked',
        'Your seller role has been blocked by the admin. You cannot upload products.'    => 'seller_role_blocked_upload',
        'Your seller role has been restricted by the administrator.'                     => 'seller_role_restricted',
        'Your seller role is currently blocked. Access restricted.'                      => 'seller_role_blocked_access',
        'A delivery photograph is required to confirm delivery'                          => 'delivery_photo_required',
        'A reason is required'                                                           => 'reason_required',
        'Both start and end dates are required'                                          => 'dates_both_required',
        'Failed to initiate payment. Please try again.'                                  => 'payment_initiate_failed',
        // ── BUYER ACCOUNT & SUBSCRIPTION ────────────────────────────────────
        'Your account is restricted from purchasing buyer subscriptions.'                => 'buyer_subscription_purchase_blocked',
        'Your buyer role has been restricted by the administrator.'                      => 'buyer_role_restricted',
        'Your buyer role is currently blocked. Access restricted.'                       => 'buyer_role_blocked_access',
        'Your contact limit has been reached. Please upgrade or renew your plan.'        => 'contact_limit_reached',
        'No active subscription found. Please subscribe to view contact details.'        => 'subscription_required_for_contact',
        'Contact details not viewed.'                                                    => 'contact_not_viewed',
        'You cannot view your own contact'                                               => 'cannot_view_own_contact',
        // ── BLOCKING / REPORTING ─────────────────────────────────────────────
        'You cannot block yourself'                                                      => 'cannot_block_self',
        'You cannot report yourself'                                                     => 'cannot_report_self',
        'Cannot report an admin'                                                         => 'cannot_report_admin',
        'You have already blocked this seller'                                           => 'seller_already_blocked',
        'This seller is not blocked'                                                     => 'seller_not_blocked',
        'Seller blocked successfully'                                                    => 'seller_blocked_success',
        'Seller unblocked successfully'                                                  => 'seller_unblocked_success',
        'You have already reported this user in the past 7 days'                         => 'already_reported_user',
        'Report submitted successfully'                                                  => 'report_submitted_success',
        'Seller not found'                                                               => 'seller_not_found',
        'seller_id and product_id are required'                                          => 'seller_product_id_required',
        // ── COUPONS ──────────────────────────────────────────────────────────
        'Invalid or expired coupon code.'                                                => 'coupon_invalid',
        'Coupon has expired.'                                                            => 'coupon_expired',
        'Coupon usage limit reached.'                                                    => 'coupon_usage_limit',
        'Coupon code is required'                                                        => 'coupon_code_required',
        'Coupon applied!'                                                                => 'coupon_applied_success',
        // ── PLANS & PAYMENTS ─────────────────────────────────────────────────
        'Plan not found'                                                                 => 'plan_not_found',
        'Plan not found or inactive'                                                     => 'plan_not_found_or_inactive',
        'Invalid or inactive plan.'                                                      => 'plan_inactive',
        'Payment initiation failed.'                                                     => 'payment_failed',
        'Payment verified and plans stacked!'                                            => 'payment_success',
        'Payment failed or was cancelled.'                                               => 'payment_failed',
        'Payment is being processed.'                                                    => 'payment_processing',
        'Transaction not found'                                                          => 'transaction_not_found',
        'Already active'                                                                 => 'subscription_already_active',
        'Subscription activated'                                                         => 'subscription_activated',
        'No transaction ID provided'                                                     => 'transaction_id_required',
        // ── MISC BUYER ───────────────────────────────────────────────────────
        'Wishlist updated'                                                               => 'wishlist_update_success',
        'Cart updated'                                                                   => 'cart_update_success',
        'All notifications marked as read'                                               => 'notifications_all_read',
        'Message sent'                                                                   => 'message_sent',
        'Message cannot be empty'                                                        => 'message_empty',
        'Reliability point awarded successfully!'                                        => 'reliability_point_awarded',
        'File too large. Max 10 MB.'                                                     => 'file_too_large',
        'File type not allowed'                                                          => 'file_type_not_allowed',
        'No valid file uploaded'                                                         => 'no_valid_file',
        // ── ADMIN & SUPERADMIN ───────────────────────────────────────────────
        'Settings saved'                                                                 => 'settings_save_success',
        'Settings saved successfully.'                                                   => 'settings_saved_success',
        'Message updated'                                                                => 'settings_message_updated',
        'Message added'                                                                  => 'settings_message_added',
        'Message deleted'                                                                => 'settings_message_deleted',
        'FAQ created'                                                                    => 'faq_save_success',
        'FAQ updated'                                                                    => 'faq_save_success',
        // ── ADDITIONAL VALIDATIONS & MESSAGES ──────────────────────────────────
        'FAQ deleted'                                                                    => 'faq_deleted',
        // ── ADMIN & SUPERADMIN ───────────────────────────────────────────────
        'Plan created'                                                                   => 'plan_create_success',
        'Plan updated'                                                                   => 'plan_update_success',
        'Plan deleted'                                                                   => 'plan_delete_success',
        'Plan activated'                                                                 => 'plan_activate_success',
        'Plan deactivated'                                                               => 'plan_deactivate_success',
        'Plan assigned successfully.'                                                    => 'plan_assigned',
        'Plan marked as premium'                                                         => 'plan_marked_premium',
        'Premium removed'                                                                => 'plan_premium_removed',
        'Marked as Most Selected'                                                        => 'plan_most_selected',
        'Removed Most Selected'                                                          => 'plan_most_selected_removed',
        'Coupon created'                                                                 => 'coupon_create_success',
        'Coupon updated'                                                                 => 'coupon_update_success',
        'Coupon toggled'                                                                 => 'coupon_toggle_success',
        'Coupon deleted'                                                                 => 'coupon_delete_success',
        'Brand created'                                                                  => 'brand_create_success',
        'Brand created successfully.'                                                    => 'brand_create_success',
        'Brand updated.'                                                                 => 'brand_updated',
        'Platform charge created'                                                        => 'charge_create_success',
        'Platform charge updated'                                                        => 'charge_update_success',
        'Platform charge deleted'                                                        => 'charge_delete_success',
        'Charge created.'                                                                => 'charge_create_success',
        'Charge updated.'                                                                => 'charge_update_success',
        'Charge deleted.'                                                                => 'charge_delete_success',
        'Template created'                                                               => 'template_create_success',
        'Template added'                                                                 => 'template_create_success',
        'Template updated'                                                               => 'template_update_success',
        // ── ADDITIONAL VALIDATIONS & MESSAGES ──────────────────────────────────
        'Template deleted'                                                               => 'template_deleted',
        // ── ADMIN & SUPERADMIN ───────────────────────────────────────────────
        'Zone saved successfully'                                                        => 'zone_save_success',
        'Zone saved successfully.'                                                       => 'zone_save_success',
        'Zone deleted successfully'                                                      => 'zone_delete_success',
        'Zone deleted.'                                                                  => 'zone_delete_success',
        'Zone status toggled.'                                                           => 'zone_status_toggled',
        'You are blocked from approvals.'                                                => 'admin_blocked_from_approvals',
        'Your access to user management is restricted.'                                  => 'admin_blocked_from_user_management',
        'Report not found or not assigned to you'                                        => 'report_not_found',
        'Reported user not found'                                                        => 'reported_user_not_found',
        'Report handled successfully'                                                    => 'report_handled_success',
        'Report reassigned'                                                              => 'report_reassigned',
        'Not found'                                                                      => 'not_found_error',
        'Edit request approved and merged.'                                              => 'edit_request_approve_success',
        'Edit request rejected.'                                                         => 'edit_request_reject_success',
        'User suspended successfully.'                                                   => 'user_suspended_success',
        'User activated successfully.'                                                   => 'user_activated_success',
        'Category added.'                                                                => 'category_added',
        'Category updated.'                                                              => 'category_updated',
        'Sub-category added.'                                                            => 'subcategory_added',
        'Sub-category updated.'                                                          => 'subcategory_updated',
        'Gender added.'                                                                  => 'gender_added',
        'Gender updated.'                                                                => 'gender_updated',
        'Color added.'                                                                   => 'color_added',
        'Color updated.'                                                                 => 'color_updated',
        'Listing type added.'                                                            => 'listing_type_added',
        'Listing type updated.'                                                          => 'listing_type_updated',
        'Product type added.'                                                            => 'product_type_added',
        'Product type updated.'                                                          => 'product_type_updated',
        'Item deleted.'                                                                  => 'item_deleted',
        'Status toggled.'                                                                => 'status_toggled',
        'Rule toggled'                                                                   => 'rule_toggled',
        'Original brand added.'                                                          => 'original_brand_added',
        'Original brand updated.'                                                        => 'original_brand_updated',
        'Original brand deleted.'                                                        => 'original_brand_deleted',
        'Original brand activated.'                                                      => 'original_brand_activated',
        'Original brand blocked and products rejected.'                                  => 'original_brand_blocked',
        'Original brand deactivated. Brand name hidden from all products (products are NOT detagged).' => 'original_brand_deactivated',
        'Original brand unblocked. Products restored to their original statuses.'        => 'original_brand_unblocked',
        'Seller brand created and assigned.'                                             => 'seller_brand_created',
        'Seller brand updated.'                                                          => 'seller_brand_updated',
        'Seller brand deleted.'                                                          => 'seller_brand_deleted',
        'Seller brand activated.'                                                        => 'seller_brand_activated',
        'Seller brand blocked and products rejected.'                                    => 'seller_brand_blocked',
        'Seller brand deactivated. Brand name hidden from all products (products are NOT detagged).' => 'seller_brand_deactivated',
        'Seller brand unblocked. Products restored to their original statuses.'          => 'seller_brand_unblocked',
        'Pricing rule created'                                                           => 'pricing_rule_created',
        'Pricing rule updated'                                                           => 'pricing_rule_updated',
        'Pricing rule deleted'                                                           => 'pricing_rule_deleted',
        'Rental rule created'                                                            => 'rental_rule_created',
        'Rental rule updated'                                                            => 'rental_rule_updated',
        'Rental rule deleted'                                                            => 'rental_rule_deleted',
        'Rental rule toggled'                                                            => 'rental_rule_toggled',
        'Admin created successfully.'                                                    => 'admin_created',
        'Admin deleted successfully.'                                                    => 'admin_deleted',
        'Admin suspended.'                                                               => 'admin_suspended',
        'Admin activated.'                                                               => 'admin_activated',
        'Rights updated successfully.'                                                   => 'rights_updated',
        'Advertisement uploaded successfully.'                                           => 'ad_uploaded',
        'Advertisement updated successfully.'                                            => 'ad_updated',
        'Advertisement deleted.'                                                         => 'ad_deleted',
        'CMS page created successfully.'                                                 => 'cms_page_created',
        'CMS page deleted successfully.'                                                 => 'cms_page_deleted',
        'Page saved'                                                                     => 'page_saved',
        'Page updated successfully.'                                                     => 'page_updated',
        'Page not found.'                                                                => 'page_not_found',
        'SEO setting updated successfully.'                                              => 'seo_updated',
        'SEO settings not found for this page'                                           => 'seo_not_found',
        'Error message created successfully'                                             => 'error_message_created',
        'Error message updated successfully'                                             => 'error_message_updated',
        'Error message deleted successfully'                                             => 'error_message_deleted',
        'Profile updated'                                                                => 'profile_updated',
        'Profile image updated'                                                          => 'profile_image_updated',
        'KYC documents uploaded'                                                         => 'kyc_uploaded',
        'Key and value are required'                                                     => 'key_value_required',
        'Message key already exists'                                                     => 'message_key_exists',
        'No data to update'                                                              => 'no_data_to_update',
        'No valid image uploaded'                                                        => 'no_valid_image',
        'Only JPG, PNG, WEBP images are allowed'                                         => 'invalid_image_type',
        'Only super admin can approve system-user uploaded products'                     => 'superadmin_approve_only',
        'Only super admin can reject system-user uploaded products'                      => 'superadmin_reject_only',
        'You are blocked from approving products'                                        => 'admin_blocked_from_product_approval',
        // ── DELIVERY AGENT ───────────────────────────────────────────────────
        'Can only accept assigned deliveries'                                            => 'delivery_accept_assigned_only',
        'Delivery accepted'                                                              => 'delivery_accepted',
        'Marked as picked up'                                                            => 'delivery_picked_up',
        'Marked as delivered'                                                            => 'delivery_marked_delivered',
        'Delivery profile updated'                                                       => 'delivery_profile_updated',
        // ── ADDITIONAL VALIDATIONS & MESSAGES ──────────────────────────────────
        'Maximum {max} bill uploads allowed.'                                            => 'product_max_bills',
        'Email already exists.'                                                          => 'email_already_exists',
        'Mobile number is already used as an alternate mobile by another user.'          => 'alternate_mobile_exists',
        'Name and email are required.'                                                   => 'name_email_required',
        'Admin not found.'                                                               => 'admin_not_found',
        'Email already exists for another user.'                                         => 'email_exists_another_user',
        'Mobile number already exists for another user.'                                 => 'mobile_exists_another_user',
        'Mobile number cannot be the same as the alternate mobile number.'               => 'mobile_same_as_alternate',
        'Admin updated successfully.'                                                    => 'admin_updated_success',
        'Invalid type.'                                                                  => 'invalid_type',
        'Name is required.'                                                              => 'name_required',
        'Listing type with this name already exists.'                                    => 'listing_type_exists',
        'Gender with this name already exists.'                                          => 'gender_exists',
        'Name and listing type are required.'                                            => 'name_listing_type_required',
        'Product type with this name already exists. Product type names must be unique across all listing types.' => 'product_type_exists_global',
        'At least one product type is required.'                                         => 'product_type_required',
        'Category with this name already exists.'                                        => 'category_exists',
        'At least one Category is required.'                                             => 'category_required',
        'Sub-category with this name already exists.'                                    => 'subcategory_exists',
        'Color with this name already exists.'                                           => 'color_exists',
        'Color with this hex code already exists. Hex codes must be unique.'             => 'color_hex_exists',
        'Listing type name cannot be empty.'                                             => 'listing_type_empty',
        'Product type with this name already exists in this listing type.'               => 'product_type_exists',
        'Category name cannot be empty.'                                                 => 'category_empty',
        'Sub-category name cannot be empty.'                                             => 'subcategory_empty',
        'Invalid table.'                                                                 => 'invalid_table',
        'Brand name and Seller are required.'                                            => 'brand_name_seller_required',
        'Brand name already exists. Brand names must be unique.'                         => 'brand_name_exists',
        'Seller already has a brand. Each seller can have only one brand.'               => 'seller_has_brand_already',
        'No data to update.'                                                             => 'no_data_to_update',
        'No brand selected.'                                                             => 'no_brand_selected',
        'User and plan are required.'                                                    => 'user_and_plan_required',
        'Plan not found.'                                                                => 'plan_not_found',
        'Zone name is required.'                                                         => 'zone_name_required',
        'State is required for zone restriction.'                                        => 'state_required_for_zone',
        'Both dates required.'                                                           => 'both_dates_required',
        'Slug and title are required.'                                                   => 'slug_title_required',
        'A page with this slug already exists.'                                          => 'page_slug_exists',
        'Missing ad ID'                                                                  => 'missing_ad_id',
        'Brand name is required.'                                                        => 'brand_name_required',
        'Invalid status.'                                                                => 'invalid_status',
        'Please upload a valid CSV file.'                                                => 'upload_valid_csv_required',
        'Invalid catalogue type.'                                                        => 'invalid_catalogue_type',
        'Failed to read CSV file.'                                                       => 'failed_read_csv',
        'CSV file is empty.'                                                             => 'csv_file_empty',
        'Attribute name is required.'                                                    => 'attribute_name_required',
        'Attribute type is required.'                                                    => 'attribute_type_required',
        'Allowed values are required for picklist type.'                                 => 'allowed_values_required',
        'Attribute added successfully.'                                                  => 'attribute_add_success',
        'Attribute updated successfully.'                                                => 'attribute_update_success',
        'Attribute deleted successfully.'                                                => 'attribute_delete_success',
        'Attribute ID, entity type, and entity ID are required.'                         => 'attribute_assign_fields_required',
        'Attribute is already assigned to this entity.'                                  => 'attribute_already_assigned',
        'Attribute assigned successfully.'                                               => 'attribute_assign_success',
        'Assignment updated successfully.'                                               => 'assignment_update_success',
        'Assignment removed successfully.'                                               => 'assignment_remove_success',
        'Report not found'                                                               => 'report_not_found',
        'Error message not found'                                                        => 'error_message_not_found',
        'Search query is required'                                                       => 'search_query_required',
        'Page name and route path are required.'                                         => 'page_name_route_required',
        'SEO setting for this page route already exists.'                                => 'seo_setting_route_exists',
        'New page SEO setting created successfully.'                                     => 'seo_setting_create_success',
        'SEO setting not found'                                                          => 'seo_setting_not_found',
        'SEO setting deleted successfully.'                                              => 'seo_setting_delete_success',
        'Field name and label are required'                                              => 'validation_field_label_required',
        'Validation rule for this field already exists'                                  => 'validation_rule_exists',
        'Validation rule created successfully'                                           => 'validation_rule_create_success',
        'Validation rule not found'                                                      => 'validation_rule_not_found',
        'Validation rule updated successfully'                                           => 'validation_rule_update_success',
        'Validation rule deleted successfully'                                           => 'validation_rule_delete_success',
        'Failed to load product data for editing'                                        => 'product_load_failed',
        'Gender is required'                                                             => 'gender_required',
        'An unexpected error occurred during upload. Please check your connection.'      => 'upload_unexpected_error',
        'Passwords do not match.'                                                        => 'passwords_do_not_match',
        'Please fix the errors before submitting'                                        => 'please_fix_form_errors',
        'Since the selected parent category has no genders, you must select at least one gender for this sub-category.' => 'subcategory_gender_required',
        'Failed to update taxonomy.'                                                     => 'taxonomy_update_failed',
        'Failed to update. Please try again.'                                            => 'update_failed_retry',
        'Your request failed'                                                            => 'request_failed',
        'Image size exceeds maximum limit of {max}MB. Your image is {size}MB.'           => 'image_size_exceeded',
        'Successfully updated!'                                                          => 'update_success',
        'Upload failed'                                                                  => 'upload_failed',
        'Message value cannot be blank'                                                  => 'message_value_blank',
        'Creating new message keys is not allowed. Message keys are system-defined.'     => 'message_key_create_not_allowed',
        'Deleting message keys is not allowed. Message keys are system-defined.'         => 'message_key_delete_not_allowed',
        'Save settings first'                                                            => 'save_settings_first',
        'Name and value are required'                                                    => 'name_and_value_required',
        'Charge deleted'                                                                 => 'charge_deleted',
        'Failed to delete'                                                               => 'delete_failed',
        'Question and Answer are required'                                               => 'question_and_answer_required',
        'Template text cannot be empty'                                                  => 'template_text_empty',
        'Deleted'                                                                        => 'deleted_success',
        'Status updated'                                                                 => 'status_updated',
        'Failed to update status'                                                        => 'status_update_failed',
        'Your buyer privileges have been restricted by the administrator.'               => 'buyer_privileges_restricted',
        'Your seller privileges have been restricted. Redirecting to browse market.'     => 'seller_privileges_restricted_redirect',
        'Your seller privileges have been restricted by the administrator.'              => 'seller_privileges_restricted',
        // ── SELLER API ───────────────────────────────────────────────────────
        'Date suggestions are only allowed on pending or negotiating offers'             => 'offer_suggest_pending_or_negotiating',
        'Edit request submitted for approval'                                            => 'product_edit_submitted',
        'You already have an active seller subscription. Please wait until it expires or is exhausted before activating a new plan.' => 'seller_sub_already_active',
        'Selling price exceeds the maximum allowed threshold.'                           => 'selling_price_exceeds_threshold',
        'Rental deposit exceeds the maximum allowed threshold.'                          => 'rental_deposit_exceeds_threshold',
        'Daily rental cost exceeds the maximum allowed daily cap.'                       => 'rental_daily_cost_exceeds_cap',
        // ── SHARED API ───────────────────────────────────────────────────────
        'Coupon code already exists. Use a different code.'                              => 'coupon_code_exists',
        'Coupon not found'                                                               => 'coupon_not_found',
        'Update failed: coupon not found after update.'                                  => 'coupon_update_failed',
        'Invalid email address. Please enter a valid email (e.g. example@gmail.com).'    => 'invalid_email_format',
        'Mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9.'     => 'invalid_mobile_format',
        'Alternate mobile number must be a valid 10-digit number starting with 6, 7, 8, or 9.' => 'invalid_alternate_mobile_format',
        'Pin code must be a valid 6-digit number.'                                       => 'invalid_pin_code',
        'Alternate mobile number cannot be the same as primary mobile number.'           => 'alternate_mobile_same_as_primary',
        'Mobile number is already registered by another user.'                           => 'mobile_already_registered',
        'Alternate mobile number is already registered by another user.'                 => 'alternate_mobile_already_registered',
        'Email is already registered by another user.'                                   => 'email_already_registered',
        'Profile updated successfully'                                                   => 'profile_updated_success',
        'No page key or route provided'                                                  => 'no_page_key_or_route',
        // ── SUPER ADMIN API ─────────────────────────────────────────────────
        'Charge name is required.'                                                       => 'charge_name_required',
        'Filter value is required when filter type is selected'                          => 'filter_value_required',
        'Rule not found'                                                                 => 'rule_not_found',
        'Template text is required'                                                      => 'template_text_required',
        'Name, email and password are required.'                                         => 'name_email_password_required',
        'Mobile number already exists.'                                                  => 'mobile_already_exists_admin',
        'assign_to admin id is required for reassign'                                    => 'assign_to_admin_required',
        'Successfully connected to PhonePe! Auth token received.'                        => 'phonepe_connected',
        'Failed to connect to PhonePe. Check your credentials.'                          => 'phonepe_connect_failed',
        'File already processed.'                                                        => 'file_already_processed',
        'Failed to create upload directory on server.'                                   => 'upload_dir_create_failed',
        'Failed to save file on server.'                                                 => 'file_save_failed',
        'Image uploaded.'                                                                => 'image_uploaded',
        // ── FRONTEND — AUTH / HOME ────────────────────────────────────────────
        'Password must be at least 6 characters long.'                                   => 'password_too_short_client',
        'Image upload failed. Please try again.'                                         => 'image_upload_failed',
        'Please verify your account before logging in. Redirecting to verification page...' => 'verify_before_login',
        'Password reset successfully! Please log in with your new password.'             => 'password_reset_success_client',
        // ── FRONTEND — OFFERS / ORDERS ────────────────────────────────────────
        'Rating submitted successfully!'                                                 => 'rating_submitted_success',
        'Offer sent successfully!'                                                       => 'offer_sent_success_client',
        'Offer updated successfully!'                                                    => 'offer_updated_success',
        'Please fill in your delivery address and pin code.'                             => 'delivery_address_required',
        'Rental dates updated successfully!'                                             => 'rental_dates_updated',
        'Please select both start and end dates.'                                        => 'select_both_dates',
        'Date suggestion sent to buyer!'                                                 => 'date_suggestion_sent',
        'Dates accepted! Deal is finalized.'                                             => 'dates_accepted_finalized',
        'Delivery confirmed!'                                                            => 'delivery_confirmed_client',
        'Review submitted successfully!'                                                 => 'review_submitted_success',
        // ── FRONTEND — PRODUCTS ───────────────────────────────────────────────
        'Product deleted successfully.'                                                  => 'product_deleted_success',
        'Product approved!'                                                              => 'product_approved_client',
        'Edit request approved and merged!'                                              => 'edit_request_approved',
        'Products deleted'                                                               => 'products_deleted_bulk',
        // ── FRONTEND — WISHLIST / CART ────────────────────────────────────────
        'Removed from wishlist'                                                          => 'removed_from_wishlist',
        'Added to wishlist'                                                              => 'added_to_wishlist',
        'Moved to wishlist'                                                              => 'moved_to_wishlist',
        'Removed from wishlist.'                                                         => 'removed_from_wishlist_dot',
        'Item moved to cart!'                                                            => 'item_moved_to_cart',
        // ── FRONTEND — ADMIN MANAGEMENT ──────────────────────────────────────
        'Admin deleted successfully'                                                     => 'admin_deleted_success',
        'Administrator created!'                                                         => 'admin_created_success',
        'Administrator updated!'                                                         => 'admin_update_success_client',
        // ── FRONTEND — ADVERTISEMENTS ─────────────────────────────────────────
        'File too large. Maximum allowed size is 100MB.'                                 => 'file_too_large',
        'Advertisement deleted'                                                          => 'ad_deleted_client',
        // ── FRONTEND — APP MESSAGES ────────────────────────────────────────────
        'Failed to load messages'                                                        => 'app_messages_load_failed',
        'Message updated successfully!'                                                  => 'app_messages_update_success',
        // ── FRONTEND — BRANDS ──────────────────────────────────────────────────
        'Brand blocked and all products rejected.'                                       => 'brand_blocked',
        'Brand unblocked — products restored to pending review.'                       => 'brand_unblocked',
        'Brand updated successfully.'                                                    => 'brand_updated_success',
        'Brand deleted successfully.'                                                    => 'brand_deleted_success',
        'Brand created successfully!'                                                    => 'brand_created_success',
        'Products tagged to brand successfully!'                                         => 'products_tagged_success',
        'Please select at least one listing type'                                        => 'select_at_least_one_listing_type',
        'Error creating brand'                                                           => 'brand_create_error',
        'Brand updated successfully!'                                                    => 'brand_updated_success_alt',
        'Error updating brand'                                                           => 'brand_update_error',
        'Brand deleted successfully'                                                     => 'brand_deleted_success_alt',
        'Error deleting brand'                                                           => 'brand_delete_error',
        'Brand created!'                                                                 => 'brand_create_fallback',
        // ── FRONTEND — SETTINGS ────────────────────────────────────────────────
        'Settings saved successfully!'                                                   => 'settings_saved_success',
        'Please select both from and to dates'                                           => 'select_both_from_to_dates',
        // ── FRONTEND — SUBSCRIPTIONS ──────────────────────────────────────────
        'Subscription assigned successfully!'                                            => 'subscription_assigned_success',
        'Base Original price cannot be less than Final price.'                           => 'base_price_less_than_final',
        'Duration Hours cannot be zero or empty for a Duration Based plan.'              => 'duration_hours_required',
        // ── FRONTEND — CMS ─────────────────────────────────────────────────────
        'CMS Page created successfully!'                                                 => 'cms_page_created_client',
        'CMS Page updated successfully!'                                                 => 'cms_page_updated_client',
        'Page deleted'                                                                   => 'page_deleted_client',
        // ── FRONTEND — PROFILE ──────────────────────────────────────────────────
        'Profile updated successfully!'                                                  => 'profile_updated_client',
        'Profile image updated!'                                                         => 'profile_image_updated_client',
        'KYC documents uploaded successfully!'                                           => 'kyc_uploaded_client',
        // ── FRONTEND — SEO ─────────────────────────────────────────────────────
        'SEO settings updated successfully!'                                             => 'seo_updated_client',
        'New page SEO configuration created successfully!'                               => 'seo_created_client',
        // ── FRONTEND — TAXONOMY (client-side validation) ─────────────────────
        'Listing Type is required'                                                       => 'listing_type_required',
        'At least one Product Type is required'                                          => 'product_type_min_required',
        'At least one Category is required'                                              => 'category_min_required',
        'Allowed values are required for Picklist type'                                  => 'picklist_allowed_values_required',
        'Please select at least one entity type (Listing Type, Category, or Sub-Category)' => 'entity_type_required',
        'Please select at least one Listing Type'                                        => 'listing_type_min_required',
        'Please select at least one Category'                                            => 'category_select_required',
        'Please select at least one Sub-Category'                                        => 'subcategory_select_required',
        // ── FRONTEND — USERS / ZONES ──────────────────────────────────────────
        'Role access updated'                                                            => 'role_access_updated',
        'Geolocation not supported'                                                      => 'geolocation_not_supported',
        'Please select a location via the map first'                                     => 'select_location_first',
        'Zone saved successfully!'                                                       => 'zone_saved_success',
        'No polygon data for this zone'                                                  => 'no_polygon_data',
        // ── FRONTEND — REWARDS / ENDORSEMENTS ────────────────────────────────
        'Endorsement submitted successfully!'                                            => 'endorsement_submitted',
        'Reward sent successfully!'                                                      => 'reward_sent_success',
        // ── FRONTEND — AUTH FALLBACK ──────────────────────────────────────────
        'Login failed. Please check your credentials.'                                   => 'login_failed_client',
        'At least one product image is required'                                         => 'product_images_required',
        'Session expired. Please login again.'                                           => 'session_expired',
        'Please login first'                                                             => 'please_login_first',
        'No token provided'                                                              => 'jwt_no_token',
        'Invalid or expired token'                                                       => 'jwt_invalid_token',
        'System is currently locked by administration. Only Superadmin access is permitted.' => 'system_locked_error',
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
            } elseif ($key === 'errors' && is_array($value)) {
                foreach ($value as $errKey => $errVal) {
                    if (is_string($errVal)) {
                        $value[$errKey] = $this->translateMessage($errVal);
                    } elseif (is_array($errVal)) {
                        $value[$errKey] = $this->translateResponseData($errVal);
                    }
                }
                $data[$key] = $value;
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

    /**
     * Recalibrates the start and end dates of queued subscriptions for a user when their active plan changes or is depleted.
     * This is useful to pull forward queued plans when a quantity-based plan is fully used.
     */
    protected function recalibrateUserSubscriptions($userId, $userType)
    {
        $db = \Config\Database::connect();
        
        // 1. Get all active, paid, and non-expired subscriptions for this user and type
        $subs = $db->table('user_subscriptions us')
            ->select('us.*, sp.duration_hours, sp.plan_type')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->where('us.user_id', $userId)
            ->where('us.is_active', 1)
            ->where('us.payment_status', 'paid')
            ->where('sp.user_type', $userType)
            ->where('us.expires_at >=', date('Y-m-d H:i:s'))
            ->orderBy('us.starts_at', 'ASC')
            ->orderBy('us.id', 'ASC')
            ->get()->getResultArray();

        if (empty($subs)) {
            return;
        }

        $currentTime = time();
        $baseTime = $currentTime; // starts_at for the first queued plan we pull forward
        
        $updatedExpiry = null;

        foreach ($subs as $index => $sub) {
            $startsAtTime = strtotime($sub['starts_at']);
            $expiresAtTime = strtotime($sub['expires_at']);
            
            if ($index === 0) {
                if ($startsAtTime > $currentTime) {
                    // This plan was queued in the future! Pull it forward to start now.
                    $newStartsAt = date('Y-m-d H:i:s', $currentTime);
                    $durationHours = (float) $sub['duration_hours'];
                    
                    // Check if it's a lifetime plan (expires_at is 2099-12-31)
                    $isLifetime = ($sub['expires_at'] === '2099-12-31 23:59:59' || $durationHours <= 0);
                    $newExpiresAt = $isLifetime 
                        ? '2099-12-31 23:59:59' 
                        : date('Y-m-d H:i:s', $currentTime + (int)round($durationHours * 3600));

                    $db->table('user_subscriptions')->where('id', $sub['id'])->update([
                        'starts_at' => $newStartsAt,
                        'expires_at' => $newExpiresAt,
                        'updated_at' => date('Y-m-d H:i:s')
                    ]);
                    
                    $baseTime = $isLifetime ? strtotime('2099-12-31 23:59:59') : ($currentTime + (int)round($durationHours * 3600));
                    $updatedExpiry = $newExpiresAt;
                } else {
                    // It's already running. Keep its current expires_at as the base time for any subsequent queued plans.
                    $baseTime = $expiresAtTime;
                    $updatedExpiry = $sub['expires_at'];
                }
            } else {
                // For subsequent stacked plans: start exactly when the previous one expires.
                $newStartsAt = date('Y-m-d H:i:s', $baseTime);
                $durationHours = (float) $sub['duration_hours'];
                $newBase = $baseTime;
                
                $isLifetime = ($sub['expires_at'] === '2099-12-31 23:59:59' || $durationHours <= 0);
                $newExpiresAt = $isLifetime
                    ? '2099-12-31 23:59:59'
                    : date('Y-m-d H:i:s', $newBase + (int)round($durationHours * 3600));

                $db->table('user_subscriptions')->where('id', $sub['id'])->update([
                    'starts_at' => $newStartsAt,
                    'expires_at' => $newExpiresAt,
                    'updated_at' => date('Y-m-d H:i:s')
                ]);

                $baseTime = $isLifetime ? strtotime('2099-12-31 23:59:59') : ($newBase + (int)round($durationHours * 3600));
                
                if ($newExpiresAt > $updatedExpiry) {
                    $updatedExpiry = $newExpiresAt;
                }
            }
        }
        
        // 2. Synchronize the `users` table fields: `subscription_tier` and `subscription_expires_at`
        $latestOverall = $db->table('user_subscriptions us')
            ->select('us.expires_at, sp.name')
            ->join('subscription_plans sp', 'sp.id = us.plan_id')
            ->where('us.user_id', $userId)
            ->where('us.is_active', 1)
            ->where('us.payment_status', 'paid')
            ->where('us.expires_at >=', date('Y-m-d H:i:s'))
            ->orderBy('us.expires_at', 'DESC')
            ->get()->getRowArray();
            
        if ($latestOverall) {
            $db->table('users')->where('id', $userId)->update([
                'subscription_tier' => $latestOverall['name'],
                'subscription_expires_at' => $latestOverall['expires_at'],
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        } else {
            $db->table('users')->where('id', $userId)->update([
                'subscription_tier' => 'Free',
                'subscription_expires_at' => null,
                'updated_at' => date('Y-m-d H:i:s')
            ]);
        }
    }
}
