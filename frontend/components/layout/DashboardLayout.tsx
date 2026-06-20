'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardTopbar from './DashboardTopbar';
import DashboardSidebar from './DashboardSidebar';
import { getDashboardPath } from '@/lib/navigation';
import { showToast } from '@/lib/toast';

interface Props {
  children: ReactNode;
  requiredRoles?: string[];
  viewAs?: string;
}

// Module-level persistence to avoid flicker during remounts
let globalSidebarOpen: boolean | null = null;

export default function DashboardLayout({ children, requiredRoles, viewAs }: Props) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isSellerPage = pathname.startsWith('/seller') && !['/seller/profile', '/seller/help', '/seller/notifications'].some(p => pathname.startsWith(p));
  const isAdminSellerPage = pathname.startsWith('/admin/upload-product') || pathname.startsWith('/admin/my-products') || pathname.startsWith('/admin/analytics');
  const isSellerRestricted = !!((isSellerPage || isAdminSellerPage) && user && user.role !== 'super_admin' && Number(user.blocked_seller) === 1);

  const isBuyerPage = pathname.startsWith('/buyer') && !['/buyer/profile', '/buyer/help', '/buyer/notifications'].some(p => pathname.startsWith(p));
  const isBuyerRestricted = !!(isBuyerPage && user && user.role !== 'super_admin' && Number(user.blocked_buyer) === 1);

  useEffect(() => {
    if (isSellerRestricted) {
      showToast.error("Your seller privileges have been restricted by the administrator.");
    }
    if (isBuyerRestricted) {
      showToast.error("Your buyer privileges have been restricted by the administrator.");
    }
  }, [isSellerRestricted, isBuyerRestricted]);
  
  // Initialize from global variable if it exists, otherwise default to true
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      if (globalSidebarOpen !== null) return globalSidebarOpen;
      const saved = localStorage.getItem('sidebarOpen');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  
  const [isMobile, setIsMobile] = useState(false);

  // Desktop (≥992px): sidebar always open, no toggle.
  // Mobile/tablet (<992px): sidebar closed by default, toggle button shows.
  const handleResize = useCallback(() => {
    const mobile = window.innerWidth < 992;
    setIsMobile(mobile);

    if (mobile) {
      setSidebarOpen(false);
      globalSidebarOpen = false;
    } else {
      // Always open on desktop — ignore any saved state
      setSidebarOpen(true);
      globalSidebarOpen = true;
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      globalSidebarOpen = false;
    }
  }, [pathname, isMobile]);

  const toggleSidebar = useCallback(() => {
    // Toggle is only effective on mobile/tablet
    if (!isMobile) return;
    setSidebarOpen(prev => {
      const newState = !prev;
      globalSidebarOpen = newState;
      return newState;
    });
  }, [isMobile]);

  // Close sidebar when clicking overlay (mobile)
  const closeSidebar = useCallback(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && requiredRoles && user) {
      if (user.role !== 'super_admin' && !requiredRoles.includes(user.role)) {
        router.push(getDashboardPath(user.role));
      }
    }
  }, [isLoading, isAuthenticated, requiredRoles, user, router]);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border" style={{ color: '#ffc63a' }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const resolvedViewAs = viewAs
    || (user.role === 'super_admin' && pathname.startsWith('/buyer') ? 'buyer' : undefined)
    || (user.role === 'super_admin' && pathname.startsWith('/seller') ? 'seller' : undefined)
    || (user.role === 'super_admin' && pathname.startsWith('/admin') ? 'admin' : undefined)
    || (user.role === 'super_admin' && pathname.startsWith('/delivery') ? 'delivery' : undefined);



  return (
    <div>
      <DashboardTopbar onToggleSidebar={toggleSidebar} />

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay active" onClick={closeSidebar} />
      )}

      <DashboardSidebar isOpen={sidebarOpen} viewAs={resolvedViewAs} />

      <div className={`main-content ${!sidebarOpen ? 'sidebar-collapsed' : ''}`}>
        {isSellerRestricted ? (
          <div className="container-fluid p-4 p-md-5 d-flex align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
            <div className="text-center p-5 shadow-sm" style={{ maxWidth: 500, background: '#fff', borderRadius: 24, border: '1px solid #fee2e2', margin: 'auto' }}>
              <div className="mb-4" style={{ width: 80, height: 80, background: '#fee2e2', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-shield-lock-fill" style={{ fontSize: '2.5rem', color: '#ef4444' }}></i>
              </div>
              <h3 style={{ fontWeight: 800, color: '#1a1a1a', marginBottom: 15 }}>Seller Access Restricted</h3>
              <p className="text-muted mb-4" style={{ lineHeight: 1.6 }}>
                Your seller privileges have been restricted by the administrator. You are currently unable to upload new products or manage existing listings.
              </p>
              <div className="p-3 mb-4" style={{ background: '#f9fafb', borderRadius: 12, border: '1px solid #eee', fontSize: '0.9rem' }}>
                <i className="bi bi-info-circle me-2" style={{ color: '#6b7280' }}></i>
                Please contact platform support for more information or to request a review of your account status.
              </div>
              <button
                onClick={() => router.push(user.role === 'admin' ? '/admin' : '/buyer/dashboard')}
                className="btn btn-dark px-4 py-2"
                style={{ borderRadius: 10, fontWeight: 600 }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : isBuyerRestricted ? (
          <div className="container-fluid p-4 p-md-5 d-flex align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
            <div className="text-center p-5 shadow-sm" style={{ maxWidth: 500, background: '#fff', borderRadius: 24, border: '1px solid #fee2e2', margin: 'auto' }}>
              <div className="mb-4" style={{ width: 80, height: 80, background: '#fee2e2', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="bi bi-shield-lock-fill" style={{ fontSize: '2.5rem', color: '#ef4444' }}></i>
              </div>
              <h3 style={{ fontWeight: 800, color: '#1a1a1a', marginBottom: 15 }}>Buyer Access Restricted</h3>
              <p className="text-muted mb-4" style={{ lineHeight: 1.6 }}>
                Your buyer privileges have been restricted by the administrator. You are currently unable to make purchases or view transactions.
              </p>
              <div className="p-3 mb-4" style={{ background: '#f9fafb', borderRadius: 12, border: '1px solid #eee', fontSize: '0.9rem' }}>
                <i className="bi bi-info-circle me-2" style={{ color: '#6b7280' }}></i>
                Please contact platform support for more information or to request a review of your account status.
              </div>
              <button
                onClick={() => router.push(user.role === 'admin' ? '/admin' : (user.user_type === 'both' ? '/seller' : '/buyer/dashboard'))}
                className="btn btn-dark px-4 py-2"
                style={{ borderRadius: 10, fontWeight: 600 }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
