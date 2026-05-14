<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class SeedAllAppMessages extends Migration
{
    /**
     * All configurable alert/toast messages for the entire application.
     * Keys map to getMsg('key', 'fallback') calls in the frontend.
     * Category: 'error' | 'success' | 'warning' | 'info' | 'general'
     */
    private array $messages = [

        // ─── AUTH / LOGIN ────────────────────────────────────────────────
        ['message_key' => 'login_failed',              'message_value' => 'Invalid email or password. Please try again.',  'category' => 'error'],
        ['message_key' => 'login_success',             'message_value' => 'Welcome back! You are now signed in.',           'category' => 'success'],
        ['message_key' => 'otp_send_failed',           'message_value' => 'Failed to send OTP. Please try again.',          'category' => 'error'],
        ['message_key' => 'otp_send_success',          'message_value' => 'OTP sent successfully! Check your email.',       'category' => 'success'],
        ['message_key' => 'otp_verify_failed',         'message_value' => 'Invalid OTP. Please try again.',                 'category' => 'error'],
        ['message_key' => 'otp_verify_success',        'message_value' => 'OTP verified successfully!',                     'category' => 'success'],
        ['message_key' => 'google_login_failed',       'message_value' => 'Google sign-in failed. Please try again.',       'category' => 'error'],
        ['message_key' => 'auth_login_required',       'message_value' => 'Please log in to continue.',                    'category' => 'error'],
        ['message_key' => 'logout_success',            'message_value' => 'You have been signed out.',                      'category' => 'success'],
        ['message_key' => 'register_success',          'message_value' => 'Account created! Please verify your email.',     'category' => 'success'],
        ['message_key' => 'register_failed',           'message_value' => 'Registration failed. Please try again.',         'category' => 'error'],
        ['message_key' => 'email_already_exists',      'message_value' => 'This email is already registered.',              'category' => 'error'],

        // ─── OFFERS ─────────────────────────────────────────────────────
        ['message_key' => 'offer_sent_success',        'message_value' => 'Offer sent successfully!',                       'category' => 'success'],
        ['message_key' => 'offer_action_success',      'message_value' => 'Offer action completed successfully!',            'category' => 'success'],
        ['message_key' => 'offer_send_failed',         'message_value' => 'Failed to send offer. Please try again.',        'category' => 'error'],
        ['message_key' => 'offer_accepted',            'message_value' => 'Offer accepted successfully!',                   'category' => 'success'],
        ['message_key' => 'offer_rejected',            'message_value' => 'Offer rejected.',                                'category' => 'success'],
        ['message_key' => 'offer_cancelled',           'message_value' => 'Offer cancelled.',                               'category' => 'success'],
        ['message_key' => 'offer_cancelled_success',   'message_value' => 'Offer cancelled successfully.',                  'category' => 'success'],
        ['message_key' => 'offer_action_failed',       'message_value' => 'Action failed. Please try again.',               'category' => 'error'],
        ['message_key' => 'offer_update_success',      'message_value' => 'Offer updated successfully!',                   'category' => 'success'],
        ['message_key' => 'offer_update_failed',       'message_value' => 'Failed to update offer.',                        'category' => 'error'],
        ['message_key' => 'offer_not_found',           'message_value' => 'Offer not found or no longer valid.',            'category' => 'error'],
        ['message_key' => 'offer_dates_updated',       'message_value' => 'Rental dates updated successfully!',            'category' => 'success'],
        ['message_key' => 'offer_dates_failed',        'message_value' => 'Failed to update rental dates.',                 'category' => 'error'],
        ['message_key' => 'offer_date_required',       'message_value' => 'Please select both start and end dates.',        'category' => 'warning'],
        ['message_key' => 'offer_date_invalid',        'message_value' => 'End date must be after start date.',             'category' => 'warning'],
        ['message_key' => 'offer_address_required',    'message_value' => 'Please fill in your delivery address and pin code.', 'category' => 'warning'],
        ['message_key' => 'offer_suggestion_sent',     'message_value' => 'Date suggestion sent to buyer!',                 'category' => 'success'],
        ['message_key' => 'offer_suggestion_failed',   'message_value' => 'Failed to send date suggestion.',                'category' => 'error'],
        ['message_key' => 'offer_dates_accepted',      'message_value' => 'Dates accepted! Deal is finalized.',             'category' => 'success'],
        ['message_key' => 'offer_rating_submitted',    'message_value' => 'Rating submitted successfully!',                 'category' => 'success'],
        ['message_key' => 'offer_rating_failed',       'message_value' => 'Failed to submit rating. Please try again.',     'category' => 'error'],

        // ─── ORDERS ─────────────────────────────────────────────────────
        ['message_key' => 'order_not_found',           'message_value' => 'Order not found.',                               'category' => 'error'],
        ['message_key' => 'order_cancel_success',      'message_value' => 'Order cancelled successfully.',                  'category' => 'success'],
        ['message_key' => 'order_action_failed',       'message_value' => 'Order action failed. Please try again.',         'category' => 'error'],
        ['message_key' => 'order_delivery_confirmed',  'message_value' => 'Delivery confirmed!',                            'category' => 'success'],
        ['message_key' => 'order_delivery_failed',     'message_value' => 'Failed to confirm delivery.',                    'category' => 'error'],
        ['message_key' => 'order_review_submitted',    'message_value' => 'Review submitted successfully!',                 'category' => 'success'],
        ['message_key' => 'order_review_failed',       'message_value' => 'Failed to submit review.',                       'category' => 'error'],

        // ─── PAYMENT ────────────────────────────────────────────────────
        ['message_key' => 'payment_success',           'message_value' => 'Payment successful! Order confirmed.',           'category' => 'success'],
        ['message_key' => 'payment_failed',            'message_value' => 'Payment failed. Please try again.',              'category' => 'error'],

        // ─── PRODUCTS ───────────────────────────────────────────────────
        ['message_key' => 'product_not_found',         'message_value' => 'Product not found.',                             'category' => 'error'],
        ['message_key' => 'product_delete_success',    'message_value' => 'Product deleted successfully.',                  'category' => 'success'],
        ['message_key' => 'product_delete_failed',     'message_value' => 'Failed to delete product.',                      'category' => 'error'],
        ['message_key' => 'product_upload_success',    'message_value' => 'Product listed successfully!',                   'category' => 'success'],
        ['message_key' => 'product_upload_failed',     'message_value' => 'Failed to submit product. Please try again.',    'category' => 'error'],
        ['message_key' => 'product_approved',          'message_value' => 'Product approved successfully!',                 'category' => 'success'],
        ['message_key' => 'product_approval_failed',   'message_value' => 'Failed to approve product.',                     'category' => 'error'],
        ['message_key' => 'product_rejected',          'message_value' => 'Product rejected.',                              'category' => 'success'],
        ['message_key' => 'product_rejection_failed',  'message_value' => 'Failed to reject product.',                      'category' => 'error'],
        ['message_key' => 'product_edit_approved',     'message_value' => 'Edit request approved and merged!',              'category' => 'success'],
        ['message_key' => 'product_edit_failed',       'message_value' => 'Failed to approve edit request.',                'category' => 'error'],
        ['message_key' => 'product_max_images',        'message_value' => 'Maximum {max} images allowed.',                  'category' => 'warning'],
        ['message_key' => 'product_max_bills',         'message_value' => 'Maximum {max} bill uploads allowed.',            'category' => 'warning'],

        // ─── RENTAL ─────────────────────────────────────────────────────
        ['message_key' => 'min_rental_duration',       'message_value' => 'Minimum rental duration is {min} days.',         'category' => 'warning'],
        ['message_key' => 'booking_conflict',          'message_value' => 'Product is already booked for the selected dates.', 'category' => 'error'],
        ['message_key' => 'dates_update_success',      'message_value' => 'Rental dates updated successfully!',             'category' => 'success'],

        // ─── PROFILE ────────────────────────────────────────────────────
        ['message_key' => 'profile_update_success',   'message_value' => 'Profile updated successfully!',                  'category' => 'success'],
        ['message_key' => 'profile_update_failed',    'message_value' => 'Failed to update profile.',                      'category' => 'error'],
        ['message_key' => 'profile_image_success',    'message_value' => 'Profile image updated!',                         'category' => 'success'],
        ['message_key' => 'profile_image_failed',     'message_value' => 'Image upload failed. Please try again.',         'category' => 'error'],
        ['message_key' => 'kyc_upload_success',       'message_value' => 'KYC documents uploaded successfully!',           'category' => 'success'],
        ['message_key' => 'kyc_upload_failed',        'message_value' => 'KYC document upload failed.',                   'category' => 'error'],

        // ─── REVIEWS / RATINGS ──────────────────────────────────────────
        ['message_key' => 'review_submit_success',    'message_value' => 'Review submitted successfully!',                 'category' => 'success'],
        ['message_key' => 'already_rated_seller',     'message_value' => 'You have already rated this seller.',            'category' => 'error'],
        ['message_key' => 'rating_window_expired',    'message_value' => 'The rating window has expired.',                 'category' => 'error'],

        // ─── WISHLIST / CART ────────────────────────────────────────────
        ['message_key' => 'wishlist_removed',         'message_value' => 'Removed from wishlist.',                         'category' => 'success'],
        ['message_key' => 'wishlist_moved_to_cart',   'message_value' => 'Item moved to cart!',                            'category' => 'success'],
        ['message_key' => 'cart_add_success',         'message_value' => 'Added to cart!',                                 'category' => 'success'],
        ['message_key' => 'cart_remove_success',      'message_value' => 'Removed from cart.',                             'category' => 'success'],

        // ─── BRANDS ─────────────────────────────────────────────────────
        ['message_key' => 'brand_create_success',     'message_value' => 'Brand created successfully!',                   'category' => 'success'],
        ['message_key' => 'brand_create_failed',      'message_value' => 'Failed to create brand.',                        'category' => 'error'],
        ['message_key' => 'brand_update_success',     'message_value' => 'Brand updated successfully!',                   'category' => 'success'],
        ['message_key' => 'brand_update_failed',      'message_value' => 'Failed to update brand.',                        'category' => 'error'],
        ['message_key' => 'brand_delete_success',     'message_value' => 'Brand deleted successfully.',                    'category' => 'success'],
        ['message_key' => 'brand_delete_failed',      'message_value' => 'Failed to delete brand.',                        'category' => 'error'],
        ['message_key' => 'brand_blocked',            'message_value' => 'Brand blocked and products rejected.',           'category' => 'success'],
        ['message_key' => 'brand_unblocked',          'message_value' => 'Brand unblocked successfully.',                  'category' => 'success'],
        ['message_key' => 'brand_listing_type_required', 'message_value' => 'Please select at least one listing type.',   'category' => 'warning'],

        // ─── COUPONS ────────────────────────────────────────────────────
        ['message_key' => 'coupon_create_success',    'message_value' => 'Coupon created successfully!',                  'category' => 'success'],
        ['message_key' => 'coupon_update_success',    'message_value' => 'Coupon updated successfully!',                  'category' => 'success'],
        ['message_key' => 'coupon_save_failed',       'message_value' => 'Failed to save coupon.',                         'category' => 'error'],
        ['message_key' => 'coupon_delete_success',    'message_value' => 'Coupon deleted successfully.',                   'category' => 'success'],
        ['message_key' => 'coupon_delete_failed',     'message_value' => 'Failed to delete coupon.',                       'category' => 'error'],
        ['message_key' => 'coupon_delete_confirm',    'message_value' => 'This coupon will be permanently deleted. Continue?', 'category' => 'warning'],
        ['message_key' => 'coupon_applied_success',   'message_value' => 'Coupon applied successfully!',                  'category' => 'success'],
        ['message_key' => 'coupon_invalid',           'message_value' => 'Invalid or expired coupon.',                     'category' => 'error'],

        // ─── ZONES ──────────────────────────────────────────────────────
        ['message_key' => 'zone_save_success',        'message_value' => 'Zone saved successfully!',                       'category' => 'success'],
        ['message_key' => 'zone_save_failed',         'message_value' => 'Failed to save zone.',                           'category' => 'error'],
        ['message_key' => 'location_detecting',       'message_value' => 'Detecting your location...',                     'category' => 'info'],
        ['message_key' => 'location_detected',        'message_value' => 'Location detected: {name}',                      'category' => 'success'],
        ['message_key' => 'location_not_supported',   'message_value' => 'Geolocation is not supported by your browser.',  'category' => 'error'],
        ['message_key' => 'location_failed',          'message_value' => 'Unable to detect location.',                     'category' => 'error'],
        ['message_key' => 'zone_select_map_first',    'message_value' => 'Please select a location on the map first.',     'category' => 'error'],
        ['message_key' => 'zone_duplicate_active',    'message_value' => 'An active zone for "{name}" already exists. Deactivate it first.', 'category' => 'error'],
        ['message_key' => 'zone_no_polygon',          'message_value' => 'No polygon data found for this zone.',           'category' => 'error'],

        // ─── SETTINGS ───────────────────────────────────────────────────
        ['message_key' => 'settings_save_success',   'message_value' => 'Settings saved successfully!',                   'category' => 'success'],
        ['message_key' => 'settings_save_error',     'message_value' => 'Failed to save settings. Please try again.',     'category' => 'error'],
        ['message_key' => 'settings_date_required',  'message_value' => 'Please select both start and end dates.',        'category' => 'warning'],

        // ─── ADMINS ─────────────────────────────────────────────────────
        ['message_key' => 'admin_create_success',    'message_value' => 'Administrator created successfully!',             'category' => 'success'],
        ['message_key' => 'admin_create_failed',     'message_value' => 'Failed to create administrator.',                 'category' => 'error'],
        ['message_key' => 'admin_delete_success',    'message_value' => 'Admin deleted successfully.',                     'category' => 'success'],
        ['message_key' => 'admin_action_success',    'message_value' => 'Admin action completed successfully.',            'category' => 'success'],
        ['message_key' => 'admin_action_failed',     'message_value' => 'Admin action failed. Please try again.',          'category' => 'error'],

        // ─── USERS ──────────────────────────────────────────────────────
        ['message_key' => 'user_status_updated',     'message_value' => 'User status updated.',                            'category' => 'success'],
        ['message_key' => 'user_role_updated',       'message_value' => 'User role updated successfully.',                 'category' => 'success'],
        ['message_key' => 'user_action_failed',      'message_value' => 'Action failed. Please try again.',                'category' => 'error'],

        // ─── PRICING RULES ──────────────────────────────────────────────
        ['message_key' => 'rule_threshold_required', 'message_value' => 'Deduction Threshold is required.',               'category' => 'warning'],
        ['message_key' => 'rule_save_success',       'message_value' => 'Pricing rule saved successfully!',               'category' => 'success'],
        ['message_key' => 'rule_save_failed',        'message_value' => 'Failed to save pricing rule.',                    'category' => 'error'],
        ['message_key' => 'rule_save_failed_partial','message_value' => 'Failed to save one or more ranges.',              'category' => 'error'],
        ['message_key' => 'rule_delete_success',     'message_value' => 'Pricing rule deleted.',                           'category' => 'success'],
        ['message_key' => 'rule_delete_confirm',     'message_value' => 'Delete this pricing rule? This cannot be undone.','category' => 'warning'],
        ['message_key' => 'rental_rule_save_success','message_value' => 'Rental pricing rule saved!',                      'category' => 'success'],

        // ─── CMS PAGES ──────────────────────────────────────────────────
        ['message_key' => 'cms_page_create_success',  'message_value' => 'CMS page created successfully!',                 'category' => 'success'],
        ['message_key' => 'cms_page_create_failed',   'message_value' => 'Failed to create page.',                          'category' => 'error'],
        ['message_key' => 'cms_page_update_success',  'message_value' => 'CMS page updated successfully!',                 'category' => 'success'],
        ['message_key' => 'cms_page_update_failed',   'message_value' => 'Failed to update page.',                          'category' => 'error'],
        ['message_key' => 'cms_page_delete_success',  'message_value' => 'Page deleted successfully.',                      'category' => 'success'],
        ['message_key' => 'cms_page_delete_failed',   'message_value' => 'Failed to delete page.',                          'category' => 'error'],

        // ─── TAXONOMY ───────────────────────────────────────────────────
        ['message_key' => 'taxonomy_update_success', 'message_value' => 'Taxonomy updated successfully!',                 'category' => 'success'],
        ['message_key' => 'taxonomy_update_failed',  'message_value' => 'Failed to update taxonomy.',                      'category' => 'error'],

        // ─── PRODUCT APPROVALS ──────────────────────────────────────────
        ['message_key' => 'product_approve_success',  'message_value' => 'Product approved successfully!',                 'category' => 'success'],
        ['message_key' => 'product_approve_failed',   'message_value' => 'Failed to approve product.',                     'category' => 'error'],
        ['message_key' => 'product_reject_success',   'message_value' => 'Product rejected.',                              'category' => 'success'],
        ['message_key' => 'product_reject_failed',    'message_value' => 'Failed to reject product.',                      'category' => 'error'],
        ['message_key' => 'edit_request_approve_success', 'message_value' => 'Edit request approved and merged!',         'category' => 'success'],
        ['message_key' => 'edit_request_approve_failed',  'message_value' => 'Failed to approve edit request.',           'category' => 'error'],
        ['message_key' => 'edit_request_reject_success',  'message_value' => 'Edit request rejected.',                    'category' => 'success'],
        ['message_key' => 'edit_request_reject_failed',   'message_value' => 'Failed to reject edit request.',             'category' => 'error'],

        // ─── USER MANAGEMENT ────────────────────────────────────────────
        ['message_key' => 'user_status_update_success', 'message_value' => 'User status updated successfully.',            'category' => 'success'],
        ['message_key' => 'user_status_update_failed',  'message_value' => 'Failed to update user status.',                 'category' => 'error'],
        ['message_key' => 'user_role_access_update_success', 'message_value' => 'User role access updated.',               'category' => 'success'],
        ['message_key' => 'user_role_access_update_failed',  'message_value' => 'Failed to update role access.',            'category' => 'error'],

        // ─── ZONES & LOCATION ───────────────────────────────────────────
        ['message_key' => 'location_detected_success', 'message_value' => 'Location detected successfully.',              'category' => 'success'],
        ['message_key' => 'geolocation_not_supported', 'message_value' => 'Geolocation is not supported by your browser.', 'category' => 'error'],
        ['message_key' => 'geolocation_failed',        'message_value' => 'Unable to get location.',                        'category' => 'error'],
        ['message_key' => 'zone_location_required',    'message_value' => 'Please select a location via the map first.',    'category' => 'error'],
        ['message_key' => 'zone_duplicate_error',     'message_value' => 'An active zone for this location already exists.', 'category' => 'error'],
        ['message_key' => 'zone_polygon_missing',     'message_value' => 'No polygon data for this zone.',                  'category' => 'error'],
        ['message_key' => 'zone_polygon_render_failed', 'message_value' => 'Could not render polygon on map.',              'category' => 'error'],

        // ─── SUBSCRIPTIONS & PLANS ──────────────────────────────────────
        ['message_key' => 'plan_base_price_error',    'message_value' => 'Base price cannot be less than final price.',     'category' => 'error'],
        ['message_key' => 'plan_delete_success',      'message_value' => 'Subscription plan deleted.',                      'category' => 'success'],
        ['message_key' => 'plan_delete_failed',       'message_value' => 'Failed to delete subscription plan.',             'category' => 'error'],

        // ─── RENTAL & CALENDAR ──────────────────────────────────────────
        ['message_key' => 'rental_min_days_error',    'message_value' => 'Minimum rental period is {days} days.',           'category' => 'error'],

        // ─── BULK UPLOAD ────────────────────────────────────────────────
        ['message_key' => 'bulk_upload_success',      'message_value' => 'Bulk upload completed successfully!',             'category' => 'success'],
        ['message_key' => 'bulk_upload_failed',       'message_value' => 'Bulk upload failed. Please check your file.',      'category' => 'error'],

        // ─── PROFILE ────────────────────────────────────────────────────
        ['message_key' => 'profile_update_success',    'message_value' => 'Profile details updated successfully!',           'category' => 'success'],
        ['message_key' => 'profile_image_update_success', 'message_value' => 'Profile image updated successfully!',         'category' => 'success'],
        ['message_key' => 'profile_image_update_failed',  'message_value' => 'Failed to upload profile image.',               'category' => 'error'],

        // ─── FEE / CHARGES ──────────────────────────────────────────────
        ['message_key' => 'charge_save_success',     'message_value' => 'Charge saved successfully!',                     'category' => 'success'],
        ['message_key' => 'charge_save_failed',      'message_value' => 'Failed to save charge.',                          'category' => 'error'],
        ['message_key' => 'charge_delete_success',   'message_value' => 'Charge deleted.',                                 'category' => 'success'],
        ['message_key' => 'charge_delete_failed',    'message_value' => 'Failed to delete charge.',                        'category' => 'error'],
        ['message_key' => 'charge_toggle_failed',    'message_value' => 'Failed to toggle charge status.',                 'category' => 'error'],
        ['message_key' => 'charge_fields_required',  'message_value' => 'Charge name and value are required.',            'category' => 'warning'],

        // ─── REJECTION TEMPLATES ─────────────────────────────────────────
        ['message_key' => 'template_save_success',   'message_value' => 'Template saved successfully!',                   'category' => 'success'],
        ['message_key' => 'template_save_failed',    'message_value' => 'Failed to save template.',                        'category' => 'error'],
        ['message_key' => 'template_delete_success', 'message_value' => 'Template deleted.',                               'category' => 'success'],
        ['message_key' => 'template_delete_failed',  'message_value' => 'Failed to delete template.',                      'category' => 'error'],
        ['message_key' => 'template_empty',          'message_value' => 'Template text cannot be empty.',                  'category' => 'warning'],

        // ─── FAQ ─────────────────────────────────────────────────────────
        ['message_key' => 'faq_save_success',        'message_value' => 'FAQ saved successfully!',                        'category' => 'success'],
        ['message_key' => 'faq_save_failed',         'message_value' => 'Failed to save FAQ.',                             'category' => 'error'],
        ['message_key' => 'faq_delete_success',      'message_value' => 'FAQ deleted.',                                    'category' => 'success'],
        ['message_key' => 'faq_delete_failed',       'message_value' => 'Failed to delete FAQ.',                           'category' => 'error'],
        ['message_key' => 'faq_fields_required',     'message_value' => 'Question and Answer are both required.',          'category' => 'warning'],

        // ─── GENERIC FALLBACKS ───────────────────────────────────────────
        ['message_key' => 'generic_success',         'message_value' => 'Action completed successfully!',                  'category' => 'success'],
        ['message_key' => 'generic_error',           'message_value' => 'Something went wrong. Please try again.',         'category' => 'error'],
        ['message_key' => 'generic_save_first',      'message_value' => 'Please save your settings first.',               'category' => 'warning'],
        ['message_key' => 'network_error',           'message_value' => 'Network error. Please check your connection.',   'category' => 'error'],
        ['message_key' => 'server_error',            'message_value' => 'Server error. Please try again later.',          'category' => 'error'],
    ];

    public function up()
    {
        $db = \Config\Database::connect();
        $now = date('Y-m-d H:i:s');

        foreach ($this->messages as $msg) {
            $existing = $db->table('app_messages')
                ->where('message_key', $msg['message_key'])
                ->get()->getRowArray();

            if (!$existing) {
                $db->table('app_messages')->insert([
                    'message_key'   => $msg['message_key'],
                    'message_value' => $msg['message_value'],
                    'category'      => $msg['category'],
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ]);
            }
            // Do NOT overwrite existing values — admin may have customised them
        }
    }

    public function down()
    {
        $db = \Config\Database::connect();
        $keys = array_column($this->messages, 'message_key');
        if (!empty($keys)) {
            $db->table('app_messages')->whereIn('message_key', $keys)->delete();
        }
    }
}
