<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class SeedMappedAppMessages extends Migration
{
    private array $messages = [
        // --- Auth & Account ---
        ['message_key' => 'login_fields_required', 'message_value' => 'Email and password are required', 'category' => 'error'],
        ['message_key' => 'account_blocked_admin', 'message_value' => 'Your account has been blocked by admin', 'category' => 'error'],
        ['message_key' => 'buyer_role_blocked', 'message_value' => 'Your buyer role has been blocked by admin', 'category' => 'error'],
        ['message_key' => 'seller_role_blocked', 'message_value' => 'Your seller role has been blocked by admin', 'category' => 'error'],
        ['message_key' => 'account_roles_blocked', 'message_value' => 'Your account roles have been blocked by admin', 'category' => 'error'],
        ['message_key' => 'email_required', 'message_value' => 'Email is required', 'category' => 'error'],
        ['message_key' => 'email_not_found', 'message_value' => 'No account found with this email', 'category' => 'error'],
        ['message_key' => 'otp_verify_fields_required', 'message_value' => 'Email and OTP are required', 'category' => 'error'],
        ['message_key' => 'password_reset_otp_sent', 'message_value' => 'Password reset OTP sent to your email', 'category' => 'success'],
        ['message_key' => 'password_reset_fields_required', 'message_value' => 'Email, OTP, and new password are required', 'category' => 'error'],
        ['message_key' => 'password_too_short', 'message_value' => 'Password must be at least 6 characters long', 'category' => 'error'],
        ['message_key' => 'password_reset_success', 'message_value' => 'Password reset successfully. You can now login with your new password.', 'category' => 'success'],
        ['message_key' => 'password_update_failed', 'message_value' => 'Failed to update password. Please try again.', 'category' => 'error'],
        ['message_key' => 'validation_failed', 'message_value' => 'Validation failed', 'category' => 'error'],
        ['message_key' => 'email_already_exists_role', 'message_value' => 'This email is already registered with the selected role.', 'category' => 'error'],
        ['message_key' => 'account_upgraded_success', 'message_value' => 'Account upgraded successfully. OTP sent to your email.', 'category' => 'success'],
        ['message_key' => 'mobile_already_exists', 'message_value' => 'Mobile number already registered', 'category' => 'error'],
        ['message_key' => 'role_switch_not_allowed', 'message_value' => 'Role switching not allowed', 'category' => 'error'],
        ['message_key' => 'user_not_found', 'message_value' => 'User not found', 'category' => 'error'],

        // --- Buyer & Offers ---
        ['message_key' => 'product_not_found_or_unavailable', 'message_value' => 'Product not found or currently unavailable', 'category' => 'error'],
        ['message_key' => 'buyer_blocked_from_offers', 'message_value' => 'Your account is currently blocked from making offers as a buyer.', 'category' => 'error'],
        ['message_key' => 'seller_blocked_from_offers', 'message_value' => 'This seller is currently blocked and cannot receive offers.', 'category' => 'error'],
        ['message_key' => 'cannot_offer_own_product', 'message_value' => 'Cannot make offer on your own product', 'category' => 'error'],
        ['message_key' => 'overlap_dates_offer_exists', 'message_value' => 'You already have an active offer overlapping with these dates.', 'category' => 'error'],
        ['message_key' => 'active_offer_already_exists', 'message_value' => 'You already have an active offer on this product.', 'category' => 'error'],
        ['message_key' => 'buyer_subscription_required', 'message_value' => 'You need an active buyer subscription to make offers. Please subscribe to a buyer plan.', 'category' => 'error'],
        ['message_key' => 'offer_status_not_pending', 'message_value' => 'Offer status is not pending', 'category' => 'error'],
        ['message_key' => 'action_not_allowed', 'message_value' => 'Action not allowed', 'category' => 'error'],
        ['message_key' => 'review_already_submitted', 'message_value' => 'Review already submitted', 'category' => 'error'],
        ['message_key' => 'wishlist_update_success', 'message_value' => 'Wishlist updated', 'category' => 'success'],
        ['message_key' => 'cart_update_success', 'message_value' => 'Cart updated', 'category' => 'success'],

        // --- Seller & Products ---
        ['message_key' => 'seller_blocked_from_listing', 'message_value' => 'Your account is currently blocked from listing products.', 'category' => 'error'],
        ['message_key' => 'seller_privileges_restricted', 'message_value' => 'Seller privileges restricted', 'category' => 'error'],
        ['message_key' => 'product_fields_required', 'message_value' => 'Category and brand are required', 'category' => 'error'],
        ['message_key' => 'product_edit_pending', 'message_value' => 'Edit request submitted. Wait for admin approval.', 'category' => 'success'],
        ['message_key' => 'product_delete_has_active_offers', 'message_value' => 'You have active offers/orders on this product. Complete or cancel them first.', 'category' => 'error'],
        ['message_key' => 'offer_reject_finalized_error', 'message_value' => 'You cannot reject a finalized offer.', 'category' => 'error'],
        ['message_key' => 'offer_cancel_window_expired', 'message_value' => 'You cannot cancel after the rejection window has expired.', 'category' => 'error'],

        // --- Admin & SuperAdmin Actions ---
        ['message_key' => 'settings_message_updated', 'message_value' => 'Message updated', 'category' => 'success'],
        ['message_key' => 'settings_message_added', 'message_value' => 'Message added', 'category' => 'success'],
        ['message_key' => 'settings_message_deleted', 'message_value' => 'Message deleted', 'category' => 'success'],
        ['message_key' => 'plan_create_success', 'message_value' => 'Plan created', 'category' => 'success'],
        ['message_key' => 'plan_update_success', 'message_value' => 'Plan updated', 'category' => 'success'],
        ['message_key' => 'plan_activate_success', 'message_value' => 'Plan activated', 'category' => 'success'],
        ['message_key' => 'plan_deactivate_success', 'message_value' => 'Plan deactivated', 'category' => 'success'],
        ['message_key' => 'coupon_toggle_success', 'message_value' => 'Coupon toggled', 'category' => 'success'],
        ['message_key' => 'charge_create_success', 'message_value' => 'Platform charge created', 'category' => 'success'],
        ['message_key' => 'charge_update_success', 'message_value' => 'Platform charge updated', 'category' => 'success'],
        ['message_key' => 'charge_delete_success', 'message_value' => 'Platform charge deleted', 'category' => 'success'],
        ['message_key' => 'template_create_success', 'message_value' => 'Template created', 'category' => 'success'],
        ['message_key' => 'template_update_success', 'message_value' => 'Template updated', 'category' => 'success'],
        ['message_key' => 'template_delete_success', 'message_value' => 'Template deleted', 'category' => 'success'],

        // --- Missing keys not covered by prior seeds ---
        ['message_key' => 'account_blocked',             'message_value' => 'Your account has been blocked.',                    'category' => 'error'],
        ['message_key' => 'offer_dates_required',         'message_value' => 'Rental start and end dates are required.',          'category' => 'error'],
        ['message_key' => 'product_update_success',       'message_value' => 'Product updated successfully.',                     'category' => 'success'],
        ['message_key' => 'offer_action_success',         'message_value' => 'Offer action completed successfully!',              'category' => 'success'],
        ['message_key' => 'zone_delete_success',          'message_value' => 'Zone deleted successfully.',                        'category' => 'success'],
        ['message_key' => 'edit_request_approve_success', 'message_value' => 'Edit request approved and merged.',                 'category' => 'success'],
        ['message_key' => 'edit_request_reject_success',  'message_value' => 'Edit request rejected.',                            'category' => 'success'],

        // --- Admin API ---
        ['message_key' => 'admin_blocked_from_approvals', 'message_value' => 'You are blocked from approvals.', 'category' => 'error'],
        ['message_key' => 'admin_blocked_from_user_management', 'message_value' => 'Your access to user management is restricted.', 'category' => 'error'],
        ['message_key' => 'report_not_found', 'message_value' => 'Report not found or not assigned to you', 'category' => 'error'],
        ['message_key' => 'reported_user_not_found', 'message_value' => 'Reported user not found', 'category' => 'error'],
        ['message_key' => 'report_handled_success', 'message_value' => 'Report handled successfully', 'category' => 'success'],
        ['message_key' => 'not_found_error', 'message_value' => 'Not found', 'category' => 'error'],
        ['message_key' => 'user_suspended_success', 'message_value' => 'User suspended successfully.', 'category' => 'success'],
        ['message_key' => 'user_activated_success', 'message_value' => 'User activated successfully.', 'category' => 'success'],
        ['message_key' => 'plan_not_found', 'message_value' => 'Plan not found', 'category' => 'error'],
        ['message_key' => 'coupon_expired', 'message_value' => 'Coupon has expired.', 'category' => 'error'],
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
