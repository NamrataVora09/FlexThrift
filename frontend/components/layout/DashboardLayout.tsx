'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import DashboardTopbar from './DashboardTopbar';
import DashboardSidebar from './DashboardSidebar';
import { getDashboardPath } from '@/lib/navigation';

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
      // Role-based blocking for admins
      if (user.role === 'admin') {
        const isBlockedBuyer = requiredRoles.includes('buyer') && Number(user.blocked_buyer) === 1;
        const isBlockedSeller = requiredRoles.includes('seller') && Number(user.blocked_seller) === 1;

        if (isBlockedBuyer || isBlockedSeller) {
          router.push('/admin');
          return;
        }
      }
      
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
        {children}
      </div>
    </div>
  );
}
