'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getDashboardPath } from '@/lib/navigation';
import { confirmToast } from '@/lib/toast-utils';

interface Props {
  onToggleSidebar: () => void;
}

export default function DashboardTopbar({ onToggleSidebar }: Props) {
  const { user, logout, switchRole } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    setDropdownOpen(false);
    const res = await switchRole(role);
    if (res.success) window.location.href = getDashboardPath(role);
  };

  const initials = (user.name || '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

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

        <span className="topbar-role-badge bg-[#008080]!">{roleLabel}</span>
      </div>

      {/* ── Right: profile dropdown (same style as Browse / Landing navbar) ── */}
      <div className="relative flex-shrink-0" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="flex items-center gap-3 border border-[#008080] rounded-full! px-2 py-1 pr-4 hover:shadow-md transition-all duration-300 bg-white shadow-sm"
          aria-expanded={dropdownOpen}
        >
          <div className="w-9 h-9 flex items-center justify-center bg-[#008080] text-white rounded-full font-bold text-xs flex-shrink-0">
            {initials}
          </div>
          <span className="text-sm font-bold text-gray-800 hidden md:block whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
            {user.name}
          </span>
          <i className={`bi bi-chevron-down text-[0.7rem] text-gray-400 transition-transform duration-300 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-[calc(100%+10px)] w-48 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 py-3 z-[1070] overflow-hidden">
            {/* User info header */}
            <div className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100">
              <div className="w-9 h-9 flex items-center justify-center bg-[#008080] text-white rounded-full font-bold text-xs flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
              </div>
            </div>

            {/* Profile */}
            <Link
              href={profileHref}
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
            >
              <i className="bi bi-person-fill text-sm" />
              <span className="text-xs font-semibold whitespace-nowrap">My Profile</span>
            </Link>

            {/* Switch role */}
            {user.user_type === 'both' && user.role === 'buyer' && (
              <button
                onClick={() => handleSwitch('seller')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
              >
                <i className="bi bi-arrow-left-right text-sm" />
                <span className="text-xs font-semibold whitespace-nowrap">Switch to Seller</span>
              </button>
            )}
            {user.user_type === 'both' && user.role === 'seller' && (
              <button
                onClick={() => handleSwitch('buyer')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
              >
                <i className="bi bi-arrow-left-right text-sm" />
                <span className="text-xs font-semibold whitespace-nowrap">Switch to Buyer</span>
              </button>
            )}

            <div className="h-px bg-gray-100 mx-4 my-1" />

            {/* Logout */}
            <button
              onClick={() => {
                setDropdownOpen(false);
                confirmToast('Are you sure you want to log out?', () => {
                  logout();
                  window.location.href = '/login';
                }, 'Logout');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors"
              style={{ color: '#ef4444' }}
            >
              <i className="bi bi-box-arrow-right text-sm" />
              <span className="text-xs font-semibold whitespace-nowrap">Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
