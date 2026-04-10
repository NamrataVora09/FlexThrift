'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getNavigation } from '@/lib/navigation';

interface Props {
  isOpen: boolean;
  viewAs?: string;
}

export default function DashboardSidebar({ isOpen, viewAs }: Props) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  // Use viewAs role for sidebar if provided (e.g., superadmin viewing buyer dashboard)
  const effectiveRole = viewAs || user.role;
  const isAdminStyle = ['super_admin', 'admin'].includes(effectiveRole);
  const navigation = getNavigation(effectiveRole);

  const sidebarBg = '#fff';
  const linkColor = '#333';
  const linkHover = '#ffc63a';
  const activeColor = '#ffc63a';
  const activeText = '#000';
  const sectionColor = '#6c757d';

  return (
    <div
      className={`sidebar ${!isOpen ? 'collapsed' : 'show'}`}
      style={{
        background: sidebarBg,
      }}
    >
      {isAdminStyle && (
        <div className="px-3 mb-3">
          <div className="d-flex align-items-center mb-3 px-2">
            <span style={{ color: '#212529', fontWeight: 700, fontSize: 18 }}>
              {effectiveRole === 'super_admin' ? 'FLEX MARKET' : 'Admin Panel'}
            </span>
          </div>
        </div>
      )}

      <ul className="nav flex-column" style={{ padding: '0 8px' }}>
        {navigation.map((section, si) => (
          <li key={si}>
            {section.title && (
              <small
                className="d-block px-3 mb-2 text-uppercase fw-semibold"
                style={{
                  fontSize: '0.7rem',
                  letterSpacing: 1,
                  color: sectionColor,
                  marginTop: si > 0 ? 20 : 0,
                }}
              >
                {section.title}
              </small>
            )}
            {section.items.map((item) => {
              // Exact match for dashboard root paths, startsWith for sub-pages
              const isDashboardRoot = ['/superadmin', '/admin', '/buyer', '/seller', '/delivery'].includes(item.href);
              const isActive = isDashboardRoot
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href} className="nav-item" style={{ listStyle: 'none' }}>
                  <Link
                    className="nav-link d-flex align-items-center gap-2"
                    href={item.href}
                    target={item.target}
                    style={{
                      color: isActive ? activeText : linkColor,
                      background: isActive ? activeColor : 'transparent',
                      padding: '10px 15px',
                      margin: '2px 0',
                      borderRadius: 8,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? '0 4px 12px rgba(255,198,58,0.3)' : undefined,
                    }}
                  >
                    <i className={item.icon} style={{ fontSize: '1.1rem', width: 20, textAlign: 'center' }}></i>
                    <span>{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="badge rounded-pill bg-danger ms-auto">{item.badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </li>
        ))}
      </ul>

      <hr style={{ borderColor: '#ddd', margin: '20px 15px' }} />

      <div style={{ padding: '0 8px' }}>
        <button
          className="nav-link d-flex align-items-center gap-2 w-100 border-0"
          onClick={() => { logout(); window.location.href = '/login'; }}
          style={{
            color: '#dc3545',
            background: 'transparent',
            padding: '10px 15px',
            borderRadius: 8,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <i className="fa-solid fa-power-off"></i>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
