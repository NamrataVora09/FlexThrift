<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */

// ── CORS preflight ──────────────────────────────────
$routes->options('api/(:any)', static function () {
    return service('response')->setStatusCode(200);
});

// ── REST API v1 (Standard) ───────────────────────────
$routes->group('api/v1', ['filter' => 'api_cors'], function ($routes) {
    register_api_routes($routes);
});

// ── REST API Fallback (No v1) ─────────────────────────
$routes->group('api', ['filter' => 'api_cors'], function ($routes) {
    register_api_routes($routes);
});

/**
 * Helper to register all API routes in both groups
 */
function register_api_routes($routes)
{

    // Auth (public)
    $routes->post('auth/login', 'Api\AuthApi::login');
    $routes->post('auth/send-otp', 'Api\AuthApi::sendOtp');
    $routes->post('auth/verify-otp', 'Api\AuthApi::verifyOtp');
    $routes->post('auth/register', 'Api\AuthApi::register');
    $routes->post('auth/google-login', 'Api\AuthApi::googleLogin');

    // Public landing page content
    $routes->get('landing-content', 'Api\SharedApi::landingContent');
    $routes->get('featured-products', 'Api\SharedApi::featuredProducts');

    // Public product browsing (no login required)
    $routes->get('browse', 'Api\BuyerApi::browse');
    $routes->get('product/(:num)', 'Api\BuyerApi::productDetails/$1');
    $routes->get('product/(:num)/similar', 'Api\BuyerApi::similarProducts/$1');
    $routes->get('product/(:num)/booked-dates', 'Api\BuyerApi::getBookedDates/$1');
    $routes->get('taxonomy', 'Api\SharedApi::taxonomy');
    $routes->get('listing-types', 'Api\SharedApi::listingTypes');
    $routes->get('pricing-rules', 'Api\SharedApi::pricingRules');
    $routes->get('rental-pricing-rules', 'Api\SharedApi::rentalPricingRules');
    $routes->get('subscriptions/(:any)', 'Api\SharedApi::subscriptions/$1');
    $routes->get('admin-subscription-plans', 'Api\SharedApi::adminSubscriptionPlans');
    $routes->get('business-settings', 'Api\SharedApi::businessSettings');
    $routes->get('coupons', 'Api\SharedApi::coupons');

    $routes->get('cms-page/(:any)', 'Api\SharedApi::cmsPage/$1');
    $routes->get('cms-pages', 'Api\SharedApi::cmsPages');

    // Auth (protected)
    $routes->group('auth', ['filter' => 'jwt'], function ($routes) {
        $routes->get('me', 'Api\AuthApi::me');
        $routes->get('referral-stats', 'Api\AuthApi::referralStats');
        $routes->post('switch-role/(:any)', 'Api\AuthApi::switchRole/$1');
    });

    // Buyer API (protected)
    $routes->group('buyer', ['filter' => 'jwt'], function ($routes) {
        $routes->get('dashboard', 'Api\BuyerApi::dashboard');
        $routes->get('browse', 'Api\BuyerApi::browse');
        $routes->get('product/(:num)', 'Api\BuyerApi::productDetails/$1');
        $routes->get('my-offers', 'Api\BuyerApi::myOffers');
        $routes->get('offer-status/(:num)', 'Api\BuyerApi::offerStatus/$1');
        $routes->get('my-orders', 'Api\BuyerApi::myOrders');
        $routes->get('notifications', 'Api\BuyerApi::notifications');
        $routes->get('transactions', 'Api\BuyerApi::transactions');
        $routes->post('make-offer', 'Api\BuyerApi::makeOffer');
        $routes->post('cancel-offer/(:num)', 'Api\BuyerApi::cancelOffer/$1');
        $routes->post('update-offer-dates/(:num)', 'Api\BuyerApi::updateOfferDates/$1');
        $routes->post('confirm-delivery/(:num)', 'Api\BuyerApi::confirmDelivery/$1');
        $routes->post('cancel-order/(:num)', 'Api\BuyerApi::cancelOrder/$1');
        $routes->post('submit-review', 'Api\BuyerApi::submitReview');
        $routes->get('order/(:num)', 'Api\BuyerApi::orderDetail/$1');
        $routes->post('pay-order/(:num)', 'Api\BuyerApi::payOrder/$1');
        $routes->post('confirmDateChange/(:num)', 'Api\BuyerApi::confirmDateChange/$1');
        $routes->post('rate-seller', 'Api\BuyerApi::rateSeller');
        $routes->post('rate-self-delivery-seller', 'Api\BuyerApi::rateSelfDeliverySeller');
        $routes->post('mark-notifications-read', 'Api\BuyerApi::markNotificationsRead');
        $routes->get('offer-messages/(:num)', 'Api\BuyerApi::getOfferMessages/$1');
        $routes->post('offer-messages/(:num)', 'Api\BuyerApi::sendOfferMessage/$1');
        $routes->post('offer-messages/(:num)/upload', 'Api\BuyerApi::uploadOfferMedia/$1');
        $routes->post('report-user/(:num)', 'Api\BuyerApi::reportUser/$1');
        $routes->post('view-seller-contact/(:num)', 'Api\BuyerApi::viewSellerContact/$1');
        $routes->post('block-seller/(:num)', 'Api\BuyerApi::blockSeller/$1');
        $routes->post('unblock-seller/(:num)', 'Api\BuyerApi::unblockSeller/$1');
        $routes->get('blocked-sellers', 'Api\BuyerApi::blockedSellers');
        // Subscription / Payment
        $routes->get('subscriptions/(:any)', 'Api\SharedApi::subscriptions/$1');
        $routes->get('plan-checkout-details/(:num)', 'Api\BuyerApi::planCheckoutDetails/$1');
        $routes->post('apply-coupon', 'Api\BuyerApi::applyCoupon');
        $routes->post('initiate-payment', 'Api\BuyerApi::initiatePayment');
        $routes->post('initiate-order-payment', 'Api\BuyerApi::initiateOrderPayment');
    });

    // Public/Semi-public Subscription check
    $routes->get('buyer/verify-payment', 'Api\BuyerApi::verifyPayment');
    $routes->get('buyer/verify-order-payment', 'Api\BuyerApi::verifyOrderPayment');

    // Seller API (protected)
    $routes->group('seller', ['filter' => 'jwt'], function ($routes) {
        $routes->get('dashboard', 'Api\SellerApi::dashboard');
        $routes->get('my-products', 'Api\SellerApi::myProducts');
        $routes->get('offers', 'Api\SellerApi::offers');
        $routes->get('orders', 'Api\SellerApi::orders');
        $routes->get('notifications', 'Api\SellerApi::notifications');
        $routes->get('transactions', 'Api\SellerApi::transactions');
        $routes->get('upload-form-data', 'Api\SellerApi::uploadFormData');
        $routes->post('upload-product', 'Api\SellerApi::uploadProduct');
        $routes->post('update-product/(:num)', 'Api\SellerApi::updateProduct/$1');
        $routes->post('accept-offer/(:num)', 'Api\SellerApi::acceptOffer/$1');
        $routes->post('reject-offer/(:num)', 'Api\SellerApi::rejectOffer/$1');
        $routes->post('suggest-dates/(:num)', 'Api\SellerApi::suggestDates/$1');
        $routes->post('mark-dispatched/(:num)', 'Api\SellerApi::markDispatched/$1');
        $routes->post('confirm-delivery/(:num)', 'Api\SellerApi::confirmDelivery/$1');
        $routes->post('delete-product/(:num)', 'Api\SellerApi::deleteProduct/$1');
        $routes->post('edit-product/(:num)', 'Api\SellerApi::editProduct/$1');
        $routes->get('product/(:num)', 'Api\SellerApi::productDetail/$1');
        $routes->post('report-user/(:num)', 'Api\SellerApi::reportUser/$1');
        $routes->post('rate-buyer', 'Api\SellerApi::rateBuyer');
        // Subscription routes
        $routes->get('subscriptions/(:any)', 'Api\SharedApi::subscriptions/$1');
        $routes->get('plan-checkout-details/(:num)', 'Api\SellerApi::planCheckoutDetails/$1');
        $routes->post('apply-coupon', 'Api\SellerApi::applyCoupon');
        $routes->post('initiate-payment', 'Api\SellerApi::initiatePayment');
    });
    $routes->get('seller/verify-payment', 'Api\SellerApi::verifyPayment');

    // Shared API (protected)
    $routes->group('shared', ['filter' => 'jwt'], function ($routes) {
        $routes->get('listing-types', 'Api\SharedApi::listingTypes');
        $routes->get('categories/(:num)', 'Api\SharedApi::categories/$1');
        $routes->get('subcategories/(:num)', 'Api\SharedApi::subcategories/$1');
        $routes->post('approve-product/(:num)', 'Api\SharedApi::approveProduct/$1');
        $routes->post('reject-product/(:num)', 'Api\SharedApi::rejectProduct/$1');
        $routes->post('toggle-user-status/(:num)', 'Api\SharedApi::toggleUserStatus/$1');
        $routes->get('subscriptions/(:any)', 'Api\SharedApi::subscriptions/$1');
        $routes->get('subscription-plans/(:any)', 'Api\SharedApi::subscriptionPlans/$1');
        $routes->get('analytics', 'Api\SharedApi::analytics');
        $routes->get('business-settings', 'Api\SharedApi::businessSettings');
        $routes->post('business-settings', 'Api\SharedApi::saveBusinessSettings');
        $routes->post('update-app-message/(:num)', 'Api\SharedApi::updateAppMessage/$1');
        $routes->post('add-app-message', 'Api\SharedApi::addAppMessage');
        $routes->post('delete-app-message/(:num)', 'Api\SharedApi::deleteAppMessage/$1');
        $routes->get('admin-subscription-plans', 'Api\SharedApi::adminSubscriptionPlans');
        $routes->post('admin-subscription-plans', 'Api\SharedApi::createSubscriptionPlan');
        $routes->post('admin-subscription-plans/(:num)/toggle', 'Api\SharedApi::togglePlanStatus/$1');
        $routes->post('admin-subscription-plans/(:num)/toggle-featured', 'Api\SharedApi::togglePlanFeatured/$1');
        $routes->post('admin-subscription-plans/(:num)/toggle-most-selected', 'Api\SharedApi::toggleMostSelected/$1');
        $routes->post('admin-subscription-plans/(:num)/update', 'Api\SharedApi::updateSubscriptionPlan/$1');
        $routes->post('admin-subscription-plans/(:num)/delete', 'Api\SharedApi::deleteSubscriptionPlan/$1');
        $routes->get('moderation-history', 'Api\SharedApi::moderationHistory');
        $routes->get('brands', 'Api\SharedApi::brands');
        $routes->post('brands', 'Api\SharedApi::createBrand');
        $routes->get('original-brands', 'Api\SharedApi::originalBrands');
        $routes->get('user-subscriptions', 'Api\SharedApi::userSubscriptions');
        $routes->get('coupons', 'Api\SharedApi::coupons');
        $routes->post('coupons', 'Api\SharedApi::createCoupon');
        $routes->post('coupons/(:num)/update', 'Api\SharedApi::updateCoupon/$1');
        $routes->post('coupons/(:num)/toggle', 'Api\SharedApi::toggleCoupon/$1');
        $routes->post('coupons/(:num)/delete', 'Api\SharedApi::deleteCoupon/$1');
        $routes->get('financial-reports', 'Api\SharedApi::financialReports');
        $routes->get('advertisements', 'Api\SharedApi::advertisements');
        $routes->get('zones', 'Api\SharedApi::zones');
        $routes->get('cms-pages', 'Api\SharedApi::cmsPages');
        $routes->post('cms-pages', 'Api\SharedApi::saveCmsPage');

        $routes->get('faqs', 'Api\SharedApi::faqs');
        $routes->get('support-info', 'Api\SharedApi::supportInfo');
        $routes->post('faqs', 'Api\SharedApi::createFaq');
        $routes->post('faqs/(:num)/update', 'Api\SharedApi::updateFaq/$1');
        $routes->post('faqs/(:num)/delete', 'Api\SharedApi::deleteFaq/$1');

        $routes->get('taxonomy', 'Api\SharedApi::taxonomy');
        $routes->get('contacted-sellers', 'Api\SharedApi::contactedSellers');
        $routes->get('transactions-reports', 'Api\SharedApi::transactionsReports');
        $routes->post('purchase-subscription', 'Api\SharedApi::purchaseSubscription');
        $routes->post('update-profile', 'Api\SharedApi::updateProfile');
        $routes->post('upload-profile-image', 'Api\SharedApi::uploadProfileImage');
        $routes->post('upload-kyc', 'Api\SharedApi::uploadKyc');
    });

    // Admin API (protected)
    $routes->group('admin', ['filter' => 'jwt'], function ($routes) {
        $routes->get('subscriptions/(:any)', 'Api\SharedApi::subscriptions/$1');
        $routes->get('plan-checkout-details/(:num)', 'Api\AdminApi::planCheckoutDetails/$1');
        $routes->post('apply-coupon', 'Api\AdminApi::applyCoupon');
        $routes->post('initiate-payment', 'Api\AdminApi::initiatePayment');
        $routes->get('payment-callback', 'Api\AdminApi::verifyPayment');
        $routes->get('verify-payment', 'Api\AdminApi::verifyPayment');
        $routes->get('dashboard', 'Api\AdminApi::dashboard');
        $routes->get('pending-products', 'Api\AdminApi::pendingProducts');
        $routes->get('users', 'Api\AdminApi::users');
        $routes->get('user-reports', 'Api\AdminApi::getUserReports');
        $routes->post('handle-report/(:num)', 'Api\AdminApi::handleReport/$1');
        $routes->get('get-edit-requests', 'Api\AdminApi::getEditRequests');
        $routes->get('get-rejection-templates', 'Api\AdminApi::getRejectionTemplates');
        $routes->get('rejection-templates', 'Api\AdminApi::getRejectionTemplates');
        $routes->get('get-product-detail/(:num)', 'Api\AdminApi::getProductDetail/$1');
        $routes->get('get-edit-comparison/(:num)', 'Api\AdminApi::getEditComparison/$1');
        $routes->post('approve-edit-request/(:num)', 'Api\AdminApi::approveEditRequest/$1');
        $routes->post('reject-edit-request/(:num)', 'Api\AdminApi::rejectEditRequest/$1');
        $routes->get('all-offers', 'Api\AdminApi::allOffers');
        $routes->get('personal-offers', 'Api\AdminApi::personalOffers');
        $routes->post('toggle-user-status/(:num)', 'Api\AdminApi::toggleUserStatus/$1');
        $routes->post('toggle-role-block/(:num)/(:any)', 'Api\AdminApi::toggleRoleBlock/$1/$2');
        $routes->get('user-audit-logs/(:num)', 'Api\AdminApi::userAuditLogs/$1');
    });

    // SuperAdmin API (protected)
    $routes->group('superadmin', ['filter' => 'jwt'], function ($routes) {
        $routes->get('subscriptions/(:any)', 'Api\SharedApi::subscriptions/$1');
        $routes->get('dashboard', 'Api\SuperAdminApi::dashboard');
        $routes->get('all-offers', 'Api\SuperAdminApi::allOffers');
        $routes->get('personal-offers', 'Api\SuperAdminApi::personalOffers');
        // Fee Management
        $routes->get('platform-charges', 'Api\SuperAdminApi::platformCharges');
        $routes->post('create-charge', 'Api\SuperAdminApi::createCharge');
        $routes->post('update-charge/(:num)', 'Api\SuperAdminApi::updateCharge/$1');
        $routes->post('delete-charge/(:num)', 'Api\SuperAdminApi::deleteCharge/$1');
        // Rejection Templates
        $routes->get('get-rejection-templates', 'Api\SuperAdminApi::getRejectionTemplates');
        $routes->get('rejection-templates', 'Api\SuperAdminApi::getRejectionTemplates');
        $routes->post('add-rejection-template', 'Api\SuperAdminApi::addRejectionTemplate');
        $routes->post('update-rejection-template/(:num)', 'Api\SuperAdminApi::updateRejectionTemplate/$1');
        $routes->post('delete-rejection-template/(:num)', 'Api\SuperAdminApi::deleteRejectionTemplate/$1');
        // Pricing Rules
        $routes->get('all-pricing-rules', 'Api\SuperAdminApi::allPricingRules');
        $routes->get('all-rental-pricing-rules', 'Api\SuperAdminApi::allRentalPricingRules');
        $routes->post('save-pricing-rule', 'Api\SuperAdminApi::savePricingRule');
        $routes->post('delete-pricing-rule/(:num)', 'Api\SuperAdminApi::deletePricingRule/$1');
        $routes->post('toggle-pricing-rule/(:num)', 'Api\SuperAdminApi::togglePricingRule/$1');
        $routes->post('save-rental-pricing-rule', 'Api\SuperAdminApi::saveRentalPricingRule');
        $routes->post('delete-rental-pricing-rule/(:num)', 'Api\SuperAdminApi::deleteRentalPricingRule/$1');
        $routes->post('toggle-rental-pricing-rule/(:num)', 'Api\SuperAdminApi::toggleRentalPricingRule/$1');
        $routes->post('bulk-delete-pricing-rules', 'Api\SuperAdminApi::bulkDeletePricingRules');
        $routes->post('bulk-toggle-pricing-rules', 'Api\SuperAdminApi::bulkTogglePricingRules');
        // Users & Admins
        $routes->get('users', 'Api\SuperAdminApi::users');
        $routes->get('admins', 'Api\SuperAdminApi::admins');
        $routes->post('create-admin', 'Api\SuperAdminApi::createAdmin');
        $routes->post('toggle-admin-status/(:num)', 'Api\SuperAdminApi::toggleAdminStatus/$1');
        $routes->post('delete-admin/(:num)', 'Api\SuperAdminApi::deleteAdmin/$1');
        $routes->post('toggle-admin-rights/(:num)/(:any)', 'Api\SuperAdminApi::toggleAdminRights/$1/$2');
        $routes->post('bulk-toggle-admin-rights', 'Api\SuperAdminApi::bulkToggleAdminRights');
        $routes->get('user-reports', 'Api\SuperAdminApi::getUserReports');
        $routes->post('handle-report/(:num)', 'Api\SuperAdminApi::handleReport/$1');
        $routes->post('toggle-user-status/(:num)', 'Api\SuperAdminApi::toggleUserStatus/$1');
        $routes->post('toggle-role-block/(:num)/(:any)', 'Api\SuperAdminApi::toggleRoleBlock/$1/$2');
        $routes->get('user-audit-logs/(:num)', 'Api\SuperAdminApi::userAuditLogs/$1');
        // Products
        $routes->get('pending-products', 'Api\SuperAdminApi::pendingProducts');
        $routes->get('all-products', 'Api\SuperAdminApi::allProducts');
        $routes->post('update-product-status/(:num)', 'Api\SuperAdminApi::updateProductStatus/$1');
        $routes->post('delete-product/(:num)', 'Api\SuperAdminApi::deleteProduct/$1');
        $routes->post('bulk-delete-rejected', 'Api\SuperAdminApi::bulkDeleteRejected');
        $routes->post('toggle-featured/(:num)', 'Api\SuperAdminApi::toggleFeatured/$1');
        $routes->get('get-product-detail/(:num)', 'Api\SuperAdminApi::getProductDetail/$1');
        $routes->get('get-product-images/(:num)', 'Api\SuperAdminApi::getProductImages/$1');
        $routes->get('get-edit-requests', 'Api\SuperAdminApi::getEditRequests');
        $routes->get('get-edit-comparison/(:num)', 'Api\SuperAdminApi::getEditComparison/$1');
        $routes->post('approve-edit-request/(:num)', 'Api\SuperAdminApi::approveEditRequest/$1');
        $routes->post('reject-edit-request/(:num)', 'Api\SuperAdminApi::rejectEditRequest/$1');
        // Taxonomy CRUD
        $routes->post('add-listing-type', 'Api\SuperAdminApi::addListingType');
        $routes->post('add-gender', 'Api\SuperAdminApi::addGender');
        $routes->post('add-product-type', 'Api\SuperAdminApi::addProductType');
        $routes->post('add-category', 'Api\SuperAdminApi::addCategory');
        $routes->post('add-sub-category', 'Api\SuperAdminApi::addSubCategory');
        $routes->post('add-color', 'Api\SuperAdminApi::addColor');
        $routes->post('remove-taxonomy/(:any)/(:num)', 'Api\SuperAdminApi::removeTaxonomy/$1/$2');
        $routes->post('update-listing-type/(:num)', 'Api\SuperAdminApi::updateListingType/$1');
        $routes->post('update-gender/(:num)', 'Api\SuperAdminApi::updateGender/$1');
        $routes->post('update-product-type/(:num)', 'Api\SuperAdminApi::updateProductType/$1');
        $routes->post('update-category/(:num)', 'Api\SuperAdminApi::updateCategory/$1');
        $routes->post('update-sub-category/(:num)', 'Api\SuperAdminApi::updateSubCategory/$1');
        $routes->post('update-color/(:num)', 'Api\SuperAdminApi::updateColor/$1');
        // Brands
        $routes->get('brands', 'Api\SuperAdminApi::sellerBrands');
        $routes->post('create-brand', 'Api\SuperAdminApi::createSellerBrand');
        $routes->post('update-brand/(:num)', 'Api\SuperAdminApi::updateSellerBrand/$1');
        $routes->post('delete-brand/(:num)', 'Api\SuperAdminApi::deleteSellerBrand/$1');
        $routes->post('deactivate-brand/(:num)', 'Api\SuperAdminApi::deactivateSellerBrand/$1');
        $routes->post('activate-brand/(:num)', 'Api\SuperAdminApi::activateSellerBrand/$1');
        $routes->post('block-brand/(:num)', 'Api\SuperAdminApi::blockSellerBrand/$1');
        $routes->post('unblock-brand/(:num)', 'Api\SuperAdminApi::unblockSellerBrand/$1');
        $routes->get('sellers-list', 'Api\SuperAdminApi::sellersList');
        $routes->get('get-products-by-user/(:num)', 'Api\SuperAdminApi::getProductsByUser/$1');
        $routes->post('bulk-tag-products', 'Api\SuperAdminApi::bulkTagProducts');
        // Original Brands
        $routes->get('original-brands', 'Api\SuperAdminApi::originalBrandsList');
        $routes->post('add-original-brand', 'Api\SuperAdminApi::addOriginalBrand');
        $routes->post('update-original-brand/(:num)', 'Api\SuperAdminApi::updateOriginalBrand/$1');
        $routes->post('delete-original-brand/(:num)', 'Api\SuperAdminApi::deleteOriginalBrandLegacy/$1');
        // User Subscriptions
        $routes->get('user-subscriptions', 'Api\SuperAdminApi::userSubscriptions');
        $routes->post('assign-subscription', 'Api\SuperAdminApi::assignSubscription');
        // Advertisements
        $routes->get('advertisements', 'Api\SuperAdminApi::advertisements');
        $routes->post('upload-advertisement', 'Api\SuperAdminApi::uploadAdvertisement');
        $routes->post('update-advertisement', 'Api\SuperAdminApi::updateAdvertisement');
        $routes->get('get-advertisement/(:num)', 'Api\SuperAdminApi::getAdvertisement/$1');
        $routes->post('toggle-advertisement/(:num)', 'Api\SuperAdminApi::toggleAdvertisement/$1');
        $routes->post('delete-advertisement/(:num)', 'Api\SuperAdminApi::deleteAdvertisement/$1');
        // Zones
        $routes->get('zones', 'Api\SuperAdminApi::zones');
        $routes->post('add-zone', 'Api\SuperAdminApi::addZone');
        $routes->post('toggle-zone/(:num)', 'Api\SuperAdminApi::toggleZone/$1');
        $routes->post('delete-zone/(:num)', 'Api\SuperAdminApi::deleteZone/$1');
        $routes->get('registration-attempts', 'Api\SuperAdminApi::registrationAttempts');
        // Settings, CMS, Financial
        $routes->get('system-settings', 'Api\SuperAdminApi::systemSettings');
        $routes->post('update-settings', 'Api\SuperAdminApi::updateSettings');
        $routes->post('mark-missed-offers', 'Api\SuperAdminApi::markMissedOffers');
        $routes->post('update-landing-content', 'Api\SuperAdminApi::updateLandingContent');
        $routes->get('cms-pages', 'Api\SuperAdminApi::cmsPages');
        $routes->get('cms-page/(:any)', 'Api\SuperAdminApi::cmsPage/$1');
        $routes->post('create-cms-page', 'Api\SuperAdminApi::createCmsPage');
        $routes->post('update-cms-page/(:any)', 'Api\SuperAdminApi::updateCmsPage/$1');
        $routes->post('delete-cms-page/(:num)', 'Api\SuperAdminApi::deleteCmsPage/$1');
        $routes->get('financial-reports', 'Api\SuperAdminApi::financialReports');
        $routes->get('reports', 'Api\SuperAdminApi::reports');
        // Bulk uploads
        $routes->post('bulk-upload-catalogue', 'Api\SuperAdminApi::bulkUploadCatalogue');
        $routes->post('bulk-upload-brands', 'Api\SuperAdminApi::bulkUploadBrands');
        $routes->post('bulk-upload-original-brands', 'Api\SuperAdminApi::bulkUploadOriginalBrands');
        $routes->post('bulk-upload-products', 'Api\SuperAdminApi::bulkUploadProducts');
        $routes->post('bulk-upload-coupons', 'Api\SuperAdminApi::bulkUploadCoupons');
        $routes->post('bulk-upload-subscription-plans', 'Api\SuperAdminApi::bulkUploadSubscriptionPlans');
        // Error Messages
        $routes->get('error-messages', 'Api\SuperAdminApi::getAllErrorMessages');
        $routes->post('error-messages', 'Api\SuperAdminApi::createErrorMessage');
        $routes->post('error-messages/(:num)', 'Api\SuperAdminApi::updateErrorMessage/$1');
        $routes->delete('error-messages/(:num)', 'Api\SuperAdminApi::deleteErrorMessage/$1');
        $routes->get('error-messages/category/(:any)', 'Api\SuperAdminApi::getErrorMessagesByCategory/$1');
        // Payment Gateway
        $routes->post('test-phonepe', 'Api\SuperAdminApi::testPhonePeConnection');
        $routes->post('upload-landing-card-image', 'Api\SuperAdminApi::uploadLandingCardImage');
    });

    // Delivery API (protected)
    $routes->group('delivery', ['filter' => 'jwt'], function ($routes) {
        $routes->get('dashboard', 'Api\DeliveryApi::dashboard');
        $routes->get('history', 'Api\DeliveryApi::history');
        $routes->get('earnings', 'Api\DeliveryApi::earnings');
        $routes->get('pending-deliveries', 'Api\DeliveryApi::pendingDeliveries');
        $routes->post('accept-delivery/(:num)', 'Api\DeliveryApi::acceptDelivery/$1');
        $routes->post('picked-up/(:num)', 'Api\DeliveryApi::pickedUp/$1');
        $routes->post('mark-delivered/(:num)', 'Api\DeliveryApi::markDelivered/$1');
        $routes->post('update-profile', 'Api\DeliveryApi::updateProfile');
    });
}
