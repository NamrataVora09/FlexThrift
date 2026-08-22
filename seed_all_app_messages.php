<?php
/**
 * Seed all missing validation and response message keys into app_messages table.
 * Run via: php seed_all_app_messages.php  (from the project root)
 */

use Config\Paths;
use CodeIgniter\Boot;

define('FCPATH', __DIR__ . '/public/');
chdir(FCPATH);

require_once __DIR__ . '/app/Config/Paths.php';
$paths = new Paths();

define('SYSTEMPATH', rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR);
define('APPPATH',    rtrim($paths->appDirectory,    '\\/ ') . DIRECTORY_SEPARATOR);
define('WRITEPATH',  rtrim($paths->writableDirectory, '\\/ ') . DIRECTORY_SEPARATOR);
define('ROOTPATH',   realpath(__DIR__) . DIRECTORY_SEPARATOR);
define('VENDORPATH', realpath(__DIR__ . '/vendor') . DIRECTORY_SEPARATOR);

require_once SYSTEMPATH . 'Boot.php';
Boot::boot(realpath(__DIR__));

// Reconnect DB using env credentials
$db = \Config\Database::connect();

$messages = [
    // ── TAXONOMY ─────────────────────────────────────────────────────────────
    ['message_key' => 'taxonomy_update_failed',       'message_value' => 'Failed to update taxonomy.',                                          'category' => 'error'],
    ['message_key' => 'taxonomy_update_success',      'message_value' => 'Successfully updated!',                                               'category' => 'success'],
    ['message_key' => 'update_success',               'message_value' => 'Successfully updated!',                                               'category' => 'success'],
    ['message_key' => 'update_failed_retry',          'message_value' => 'Failed to update. Please try again.',                                  'category' => 'error'],
    ['message_key' => 'request_failed',               'message_value' => 'Your request failed.',                                                 'category' => 'error'],
    ['message_key' => 'subcategory_gender_required',  'message_value' => 'Since the selected parent category has no genders, you must select at least one gender for this sub-category.', 'category' => 'error'],
    ['message_key' => 'listing_type_exists',          'message_value' => 'Listing type with this name already exists.',                          'category' => 'error'],
    ['message_key' => 'listing_type_empty',           'message_value' => 'Listing type name cannot be empty.',                                   'category' => 'error'],
    ['message_key' => 'gender_exists',                'message_value' => 'Gender with this name already exists.',                                 'category' => 'error'],
    ['message_key' => 'gender_required',              'message_value' => 'Gender is required.',                                                   'category' => 'error'],
    ['message_key' => 'name_listing_type_required',   'message_value' => 'Name and listing type are required.',                                   'category' => 'error'],
    ['message_key' => 'product_type_exists_global',   'message_value' => 'Product type with this name already exists. Product type names must be unique across all listing types.', 'category' => 'error'],
    ['message_key' => 'product_type_exists',          'message_value' => 'Product type with this name already exists in this listing type.',      'category' => 'error'],
    ['message_key' => 'product_type_required',        'message_value' => 'At least one product type is required.',                                'category' => 'error'],
    ['message_key' => 'category_exists',              'message_value' => 'Category with this name already exists.',                               'category' => 'error'],
    ['message_key' => 'category_empty',               'message_value' => 'Category name cannot be empty.',                                        'category' => 'error'],
    ['message_key' => 'category_required',            'message_value' => 'At least one Category is required.',                                    'category' => 'error'],
    ['message_key' => 'subcategory_exists',           'message_value' => 'Sub-category with this name already exists.',                           'category' => 'error'],
    ['message_key' => 'subcategory_empty',            'message_value' => 'Sub-category name cannot be empty.',                                    'category' => 'error'],
    ['message_key' => 'color_exists',                 'message_value' => 'Color with this name already exists.',                                  'category' => 'error'],
    ['message_key' => 'color_hex_exists',             'message_value' => 'Color with this hex code already exists. Hex codes must be unique.',    'category' => 'error'],
    ['message_key' => 'invalid_table',                'message_value' => 'Invalid table.',                                                        'category' => 'error'],
    // ── PRODUCT UPLOAD ─────────────────────────────────────────────────────────
    ['message_key' => 'bill_upload_required',         'message_value' => "Please upload at least one bill image or uncheck 'I have a bill'.",    'category' => 'error'],
    ['message_key' => 'product_max_bills',            'message_value' => 'Maximum {max} bill uploads allowed.',                                   'category' => 'error'],
    ['message_key' => 'product_load_failed',          'message_value' => 'Failed to load product data for editing.',                              'category' => 'error'],
    ['message_key' => 'image_size_exceeded',          'message_value' => 'Image size exceeds maximum limit of {max}MB. Your image is {size}MB.', 'category' => 'error'],
    ['message_key' => 'upload_unexpected_error',      'message_value' => 'An unexpected error occurred during upload. Please check your connection.', 'category' => 'error'],
    ['message_key' => 'upload_failed',                'message_value' => 'Upload failed.',                                                        'category' => 'error'],
    ['message_key' => 'upload_valid_csv_required',    'message_value' => 'Please upload a valid CSV file.',                                       'category' => 'error'],
    ['message_key' => 'invalid_catalogue_type',       'message_value' => 'Invalid catalogue type.',                                               'category' => 'error'],
    ['message_key' => 'failed_read_csv',              'message_value' => 'Failed to read CSV file.',                                              'category' => 'error'],
    ['message_key' => 'csv_file_empty',               'message_value' => 'CSV file is empty.',                                                    'category' => 'error'],
    // ── BRAND / ADMIN ─────────────────────────────────────────────────────────
    ['message_key' => 'brand_name_seller_required',   'message_value' => 'Brand name and Seller are required.',                                   'category' => 'error'],
    ['message_key' => 'brand_name_exists',            'message_value' => 'Brand name already exists. Brand names must be unique.',                 'category' => 'error'],
    ['message_key' => 'brand_name_required',          'message_value' => 'Brand name is required.',                                               'category' => 'error'],
    ['message_key' => 'seller_has_brand_already',     'message_value' => 'Seller already has a brand. Each seller can have only one brand.',       'category' => 'error'],
    ['message_key' => 'no_data_to_update',            'message_value' => 'No data to update.',                                                    'category' => 'error'],
    ['message_key' => 'no_brand_selected',            'message_value' => 'No brand selected.',                                                    'category' => 'error'],
    ['message_key' => 'admin_updated_success',        'message_value' => 'Admin updated successfully.',                                           'category' => 'success'],
    ['message_key' => 'admin_not_found',              'message_value' => 'Admin not found.',                                                      'category' => 'error'],
    ['message_key' => 'name_email_required',          'message_value' => 'Name and email are required.',                                          'category' => 'error'],
    ['message_key' => 'email_already_exists',         'message_value' => 'Email already exists.',                                                 'category' => 'error'],
    ['message_key' => 'email_exists_another_user',    'message_value' => 'Email already exists for another user.',                                'category' => 'error'],
    ['message_key' => 'mobile_exists_another_user',   'message_value' => 'Mobile number already exists for another user.',                        'category' => 'error'],
    ['message_key' => 'alternate_mobile_exists',      'message_value' => 'Mobile number is already used as an alternate mobile by another user.', 'category' => 'error'],
    ['message_key' => 'mobile_same_as_alternate',     'message_value' => 'Mobile number cannot be the same as the alternate mobile number.',      'category' => 'error'],
    ['message_key' => 'name_required',                'message_value' => 'Name is required.',                                                     'category' => 'error'],
    ['message_key' => 'invalid_type',                 'message_value' => 'Invalid type.',                                                         'category' => 'error'],
    ['message_key' => 'invalid_status',               'message_value' => 'Invalid status.',                                                       'category' => 'error'],
    ['message_key' => 'missing_ad_id',                'message_value' => 'Missing ad ID.',                                                        'category' => 'error'],
    ['message_key' => 'report_not_found',             'message_value' => 'Report not found.',                                                     'category' => 'error'],
    ['message_key' => 'search_query_required',        'message_value' => 'Search query is required.',                                             'category' => 'error'],
    // ── ATTRIBUTES ────────────────────────────────────────────────────────────
    ['message_key' => 'attribute_name_required',      'message_value' => 'Attribute name is required.',                                           'category' => 'error'],
    ['message_key' => 'attribute_type_required',      'message_value' => 'Attribute type is required.',                                           'category' => 'error'],
    ['message_key' => 'allowed_values_required',      'message_value' => 'Allowed values are required for picklist type.',                         'category' => 'error'],
    ['message_key' => 'attribute_add_success',        'message_value' => 'Attribute added successfully.',                                         'category' => 'success'],
    ['message_key' => 'attribute_update_success',     'message_value' => 'Attribute updated successfully.',                                       'category' => 'success'],
    ['message_key' => 'attribute_delete_success',     'message_value' => 'Attribute deleted successfully.',                                       'category' => 'success'],
    ['message_key' => 'attribute_assign_fields_required', 'message_value' => 'Attribute ID, entity type, and entity ID are required.',            'category' => 'error'],
    ['message_key' => 'attribute_already_assigned',   'message_value' => 'Attribute is already assigned to this entity.',                         'category' => 'error'],
    ['message_key' => 'attribute_assign_success',     'message_value' => 'Attribute assigned successfully.',                                      'category' => 'success'],
    ['message_key' => 'assignment_update_success',    'message_value' => 'Assignment updated successfully.',                                      'category' => 'success'],
    ['message_key' => 'assignment_remove_success',    'message_value' => 'Assignment removed successfully.',                                      'category' => 'success'],
    // ── ZONE / PLAN ─────────────────────────────────────────────────────────
    ['message_key' => 'zone_name_required',           'message_value' => 'Zone name is required.',                                                'category' => 'error'],
    ['message_key' => 'state_required_for_zone',      'message_value' => 'State is required for zone restriction.',                               'category' => 'error'],
    ['message_key' => 'user_and_plan_required',       'message_value' => 'User and plan are required.',                                           'category' => 'error'],
    ['message_key' => 'plan_not_found',               'message_value' => 'Plan not found.',                                                       'category' => 'error'],
    ['message_key' => 'both_dates_required',          'message_value' => 'Both dates are required.',                                              'category' => 'error'],
    // ── CMS / SEO ─────────────────────────────────────────────────────────────
    ['message_key' => 'slug_title_required',          'message_value' => 'Slug and title are required.',                                          'category' => 'error'],
    ['message_key' => 'page_slug_exists',             'message_value' => 'A page with this slug already exists.',                                 'category' => 'error'],
    ['message_key' => 'page_name_route_required',     'message_value' => 'Page name and route path are required.',                                'category' => 'error'],
    ['message_key' => 'seo_setting_route_exists',     'message_value' => 'SEO setting for this page route already exists.',                       'category' => 'error'],
    ['message_key' => 'seo_setting_create_success',   'message_value' => 'New page SEO setting created successfully.',                            'category' => 'success'],
    ['message_key' => 'seo_setting_not_found',        'message_value' => 'SEO setting not found.',                                               'category' => 'error'],
    ['message_key' => 'seo_setting_delete_success',   'message_value' => 'SEO setting deleted successfully.',                                     'category' => 'success'],
    // ── VALIDATION RULES ──────────────────────────────────────────────────────
    ['message_key' => 'validation_field_label_required', 'message_value' => 'Field name and label are required.',                                 'category' => 'error'],
    ['message_key' => 'validation_rule_exists',       'message_value' => 'Validation rule for this field already exists.',                         'category' => 'error'],
    ['message_key' => 'validation_rule_create_success', 'message_value' => 'Validation rule created successfully.',                               'category' => 'success'],
    ['message_key' => 'validation_rule_not_found',    'message_value' => 'Validation rule not found.',                                            'category' => 'error'],
    ['message_key' => 'validation_rule_update_success', 'message_value' => 'Validation rule updated successfully.',                               'category' => 'success'],
    ['message_key' => 'validation_rule_delete_success', 'message_value' => 'Validation rule deleted successfully.',                               'category' => 'success'],
    // ── AUTH / FORM ────────────────────────────────────────────────────────────
    ['message_key' => 'passwords_do_not_match',       'message_value' => 'Passwords do not match.',                                               'category' => 'error'],
    ['message_key' => 'please_fix_form_errors',       'message_value' => 'Please fix the errors before submitting.',                              'category' => 'error'],
    // ── APP MESSAGES MANAGEMENT ────────────────────────────────────────────────
    ['message_key' => 'message_value_blank',          'message_value' => 'Message value cannot be blank.',                                        'category' => 'error'],
    ['message_key' => 'message_key_create_not_allowed', 'message_value' => 'Creating new message keys is not allowed. Message keys are system-defined.', 'category' => 'error'],
    ['message_key' => 'message_key_delete_not_allowed', 'message_value' => 'Deleting message keys is not allowed. Message keys are system-defined.', 'category' => 'error'],
    ['message_key' => 'error_message_not_found',      'message_value' => 'Error message not found.',                                              'category' => 'error'],
    // ── BUSINESS SETTINGS ─────────────────────────────────────────────────────
    ['message_key' => 'save_settings_first',          'message_value' => 'Save settings first.',                                                  'category' => 'warning'],
    ['message_key' => 'name_and_value_required',      'message_value' => 'Name and value are required.',                                          'category' => 'error'],
    ['message_key' => 'charge_deleted',               'message_value' => 'Charge deleted.',                                                       'category' => 'success'],
    ['message_key' => 'delete_failed',                'message_value' => 'Failed to delete.',                                                     'category' => 'error'],
    ['message_key' => 'question_and_answer_required', 'message_value' => 'Question and Answer are required.',                                     'category' => 'error'],
    ['message_key' => 'faq_deleted',                  'message_value' => 'FAQ deleted.',                                                          'category' => 'success'],
    ['message_key' => 'template_text_empty',          'message_value' => 'Template text cannot be empty.',                                        'category' => 'error'],
    ['message_key' => 'template_deleted',             'message_value' => 'Template deleted.',                                                     'category' => 'success'],
    // ── PRICING RULES ─────────────────────────────────────────────────────────
    ['message_key' => 'deleted_success',              'message_value' => 'Deleted successfully.',                                                  'category' => 'success'],
    ['message_key' => 'status_updated',               'message_value' => 'Status updated.',                                                       'category' => 'success'],
    ['message_key' => 'status_update_failed',         'message_value' => 'Failed to update status.',                                              'category' => 'error'],
    // ── BUYER / SELLER PRIVILEGES ─────────────────────────────────────────────
    ['message_key' => 'buyer_privileges_restricted',  'message_value' => 'Your buyer privileges have been restricted by the administrator.',       'category' => 'warning'],
    ['message_key' => 'seller_privileges_restricted', 'message_value' => 'Your seller privileges have been restricted by the administrator.',      'category' => 'warning'],
    ['message_key' => 'seller_privileges_restricted_redirect', 'message_value' => 'Your seller privileges have been restricted. Redirecting to browse market.', 'category' => 'warning'],
    ['message_key' => 'csv_upload_failed',            'message_value' => 'Upload failed.',                                                        'category' => 'error'],
];

$inserted = 0;
$skipped = 0;
$now = date('Y-m-d H:i:s');

foreach ($messages as $msg) {
    $exists = $db->table('app_messages')
        ->where('message_key', $msg['message_key'])
        ->countAllResults();

    if ($exists === 0) {
        $db->table('app_messages')->insert([
            'message_key'   => $msg['message_key'],
            'message_value' => $msg['message_value'],
            'category'      => $msg['category'],
            'created_at'    => $now,
            'updated_at'    => $now,
        ]);
        echo "  INSERTED: {$msg['message_key']}\n";
        $inserted++;
    } else {
        echo "  SKIPPED:  {$msg['message_key']}\n";
        $skipped++;
    }
}

echo "\nDone. Inserted: $inserted | Skipped: $skipped\n";
