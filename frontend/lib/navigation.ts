export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  target?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export function getNavigation(role: string): NavSection[] {
  switch (role) {
    case 'buyer':
      return [
        {
          items: [
            { label: 'Dashboard', href: '/buyer/dashboard', icon: 'fa fa-chart-pie' },
            { label: 'Profile', href: '/buyer/profile', icon: 'fa fa-user' },
            { label: 'Subscription', href: '/buyer/subscriptions', icon: 'fa fa-credit-card' },
            { label: 'Browse Market', href: '/buyer/browse', icon: 'fa-solid fa-magnifying-glass', target: '_blank' },
            { label: 'Contacts', href: '/buyer/contacts', icon: 'fa-solid fa-address-book' },
            { label: 'Offers', href: '/buyer/my-offers', icon: 'fa fa-tags' },
            { label: 'Notifications', href: '/buyer/notifications', icon: 'fa fa-bell' },
            { label: 'Transactions', href: '/buyer/transactions', icon: 'fa fa-receipt' },
            { label: 'Help & Support', href: '/buyer/help', icon: 'fa fa-circle-question' },
          ],
        },
      ];

    case 'seller':
      return [
        {
          items: [
            { label: 'Dashboard', href: '/seller', icon: 'fa fa-chart-pie' },
            { label: 'Subscription', href: '/seller/subscriptions', icon: 'fa fa-credit-card' },
            { label: 'Upload Product', href: '/seller/upload-product', icon: 'fa fa-upload' },
            { label: 'My Products', href: '/seller/my-products', icon: 'fa fa-box' },
            { label: 'Analytics', href: '/seller/analytics', icon: 'fa fa-chart-line' },
            { label: 'Offers', href: '/seller/offers', icon: 'fa fa-tags' },
            { label: 'Notifications', href: '/seller/notifications', icon: 'fa fa-bell' },
            { label: 'Transactions', href: '/seller/transactions', icon: 'fa fa-receipt' },
            { label: 'Help & Support', href: '/seller/help', icon: 'fa fa-circle-question' },
          ],
        },
      ];

    case 'admin':
      return [
        {
          items: [
            { label: 'Dashboard', href: '/admin', icon: 'bi bi-speedometer2' },
          ],
        },
        {
          title: 'Moderation',
          items: [
            { label: 'Pending Approvals', href: '/admin/pending-products', icon: 'bi bi-hourglass-split' },
            { label: 'Moderation History', href: '/admin/moderation-history', icon: 'bi bi-clock-history' },
          ],
        },
        {
          title: 'Product Management',
          items: [
            { label: 'Upload Product', href: '/admin/upload-product', icon: 'bi bi-cloud-upload' },
            { label: 'My Products', href: '/admin/my-products', icon: 'bi bi-box-seam' },
            { label: 'Offers', href: '/admin/offers', icon: 'bi bi-tags' },
            { label: 'All Offers On Platform', href: '/admin/all-platform-offers', icon: 'bi bi-globe' },
          ],
        },
        {
          title: 'Users',
          items: [
            { label: 'Manage Users', href: '/admin/users', icon: 'bi bi-people' },
          ],
        },
        {
          title: 'Quick Links',
          items: [
            { label: 'Browse Market', href: '/buyer/dashboard', icon: 'bi bi-shop-window', target: '_blank' },
          ],
        },
      ];

    case 'super_admin':
      return [
        {
          title: 'Main',
          items: [
            { label: 'Dashboard', href: '/superadmin', icon: 'bi bi-grid-fill' },
            { label: 'Offers', href: '/superadmin/personal-offers', icon: 'bi bi-tags' },
          ],
        },
        {
          title: 'User Management',
          items: [
            { label: 'Users', href: '/superadmin/users', icon: 'bi bi-people-fill' },
            { label: 'Admins', href: '/superadmin/admins', icon: 'bi bi-person-badge-fill' },
          ],
        },
        {
          title: 'Business Tools',
          items: [
            { label: 'Catalogue', href: '/superadmin/taxonomy', icon: 'bi bi-tags-fill' },
            { label: 'Brands', href: '/superadmin/brands', icon: 'bi bi-patch-check-fill' },
            { label: 'Original Brands', href: '/superadmin/original-brands', icon: 'bi bi-shield-check' },
            { label: 'Business Settings', href: '/superadmin/business-settings', icon: 'bi bi-briefcase-fill' },
            { label: 'Subscription Plans', href: '/superadmin/subscription-plans', icon: 'bi bi-card-checklist' },
            { label: 'User Subscriptions', href: '/superadmin/user-subscriptions', icon: 'bi bi-person-check-fill' },
            { label: 'Coupons', href: '/superadmin/coupons', icon: 'bi bi-ticket-perforated-fill' },
            { label: 'Fee Management', href: '/superadmin/fee-management', icon: 'bi bi-cash-coin' },
            { label: 'Financial Reports', href: '/superadmin/transactions', icon: 'bi bi-graph-up-arrow' },
            { label: 'Ad Scripts', href: '/superadmin/ad-settings', icon: 'bi bi-code-square' },
            { label: 'Advertisements', href: '/superadmin/advertisements', icon: 'bi bi-megaphone-fill' },
          ],
        },
        {
          title: 'Product Moderation',
          items: [
            { label: 'Product Management', href: '/superadmin/product-management', icon: 'bi bi-boxes' },
            { label: 'Pending Approvals', href: '/superadmin/pending-products', icon: 'bi bi-clock-history' },
            { label: 'Moderation History', href: '/superadmin/moderation-history', icon: 'bi bi-journal-text' },
            { label: 'Upload Product', href: '/superadmin/upload-product', icon: 'bi bi-cloud-upload' },
            { label: 'My Products', href: '/superadmin/my-products', icon: 'bi bi-box-seam' },
            { label: 'All Offers On Platform', href: '/superadmin/offers', icon: 'bi bi-tags-fill' },
          ],
        },
        {
          title: 'System',
          items: [
            { label: 'Zone Management', href: '/superadmin/zones', icon: 'bi bi-geo-alt-fill' },
            { label: 'Registration Heatmap', href: '/superadmin/heatmap', icon: 'bi bi-map-fill' },
            { label: 'Reports', href: '/superadmin/reports', icon: 'bi bi-bar-chart-fill' },
            { label: 'System Settings', href: '/superadmin/settings', icon: 'bi bi-gear-fill' },
            { label: 'Error Messages', href: '/superadmin/error-messages', icon: 'bi bi-chat-square-text' },
            { label: 'CMS Pages', href: '/superadmin/cms', icon: 'bi bi-file-earmark-richtext-fill' },
          ],
        },
        {
          title: 'Quick Links',
          items: [
            { label: 'Browse Market', href: '/buyer', icon: 'bi bi-shop-window', target: '_blank' },
          ],
        },
      ];

    case 'delivery':
      return [
        {
          items: [
            { label: 'Dashboard', href: '/delivery', icon: 'bi bi-speedometer2' },
            { label: 'Profile & KYC', href: '/delivery/profile', icon: 'bi bi-person-circle' },
            { label: 'Delivery History', href: '/delivery/history', icon: 'bi bi-clock-history' },
            { label: 'Earnings', href: '/delivery/earnings', icon: 'bi bi-wallet2' },
          ],
        },
      ];

    default:
      return [];
  }
}

export function getDashboardPath(role: string): string {
  switch (role) {
    case 'super_admin': return '/superadmin';
    case 'admin': return '/admin';
    case 'delivery': return '/delivery';
    case 'seller': return '/seller';
    default: return '/buyer';
  }
}
