'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getDashboardPath } from '@/lib/navigation';
import { confirmToast } from '@/lib/toast-utils';
import ProfileDropdown from '@/components/shared/ProfileDropdown';

interface Props {
  onToggleSidebar: () => void;
}

export default function DashboardTopbar({ onToggleSidebar }: Props) {
  const { user, logout, switchRole } = useAuth();

  if (!user) return null;

  const roleLabel =
    user.role === 'super_admin' ? 'Super Admin' :
      user.role === 'admin' ? 'Admin' :
        user.role === 'delivery' ? 'Delivery' :
          user.role === 'seller' ? 'Seller' : 'Buyer';

  const profileHref =
    user.role === 'super_admin' ? '/superadmin' :
      user.role === 'admin' ? '/admin/profile' :
        user.role === 'seller' ? '/seller/profile' :
          user.role === 'delivery' ? '/delivery/profile' : '/buyer/profile';

  const handleSwitch = async (role: string) => {
    const res = await switchRole(role);
    if (res.success) window.location.href = getDashboardPath(role);
  };

  const switchItems = (
    <>
      {user.user_type === 'both' && user.role === 'buyer' && (
        <button
          onClick={() => handleSwitch('seller')}
          className="w-full flex items-center gap-3  py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
        >
          <i className="bi bi-arrow-left-right text-sm" />
          <span className="text-xs font-semibold whitespace-nowrap">Switch to Seller</span>
        </button>
      )}
      {user.user_type === 'both' && user.role === 'seller' && (
        <button
          onClick={() => handleSwitch('buyer')}
          className="w-full flex items-center gap-3  py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
        >
          <i className="bi bi-arrow-left-right text-sm" />
          <span className="text-xs font-semibold whitespace-nowrap">Switch to Buyer</span>
        </button>
      )}
      <Link
        href="/wishlist"
        className="w-full flex items-center gap-3  py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
      >
        <i className="bi bi-heart-fill text-sm" />
        <span className="text-xs font-semibold whitespace-nowrap">Wishlist</span>
      </Link>
    </>
  );

  return (
    <nav className="topbar">
      {/* ── Left: toggle + brand + portal badge ── */}
      <div className="topbar-left">
        <button
          className="topbar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <Link href={getDashboardPath(user.role)} className="topbar-brand">
          <span className="topbar-brand-text">Flex Market</span>
        </Link>

        <span className={`topbar-role-badge ${user.role === 'seller' ? 'bg-[#d96459]!' : 'bg-[#008080]!'}`}>
          {roleLabel} {process.env.NEXT_PUBLIC_PORTAL_NAME}
        </span>
      </div>

      {/* ── Right: shared profile dropdown ── */}
      <ProfileDropdown
        user={user}
        profileHref={profileHref}
        profileLabel="My Profile"
        showHeader
        extraItems={switchItems}
        onLogout={() =>
          confirmToast('Are you sure you want to log out?', () => {
            logout();
            window.location.href = '/login';
          }, 'Logout')
        }
      />
    </nav>
  );
}
