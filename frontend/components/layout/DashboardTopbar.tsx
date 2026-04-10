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

  // Close dropdown on outside click
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
    user.role === 'admin' ? 'Admin Panel' :
    user.role === 'delivery' ? 'Delivery Portal' :
    user.role === 'seller' ? 'Seller Portal' :
    'Buyer Portal';

  const roleBadgeColor =
    user.role === 'super_admin' ? '#1e293b' :
    user.role === 'admin' ? '#6366f1' :
    user.role === 'seller' ? '#059669' :
    user.role === 'delivery' ? '#d97706' : '#3b82f6';

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
      {/* Left: Hamburger + Brand */}
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
          <span className="topbar-brand-icon">F</span>
          <span className="topbar-brand-text">Flex Market</span>
        </Link>

        <span className="topbar-role-badge" style={{ background: roleBadgeColor }}>
          {roleLabel}
        </span>
      </div>

      {/* Right: User dropdown */}
      <div className="topbar-right" ref={dropdownRef}>
        <button
          className="topbar-user-btn"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-expanded={dropdownOpen}
        >
          <span className="topbar-avatar" style={{ background: roleBadgeColor }}>
            {initials}
          </span>
          <span className="topbar-user-name">{user.name}</span>
          <svg className={`topbar-chevron ${dropdownOpen ? 'open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="topbar-dropdown">
            {/* User info */}
            <div className="topbar-dropdown-header">
              <span className="topbar-avatar-lg" style={{ background: roleBadgeColor }}>{initials}</span>
              <div>
                <div className="topbar-dropdown-name">{user.name}</div>
                <div className="topbar-dropdown-email">{user.email}</div>
              </div>
            </div>

            <div className="topbar-dropdown-divider" />

            <Link
              className="topbar-dropdown-item"
              href={getDashboardPath(user.role)}
              onClick={() => setDropdownOpen(false)}
            >
              <i className="bi bi-speedometer2"></i>
              <span>My Portal</span>
            </Link>

            {user.user_type === 'both' && user.role === 'buyer' && (
              <button className="topbar-dropdown-item" onClick={() => handleSwitch('seller')}>
                <i className="bi bi-arrow-left-right"></i>
                <span>Switch to Seller</span>
              </button>
            )}
            {user.user_type === 'both' && user.role === 'seller' && (
              <button className="topbar-dropdown-item" onClick={() => handleSwitch('buyer')}>
                <i className="bi bi-arrow-left-right"></i>
                <span>Switch to Buyer</span>
              </button>
            )}

            <div className="topbar-dropdown-divider" />

            <button
              className="topbar-dropdown-item topbar-dropdown-danger"
              onClick={() => {
                setDropdownOpen(false);
                confirmToast('Are you sure you want to log out?', () => {
                  logout();
                  window.location.href = '/login';
                }, 'Logout');
              }}
            >
              <i className="bi bi-power"></i>
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
