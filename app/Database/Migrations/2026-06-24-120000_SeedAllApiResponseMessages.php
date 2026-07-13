<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Seeds every API response message key used by BaseApiController::$messageKeyMap
 * into the app_messages table. This is safe to run multiple times – existing
 * rows are skipped.
 */
class SeedAllApiResponseMessages extends Migration
{
    private array $messages = [

        // ── AUTH & ACCOUNT ──────────────────────────────────────────────────
        ['message_key' => 'login_fields_required',        'message_value' => 'Email and password are required',                              'category' => 'error'],
        ['message_key' => 'login_failed',                 'message_value' => 'Invalid email or password',                                    'category' => 'error'],
        ['message_key' => 'account_blocked_admin',        'message_value' => 'Your account has been blocked by admin',                       'category' => 'error'],
        ['message_key' => 'buyer_role_blocked',           'message_value' => 'Your buyer role has been blocked by admin',                    'category' => 'error'],
        ['message_key' => 'seller_role_blocked',          'message_value' => 'Your seller role has been blocked by admin',                   'category' => 'error'],
        ['message_key' => 'account_roles_blocked',        'message_value' => 'Your account roles have been blocked by admin',                'category' => 'error'],
        ['message_key' => 'login_success',                'message_value' => 'Login successful',                                             'category' => 'success'],
        ['message_key' => 'email_required',               'message_value' => 'Email is required',                                            'category' => 'error'],
        ['message_key' => 'email_not_found',              'message_value' => 'No account found with this email',                             'category' => 'error'],
        ['message_key' => 'account_blocked',              'message_value' => 'Your account has been blocked',                                'category' => 'error'],
        ['message_key' => 'otp_send_success',             'message_value' => 'OTP sent to your email',                                       'category' => 'success'],
        ['message_key' => 'otp_verify_fields_required',   'message_value' => 'Email and OTP are required',                                   'category' => 'error'],
        ['message_key' => 'otp_verify_failed',            'message_value' => 'Invalid or expired OTP',                                       'category' => 'error'],
        ['message_key' => 'otp_verify_success',           'message_value' => 'OTP verified successfully',                                    'category' => 'success'],
        ['message_key' => 'password_reset_otp_sent',      'message_value' => 'Password reset OTP sent to your email',                        'category' => 'success'],
        ['message_key' => 'password_reset_fields_required','message_value' => 'Email, OTP, and new password are required',                   'category' => 'error'],
        ['message_key' => 'password_too_short',           'message_value' => 'Password must be at least 6 characters long',                  'category' => 'error'],
        ['message_key' => 'password_reset_success',       'message_value' => 'Password reset successfully. You can now login with your new password.', 'category' => 'success'],
        ['message_key' => 'password_update_failed',       'message_value' => 'Failed to update password. Please try again.',                 'category' => 'error'],
        ['message_key' => 'validation_failed',            'message_value' => 'Validation failed',                                            'category' => 'error'],
        ['message_key' => 'email_already_exists_role',    'message_value' => 'This email is already registered with the selected role.',     'category' => 'error'],
        ['message_key' => 'account_upgraded_success',     'message_value' => 'Account upgraded successfully. OTP sent to your email.',       'category' => 'success'],
        ['message_key' => 'mobile_already_exists',        'message_value' => 'Mobile number already registered',                             'category' => 'error'],
        ['message_key' => 'register_failed',              'message_value' => 'Registration failed',                                          'category' => 'error'],
        ['message_key' => 'register_success',             'message_value' => 'Registration successful. OTP sent to your email.',             'category' => 'success'],
        ['message_key' => 'role_switch_not_allowed',      'message_value' => 'Role switching not allowed',                                   'category' => 'error'],
        ['message_key' => 'auth_login_required',          'message_value' => 'Unauthorized',                                                 'category' => 'error'],
        ['message_key' => 'user_not_found',               'message_value' => 'User not found',                                               'category' => 'error'],
        ['message_key' => 'invalid_role',                 'message_value' => 'Invalid role',                                                 'category' => 'error'],
        ['message_key' => 'google_credential_required',   'message_value' => 'Google credential is required',                                'category' => 'error'],
        ['message_key' => 'google_token_invalid',         'message_value' => 'Invalid Google token',                                         'category' => 'error'],
        ['message_key' => 'google_token_parse_failed',    'message_value' => 'Failed to parse Google token',                                 'category' => 'error'],

        // ── OFFERS & BUYER ──────────────────────────────────────────────────
        ['message_key' => 'product_not_found_or_unavailable', 'message_value' => 'Product not found or currently unavailable',               'category' => 'error'],
        ['message_key' => 'buyer_blocked_from_offers',    'message_value' => 'Your account is currently blocked from making offers as a buyer.', 'category' => 'error'],
        ['message_key' => 'seller_blocked_from_offers',   'message_value' => 'This seller is currently blocked and cannot receive offers.',   'category' => 'error'],
        ['message_key' => 'cannot_offer_own_product',     'message_value' => 'Cannot make offer on your own product',                        'category' => 'error'],
        ['message_key' => 'offer_dates_required',         'message_value' => 'Rental start and end dates are required',                      'category' => 'error'],
        ['message_key' => 'rental_dates_required',        'message_value' => 'Start and end dates are required for rental products.',         'category' => 'error'],
        ['message_key' => 'overlap_dates_offer_exists',   'message_value' => 'You already have an active offer overlapping with these dates.','category' => 'error'],
        ['message_key' => 'active_offer_already_exists',  'message_value' => 'You already have an active offer on this product.',             'category' => 'error'],
        ['message_key' => 'buyer_subscription_required',  'message_value' => 'You need an active buyer subscription to make offers. Please subscribe to a buyer plan.', 'category' => 'error'],
        ['message_key' => 'seller_cannot_make_offer',      'message_value' => 'Sellers cannot make offers on products. Please use your buyer account to make offers.', 'category' => 'error'],
        ['message_key' => 'rental_min_days_error',        'message_value' => 'Minimum rental period is {min} days. You selected {selected} day(s).', 'category' => 'error'],
        ['message_key' => 'booking_conflict',             'message_value' => 'This product already has an active offer for the selected dates. Please choose different dates.', 'category' => 'error'],
        ['message_key' => 'booking_dates_conflict',       'message_value' => 'The selected dates conflict with an existing booking.',         'category' => 'error'],
        ['message_key' => 'offer_sent_success',           'message_value' => 'Offer submitted successfully',                                  'category' => 'success'],
        ['message_key' => 'offer_not_found',              'message_value' => 'Offer not found',                                               'category' => 'error'],
        ['message_key' => 'offer_not_found_or_denied',    'message_value' => 'Offer not found or permission denied',                          'category' => 'error'],
        ['message_key' => 'offer_invalid',                'message_value' => 'Invalid offer',                                                 'category' => 'error'],
        ['message_key' => 'offer_status_not_pending',     'message_value' => 'Offer status is not pending',                                   'category' => 'error'],
        ['message_key' => 'offer_update_success',         'message_value' => 'Offer updated successfully',                                    'category' => 'success'],
        ['message_key' => 'action_not_allowed',           'message_value' => 'Action not allowed',                                            'category' => 'error'],
        ['message_key' => 'offer_cancelled_success',      'message_value' => 'Offer cancelled successfully.',                                 'category' => 'success'],
        ['message_key' => 'offer_cancel_success',         'message_value' => 'Offer cancelled',                                               'category' => 'success'],
        ['message_key' => 'offer_cancel_not_allowed',     'message_value' => 'This offer can no longer be cancelled',                         'category' => 'error'],
        ['message_key' => 'offer_address_required',       'message_value' => 'Address and pin code are required for delivery',                'category' => 'error'],
        ['message_key' => 'offer_suggestion_sent',        'message_value' => 'Date suggestion sent to buyer',                                 'category' => 'success'],
        ['message_key' => 'offer_dates_accepted',         'message_value' => 'Dates accepted',                                                'category' => 'success'],
        ['message_key' => 'offer_dates_accepted_with_order', 'message_value' => 'Dates accepted! The deal is now finalized and an order has been created.', 'category' => 'success'],
        ['message_key' => 'offer_dates_updated',          'message_value' => 'Offer dates updated successfully.',                             'category' => 'success'],
        ['message_key' => 'offer_dates_update_status_error', 'message_value' => 'Dates can only be updated for active or rejected offers.',   'category' => 'error'],
        ['message_key' => 'offer_must_be_negotiating',    'message_value' => 'Only negotiating offers can be confirmed',                      'category' => 'error'],
        ['message_key' => 'offer_must_be_accepted_for_rating', 'message_value' => 'Offer must be accepted before rating',                     'category' => 'error'],
        ['message_key' => 'offer_suggest_pending_only',   'message_value' => 'Date suggestions are only allowed on pending offers',           'category' => 'error'],
        ['message_key' => 'offer_reject_status_error',    'message_value' => 'Only pending or accepted (within window) offers can be rejected', 'category' => 'error'],
        ['message_key' => 'offer_expired',                'message_value' => 'This offer has expired.',                                       'category' => 'error'],
        ['message_key' => 'offer_action_success',         'message_value' => 'Offer action completed successfully!',                          'category' => 'success'],
        ['message_key' => 'offer_accepted_order_created', 'message_value' => 'Offer accepted, order created',                                 'category' => 'success'],
        ['message_key' => 'offer_rejected_success',       'message_value' => 'Offer rejected',                                                'category' => 'success'],
        ['message_key' => 'offer_acceptance_retracted',   'message_value' => 'Acceptance retracted. Offer has been rejected.',                 'category' => 'success'],

        // ── RATINGS ─────────────────────────────────────────────────────────
        ['message_key' => 'offer_rating_submitted',       'message_value' => 'Rating submitted successfully!',                                'category' => 'success'],
        ['message_key' => 'seller_rated_success',         'message_value' => 'Seller rated successfully!',                                    'category' => 'success'],
        ['message_key' => 'buyer_rated_success',          'message_value' => 'Buyer rated successfully!',                                     'category' => 'success'],
        ['message_key' => 'already_rated_seller',         'message_value' => 'You have already rated this seller.',                           'category' => 'error'],
        ['message_key' => 'already_rated_seller_self_delivery', 'message_value' => 'You have already rated this seller for self-delivery.',   'category' => 'error'],
        ['message_key' => 'already_rated_buyer',          'message_value' => 'You have already rated this buyer',                             'category' => 'error'],
        ['message_key' => 'rating_window_expired',        'message_value' => 'Rating window has expired',                                     'category' => 'error'],
        ['message_key' => 'rating_range_invalid',         'message_value' => 'Rating must be between 1 and 5',                                'category' => 'error'],
        ['message_key' => 'rating_save_failed',           'message_value' => 'Failed to save rating',                                         'category' => 'error'],
        ['message_key' => 'rating_requires_return_confirmed', 'message_value' => 'You can only rate the seller after they confirm the safe return of the product.', 'category' => 'error'],
        ['message_key' => 'rating_limit_reached',         'message_value' => 'Your rating limit has been reached. You get 1 rating opportunity for every 3 unique sellers you contact.', 'category' => 'error'],

        // ── ORDERS ──────────────────────────────────────────────────────────
        ['message_key' => 'order_not_found',              'message_value' => 'Order not found',                                               'category' => 'error'],
        ['message_key' => 'order_invalid',                'message_value' => 'Invalid order',                                                 'category' => 'error'],
        ['message_key' => 'order_cancel_success',         'message_value' => 'Order cancelled',                                               'category' => 'success'],
        ['message_key' => 'order_delivery_confirmed',     'message_value' => 'Delivery confirmed',                                            'category' => 'success'],
        ['message_key' => 'delivery_confirmed_success',   'message_value' => 'Delivery confirmed successfully',                               'category' => 'success'],
        ['message_key' => 'order_review_submitted',       'message_value' => 'Review submitted',                                              'category' => 'success'],
        ['message_key' => 'order_review_failed',          'message_value' => 'Review already submitted',                                      'category' => 'error'],
        ['message_key' => 'order_must_be_pending',        'message_value' => 'Only pending orders can be cancelled',                          'category' => 'error'],
        ['message_key' => 'order_confirm_status_error',   'message_value' => 'Order cannot be confirmed in current status',                   'category' => 'error'],
        ['message_key' => 'order_not_payable',            'message_value' => 'Order is not in a payable state',                               'category' => 'error'],
        ['message_key' => 'order_already_paid',           'message_value' => 'This order is already paid',                                    'category' => 'error'],
        ['message_key' => 'order_create_failed',          'message_value' => 'Failed to create order',                                        'category' => 'error'],
        ['message_key' => 'order_dispatched',             'message_value' => 'Order marked as dispatched',                                    'category' => 'success'],
        ['message_key' => 'order_confirm_after_dispatch', 'message_value' => 'Order can only be confirmed after dispatching',                  'category' => 'error'],
        ['message_key' => 'order_dispatch_after_payment', 'message_value' => 'Order can only be dispatched after payment is received',         'category' => 'error'],
        ['message_key' => 'review_requires_delivery',     'message_value' => 'You can only review after the order is delivered',              'category' => 'error'],
        ['message_key' => 'order_action_failed',          'message_value' => 'Action failed',                                                 'category' => 'error'],
        ['message_key' => 'payment_order_success',        'message_value' => 'Payment successful! Order confirmed.',                           'category' => 'success'],

        // ── PRODUCTS ────────────────────────────────────────────────────────
        ['message_key' => 'product_not_found',            'message_value' => 'Product not found',                                             'category' => 'error'],
        ['message_key' => 'product_upload_success',       'message_value' => 'Product listed successfully. Wait for admin approval.',          'category' => 'success'],
        ['message_key' => 'product_fields_required',      'message_value' => 'Category and brand are required',                               'category' => 'error'],
        ['message_key' => 'product_update_success',       'message_value' => 'Product updated successfully',                                  'category' => 'success'],
        ['message_key' => 'product_edit_pending',         'message_value' => 'Edit request submitted. Wait for admin approval.',               'category' => 'success'],
        ['message_key' => 'product_delete_success',       'message_value' => 'Product deleted successfully',                                  'category' => 'success'],
        ['message_key' => 'product_deleted',              'message_value' => 'Product deleted',                                               'category' => 'success'],
        ['message_key' => 'product_delete_has_active_offers', 'message_value' => 'You have active offers/orders on this product. Complete or cancel them first.', 'category' => 'error'],
        ['message_key' => 'product_delete_has_orders',    'message_value' => 'Cannot delete product with active orders',                      'category' => 'error'],
        ['message_key' => 'product_create_failed',        'message_value' => 'Failed to create product',                                      'category' => 'error'],
        ['message_key' => 'product_approved',             'message_value' => 'Product approved',                                              'category' => 'success'],
        ['message_key' => 'product_rejected',             'message_value' => 'Product rejected',                                              'category' => 'success'],

        // ── SELLER ACCOUNT & SUBSCRIPTION ───────────────────────────────────
        ['message_key' => 'seller_blocked_from_listing',  'message_value' => 'Your account is currently blocked from listing products.',       'category' => 'error'],
        ['message_key' => 'seller_privileges_restricted', 'message_value' => 'Seller privileges restricted',                                   'category' => 'error'],
        ['message_key' => 'offer_reject_finalized_error', 'message_value' => 'You cannot reject a finalized offer.',                           'category' => 'error'],
        ['message_key' => 'offer_cancel_window_expired',  'message_value' => 'You cannot cancel after the rejection window has expired.',       'category' => 'error'],
        ['message_key' => 'rejection_window_expired',     'message_value' => 'Rejection window has expired. You can no longer retract this accepted offer.', 'category' => 'error'],
        ['message_key' => 'rejection_window_unavailable', 'message_value' => 'Rejection window unavailable for this offer',                    'category' => 'error'],
        ['message_key' => 'suggested_dates_conflict',     'message_value' => 'The suggested dates conflict with an existing booking',           'category' => 'error'],
        ['message_key' => 'seller_subscription_required', 'message_value' => 'No active seller subscription found. Please subscribe to a seller plan to upload products.', 'category' => 'error'],
        ['message_key' => 'seller_subscription_purchase_blocked', 'message_value' => 'Your account is restricted from purchasing seller subscriptions.', 'category' => 'error'],
        ['message_key' => 'seller_role_blocked_upload',   'message_value' => 'Your seller role has been blocked by the admin. You cannot upload products.', 'category' => 'error'],
        ['message_key' => 'seller_role_restricted',       'message_value' => 'Your seller role has been restricted by the administrator.',      'category' => 'error'],
        ['message_key' => 'seller_role_blocked_access',   'message_value' => 'Your seller role is currently blocked. Access restricted.',       'category' => 'error'],
        ['message_key' => 'delivery_photo_required',      'message_value' => 'A delivery photograph is required to confirm delivery',            'category' => 'error'],
        ['message_key' => 'reason_required',              'message_value' => 'A reason is required',                                            'category' => 'error'],
        ['message_key' => 'dates_both_required',          'message_value' => 'Both start and end dates are required',                           'category' => 'error'],
        ['message_key' => 'date_end_before_start',        'message_value' => 'End date must be after start date',                               'category' => 'error'],
        ['message_key' => 'payment_initiate_failed',      'message_value' => 'Failed to initiate payment. Please try again.',                   'category' => 'error'],

        // ── BUYER ACCOUNT & SUBSCRIPTION ────────────────────────────────────
        ['message_key' => 'buyer_subscription_purchase_blocked', 'message_value' => 'Your account is restricted from purchasing buyer subscriptions.', 'category' => 'error'],
        ['message_key' => 'buyer_role_restricted',        'message_value' => 'Your buyer role has been restricted by the administrator.',        'category' => 'error'],
        ['message_key' => 'buyer_role_blocked_access',    'message_value' => 'Your buyer role is currently blocked. Access restricted.',          'category' => 'error'],
        ['message_key' => 'contact_limit_reached',        'message_value' => 'Your contact limit has been reached. Please upgrade or renew your plan.', 'category' => 'error'],
        ['message_key' => 'subscription_required_for_contact', 'message_value' => 'No active subscription found. Please subscribe to view contact details.', 'category' => 'error'],
        ['message_key' => 'contact_not_viewed',           'message_value' => 'Contact details not viewed.',                                     'category' => 'error'],
        ['message_key' => 'cannot_view_own_contact',      'message_value' => 'You cannot view your own contact',                                'category' => 'error'],

        // ── BLOCKING / REPORTING ─────────────────────────────────────────────
        ['message_key' => 'cannot_block_self',            'message_value' => 'You cannot block yourself',                                       'category' => 'error'],
        ['message_key' => 'cannot_report_self',           'message_value' => 'You cannot report yourself',                                      'category' => 'error'],
        ['message_key' => 'cannot_report_admin',          'message_value' => 'Cannot report an admin',                                          'category' => 'error'],
        ['message_key' => 'seller_already_blocked',       'message_value' => 'You have already blocked this seller',                            'category' => 'error'],
        ['message_key' => 'seller_not_blocked',           'message_value' => 'This seller is not blocked',                                      'category' => 'error'],
        ['message_key' => 'seller_blocked_success',       'message_value' => 'Seller blocked successfully',                                     'category' => 'success'],
        ['message_key' => 'seller_unblocked_success',     'message_value' => 'Seller unblocked successfully',                                   'category' => 'success'],
        ['message_key' => 'already_reported_user',        'message_value' => 'You have already reported this user in the past 7 days',          'category' => 'error'],
        ['message_key' => 'report_submitted_success',     'message_value' => 'Report submitted successfully',                                   'category' => 'success'],
        ['message_key' => 'seller_not_found',             'message_value' => 'Seller not found',                                                'category' => 'error'],
        ['message_key' => 'seller_product_id_required',   'message_value' => 'seller_id and product_id are required',                           'category' => 'error'],

        // ── COUPONS ──────────────────────────────────────────────────────────
        ['message_key' => 'coupon_invalid',               'message_value' => 'Invalid or expired coupon code.',                                 'category' => 'error'],
        ['message_key' => 'coupon_expired',               'message_value' => 'Coupon has expired.',                                             'category' => 'error'],
        ['message_key' => 'coupon_usage_limit',           'message_value' => 'Coupon usage limit reached.',                                     'category' => 'error'],
        ['message_key' => 'coupon_code_required',         'message_value' => 'Coupon code is required',                                         'category' => 'error'],
        ['message_key' => 'coupon_applied_success',       'message_value' => 'Coupon applied!',                                                 'category' => 'success'],

        // ── PLANS & PAYMENTS ─────────────────────────────────────────────────
        ['message_key' => 'plan_not_found',               'message_value' => 'Plan not found',                                                  'category' => 'error'],
        ['message_key' => 'plan_not_found_or_inactive',   'message_value' => 'Plan not found or inactive',                                      'category' => 'error'],
        ['message_key' => 'plan_inactive',                'message_value' => 'Invalid or inactive plan.',                                        'category' => 'error'],
        ['message_key' => 'payment_failed',               'message_value' => 'Payment failed or was cancelled.',                                 'category' => 'error'],
        ['message_key' => 'payment_success',              'message_value' => 'Payment verified and plans stacked!',                              'category' => 'success'],
        ['message_key' => 'payment_processing',           'message_value' => 'Payment is being processed.',                                     'category' => 'info'],
        ['message_key' => 'transaction_not_found',        'message_value' => 'Transaction not found',                                            'category' => 'error'],
        ['message_key' => 'subscription_already_active',  'message_value' => 'Subscription is already active',                                  'category' => 'info'],
        ['message_key' => 'subscription_activated',       'message_value' => 'Subscription activated',                                          'category' => 'success'],
        ['message_key' => 'transaction_id_required',      'message_value' => 'No transaction ID provided',                                       'category' => 'error'],

        // ── MISC BUYER ───────────────────────────────────────────────────────
        ['message_key' => 'wishlist_update_success',      'message_value' => 'Wishlist updated',                                                'category' => 'success'],
        ['message_key' => 'cart_update_success',          'message_value' => 'Cart updated',                                                    'category' => 'success'],
        ['message_key' => 'notifications_all_read',       'message_value' => 'All notifications marked as read',                                'category' => 'success'],
        ['message_key' => 'message_sent',                 'message_value' => 'Message sent',                                                    'category' => 'success'],
        ['message_key' => 'message_empty',                'message_value' => 'Message cannot be empty',                                         'category' => 'error'],
        ['message_key' => 'reliability_point_awarded',    'message_value' => 'Reliability point awarded successfully!',                          'category' => 'success'],
        ['message_key' => 'file_too_large',               'message_value' => 'File too large. Max 10 MB.',                                      'category' => 'error'],
        ['message_key' => 'file_type_not_allowed',        'message_value' => 'File type not allowed',                                           'category' => 'error'],
        ['message_key' => 'no_valid_file',                'message_value' => 'No valid file uploaded',                                          'category' => 'error'],
        ['message_key' => 'seller_rated_success',         'message_value' => 'Seller rated successfully!',                                      'category' => 'success'],
        ['message_key' => 'buyer_rated_success',          'message_value' => 'Buyer rated successfully!',                                       'category' => 'success'],

        // ── ADMIN & SUPERADMIN ───────────────────────────────────────────────
        ['message_key' => 'settings_save_success',        'message_value' => 'Settings saved',                                                  'category' => 'success'],
        ['message_key' => 'settings_saved_success',       'message_value' => 'Settings saved successfully.',                                    'category' => 'success'],
        ['message_key' => 'settings_message_updated',     'message_value' => 'Message updated',                                                 'category' => 'success'],
        ['message_key' => 'settings_message_added',       'message_value' => 'Message added',                                                   'category' => 'success'],
        ['message_key' => 'settings_message_deleted',     'message_value' => 'Message deleted',                                                 'category' => 'success'],
        ['message_key' => 'faq_save_success',             'message_value' => 'FAQ saved',                                                       'category' => 'success'],
        ['message_key' => 'faq_delete_success',           'message_value' => 'FAQ deleted',                                                     'category' => 'success'],
        ['message_key' => 'plan_create_success',          'message_value' => 'Plan created',                                                    'category' => 'success'],
        ['message_key' => 'plan_update_success',          'message_value' => 'Plan updated',                                                    'category' => 'success'],
        ['message_key' => 'plan_delete_success',          'message_value' => 'Plan deleted',                                                    'category' => 'success'],
        ['message_key' => 'plan_activate_success',        'message_value' => 'Plan activated',                                                  'category' => 'success'],
        ['message_key' => 'plan_deactivate_success',      'message_value' => 'Plan deactivated',                                                'category' => 'success'],
        ['message_key' => 'plan_assigned',                'message_value' => 'Plan assigned successfully.',                                      'category' => 'success'],
        ['message_key' => 'plan_marked_premium',          'message_value' => 'Plan marked as premium',                                          'category' => 'success'],
        ['message_key' => 'plan_premium_removed',         'message_value' => 'Premium removed',                                                 'category' => 'success'],
        ['message_key' => 'plan_most_selected',           'message_value' => 'Marked as Most Selected',                                         'category' => 'success'],
        ['message_key' => 'plan_most_selected_removed',   'message_value' => 'Removed Most Selected',                                           'category' => 'success'],
        ['message_key' => 'coupon_create_success',        'message_value' => 'Coupon created',                                                  'category' => 'success'],
        ['message_key' => 'coupon_update_success',        'message_value' => 'Coupon updated',                                                  'category' => 'success'],
        ['message_key' => 'coupon_toggle_success',        'message_value' => 'Coupon toggled',                                                  'category' => 'success'],
        ['message_key' => 'coupon_delete_success',        'message_value' => 'Coupon deleted',                                                  'category' => 'success'],
        ['message_key' => 'brand_create_success',         'message_value' => 'Brand created',                                                   'category' => 'success'],
        ['message_key' => 'brand_updated',                'message_value' => 'Brand updated.',                                                  'category' => 'success'],
        ['message_key' => 'charge_create_success',        'message_value' => 'Charge created.',                                                 'category' => 'success'],
        ['message_key' => 'charge_update_success',        'message_value' => 'Charge updated.',                                                 'category' => 'success'],
        ['message_key' => 'charge_delete_success',        'message_value' => 'Charge deleted.',                                                 'category' => 'success'],
        ['message_key' => 'template_create_success',      'message_value' => 'Template created',                                                'category' => 'success'],
        ['message_key' => 'template_update_success',      'message_value' => 'Template updated',                                               'category' => 'success'],
        ['message_key' => 'template_delete_success',      'message_value' => 'Template deleted',                                               'category' => 'success'],
        ['message_key' => 'zone_save_success',            'message_value' => 'Zone saved successfully',                                         'category' => 'success'],
        ['message_key' => 'zone_delete_success',          'message_value' => 'Zone deleted successfully',                                       'category' => 'success'],
        ['message_key' => 'zone_status_toggled',          'message_value' => 'Zone status toggled.',                                            'category' => 'success'],
        ['message_key' => 'admin_blocked_from_approvals', 'message_value' => 'You are blocked from approvals.',                                 'category' => 'error'],
        ['message_key' => 'admin_blocked_from_user_management', 'message_value' => 'Your access to user management is restricted.',             'category' => 'error'],
        ['message_key' => 'admin_blocked_from_product_approval', 'message_value' => 'You are blocked from approving products',                  'category' => 'error'],
        ['message_key' => 'report_not_found',             'message_value' => 'Report not found or not assigned to you',                         'category' => 'error'],
        ['message_key' => 'reported_user_not_found',      'message_value' => 'Reported user not found',                                         'category' => 'error'],
        ['message_key' => 'report_handled_success',       'message_value' => 'Report handled successfully',                                     'category' => 'success'],
        ['message_key' => 'report_reassigned',            'message_value' => 'Report reassigned',                                               'category' => 'success'],
        ['message_key' => 'not_found_error',              'message_value' => 'Not found',                                                       'category' => 'error'],
        ['message_key' => 'edit_request_approve_success', 'message_value' => 'Edit request approved and merged.',                               'category' => 'success'],
        ['message_key' => 'edit_request_reject_success',  'message_value' => 'Edit request rejected.',                                          'category' => 'success'],
        ['message_key' => 'user_suspended_success',       'message_value' => 'User suspended successfully.',                                    'category' => 'success'],
        ['message_key' => 'user_activated_success',       'message_value' => 'User activated successfully.',                                    'category' => 'success'],
        ['message_key' => 'category_added',               'message_value' => 'Category added.',                                                 'category' => 'success'],
        ['message_key' => 'category_updated',             'message_value' => 'Category updated.',                                               'category' => 'success'],
        ['message_key' => 'subcategory_added',            'message_value' => 'Sub-category added.',                                             'category' => 'success'],
        ['message_key' => 'subcategory_updated',          'message_value' => 'Sub-category updated.',                                           'category' => 'success'],
        ['message_key' => 'gender_added',                 'message_value' => 'Gender added.',                                                   'category' => 'success'],
        ['message_key' => 'gender_updated',               'message_value' => 'Gender updated.',                                                 'category' => 'success'],
        ['message_key' => 'color_added',                  'message_value' => 'Color added.',                                                    'category' => 'success'],
        ['message_key' => 'color_updated',                'message_value' => 'Color updated.',                                                  'category' => 'success'],
        ['message_key' => 'listing_type_added',           'message_value' => 'Listing type added.',                                             'category' => 'success'],
        ['message_key' => 'listing_type_updated',         'message_value' => 'Listing type updated.',                                           'category' => 'success'],
        ['message_key' => 'product_type_added',           'message_value' => 'Product type added.',                                             'category' => 'success'],
        ['message_key' => 'product_type_updated',         'message_value' => 'Product type updated.',                                           'category' => 'success'],
        ['message_key' => 'item_deleted',                 'message_value' => 'Item deleted.',                                                   'category' => 'success'],
        ['message_key' => 'status_toggled',               'message_value' => 'Status toggled.',                                                 'category' => 'success'],
        ['message_key' => 'rule_toggled',                 'message_value' => 'Rule toggled',                                                    'category' => 'success'],
        ['message_key' => 'original_brand_added',         'message_value' => 'Original brand added.',                                           'category' => 'success'],
        ['message_key' => 'original_brand_updated',       'message_value' => 'Original brand updated.',                                         'category' => 'success'],
        ['message_key' => 'original_brand_deleted',       'message_value' => 'Original brand deleted.',                                         'category' => 'success'],
        ['message_key' => 'original_brand_activated',     'message_value' => 'Original brand activated.',                                       'category' => 'success'],
        ['message_key' => 'original_brand_blocked',       'message_value' => 'Original brand blocked and products rejected.',                   'category' => 'success'],
        ['message_key' => 'original_brand_deactivated',   'message_value' => 'Original brand deactivated. Brand name hidden from all products (products are NOT detagged).', 'category' => 'success'],
        ['message_key' => 'original_brand_unblocked',     'message_value' => 'Original brand unblocked. Products restored to their original statuses.', 'category' => 'success'],
        ['message_key' => 'seller_brand_created',         'message_value' => 'Seller brand created and assigned.',                              'category' => 'success'],
        ['message_key' => 'seller_brand_updated',         'message_value' => 'Seller brand updated.',                                           'category' => 'success'],
        ['message_key' => 'seller_brand_deleted',         'message_value' => 'Seller brand deleted.',                                           'category' => 'success'],
        ['message_key' => 'seller_brand_activated',       'message_value' => 'Seller brand activated.',                                         'category' => 'success'],
        ['message_key' => 'seller_brand_blocked',         'message_value' => 'Seller brand blocked and products rejected.',                      'category' => 'success'],
        ['message_key' => 'seller_brand_deactivated',     'message_value' => 'Seller brand deactivated. Brand name hidden from all products (products are NOT detagged).', 'category' => 'success'],
        ['message_key' => 'seller_brand_unblocked',       'message_value' => 'Seller brand unblocked. Products restored to their original statuses.', 'category' => 'success'],
        ['message_key' => 'pricing_rule_created',         'message_value' => 'Pricing rule created',                                            'category' => 'success'],
        ['message_key' => 'pricing_rule_updated',         'message_value' => 'Pricing rule updated',                                            'category' => 'success'],
        ['message_key' => 'pricing_rule_deleted',         'message_value' => 'Pricing rule deleted',                                            'category' => 'success'],
        ['message_key' => 'rental_rule_created',          'message_value' => 'Rental rule created',                                             'category' => 'success'],
        ['message_key' => 'rental_rule_updated',          'message_value' => 'Rental rule updated',                                             'category' => 'success'],
        ['message_key' => 'rental_rule_deleted',          'message_value' => 'Rental rule deleted',                                             'category' => 'success'],
        ['message_key' => 'rental_rule_toggled',          'message_value' => 'Rental rule toggled',                                             'category' => 'success'],
        ['message_key' => 'admin_created',                'message_value' => 'Admin created successfully.',                                     'category' => 'success'],
        ['message_key' => 'admin_deleted',                'message_value' => 'Admin deleted successfully.',                                     'category' => 'success'],
        ['message_key' => 'admin_suspended',              'message_value' => 'Admin suspended.',                                                'category' => 'success'],
        ['message_key' => 'admin_activated',              'message_value' => 'Admin activated.',                                                'category' => 'success'],
        ['message_key' => 'rights_updated',               'message_value' => 'Rights updated successfully.',                                    'category' => 'success'],
        ['message_key' => 'ad_uploaded',                  'message_value' => 'Advertisement uploaded successfully.',                             'category' => 'success'],
        ['message_key' => 'ad_updated',                   'message_value' => 'Advertisement updated successfully.',                             'category' => 'success'],
        ['message_key' => 'ad_deleted',                   'message_value' => 'Advertisement deleted.',                                          'category' => 'success'],
        ['message_key' => 'cms_page_created',             'message_value' => 'CMS page created successfully.',                                  'category' => 'success'],
        ['message_key' => 'cms_page_deleted',             'message_value' => 'CMS page deleted successfully.',                                  'category' => 'success'],
        ['message_key' => 'page_saved',                   'message_value' => 'Page saved',                                                      'category' => 'success'],
        ['message_key' => 'page_updated',                 'message_value' => 'Page updated successfully.',                                      'category' => 'success'],
        ['message_key' => 'page_not_found',               'message_value' => 'Page not found.',                                                 'category' => 'error'],
        ['message_key' => 'seo_updated',                  'message_value' => 'SEO setting updated successfully.',                               'category' => 'success'],
        ['message_key' => 'seo_not_found',                'message_value' => 'SEO settings not found for this page',                            'category' => 'error'],
        ['message_key' => 'error_message_created',        'message_value' => 'Error message created successfully',                              'category' => 'success'],
        ['message_key' => 'error_message_updated',        'message_value' => 'Error message updated successfully',                              'category' => 'success'],
        ['message_key' => 'error_message_deleted',        'message_value' => 'Error message deleted successfully',                              'category' => 'success'],
        ['message_key' => 'profile_updated',              'message_value' => 'Profile updated',                                                 'category' => 'success'],
        ['message_key' => 'profile_image_updated',        'message_value' => 'Profile image updated',                                           'category' => 'success'],
        ['message_key' => 'kyc_uploaded',                 'message_value' => 'KYC documents uploaded',                                          'category' => 'success'],
        ['message_key' => 'key_value_required',           'message_value' => 'Key and value are required',                                      'category' => 'error'],
        ['message_key' => 'message_key_exists',           'message_value' => 'Message key already exists',                                      'category' => 'error'],
        ['message_key' => 'no_data_to_update',            'message_value' => 'No data to update',                                               'category' => 'error'],
        ['message_key' => 'no_valid_image',               'message_value' => 'No valid image uploaded',                                         'category' => 'error'],
        ['message_key' => 'invalid_image_type',           'message_value' => 'Only JPG, PNG, WEBP images are allowed',                          'category' => 'error'],
        ['message_key' => 'superadmin_approve_only',      'message_value' => 'Only super admin can approve system-user uploaded products',       'category' => 'error'],
        ['message_key' => 'superadmin_reject_only',       'message_value' => 'Only super admin can reject system-user uploaded products',        'category' => 'error'],

        // ── DELIVERY AGENT ───────────────────────────────────────────────────
        ['message_key' => 'delivery_accept_assigned_only','message_value' => 'Can only accept assigned deliveries',                             'category' => 'error'],
        ['message_key' => 'delivery_accepted',            'message_value' => 'Delivery accepted',                                               'category' => 'success'],
        ['message_key' => 'delivery_picked_up',           'message_value' => 'Marked as picked up',                                             'category' => 'success'],
        ['message_key' => 'delivery_marked_delivered',    'message_value' => 'Marked as delivered',                                             'category' => 'success'],
        ['message_key' => 'delivery_profile_updated',     'message_value' => 'Delivery profile updated',                                        'category' => 'success'],
    ];

    public function up()
    {
        $db  = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        // Deduplicate by message_key (some keys appear in both old and new seeds)
        $seen = [];
        foreach ($this->messages as $msg) {
            $key = $msg['message_key'];
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $existing = $db->table('app_messages')->where('message_key', $key)->get()->getRowArray();
            if (!$existing) {
                $db->table('app_messages')->insert([
                    'message_key'   => $key,
                    'message_value' => $msg['message_value'],
                    'category'      => $msg['category'],
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ]);
            }
        }
    }

    public function down()
    {
        $db   = \Config\Database::connect();
        $keys = array_unique(array_column($this->messages, 'message_key'));
        if (!empty($keys)) {
            $db->table('app_messages')->whereIn('message_key', $keys)->delete();
        }
    }
}
