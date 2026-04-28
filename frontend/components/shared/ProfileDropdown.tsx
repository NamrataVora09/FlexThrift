'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';
import Link from 'next/link';

interface ProfileUser {
  name: string;
  email: string;
  role: string;
  user_type?: string;
}

interface Props {
  user: ProfileUser;
  /** Called when the user clicks Logout (caller handles confirm / redirect) */
  onLogout: () => void;
  /** Href for the "My Profile" link */
  profileHref: string;
  /** Label shown on the profile link row (defaults to "My Profile") */
  profileLabel?: string;
  /** Extra menu items rendered between the profile link and the divider */
  extraItems?: ReactNode;
  /** Show avatar + name + email header block at top of dropdown */
  showHeader?: boolean;
}

export default function ProfileDropdown({
  user,
  onLogout,
  profileHref,
  profileLabel = 'My Profile',
  extraItems,
  showHeader = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const initials = (user.name || '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex items-center gap-3 border border-[#008080] rounded-full! px-2 py-1 pr-4 hover:shadow-md transition-all duration-300 bg-white shadow-sm"
      >
        <div className="w-9 h-9 flex items-center justify-center bg-[#008080] text-white rounded-full font-bold text-xs flex-shrink-0">
          {initials}
        </div>
        <span className="text-sm font-bold text-gray-800 hidden md:block whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">
          {user.name}
        </span>
        <i
          className={`bi bi-chevron-down text-[0.7rem] text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] w-52 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 py-3 z-[1070] overflow-hidden">

          {/* Optional user info header */}
          {showHeader && (
            <div className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100 mb-1">
              <div className="w-9 h-9 flex items-center justify-center bg-[#008080] text-white rounded-full font-bold text-xs flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          )}

          {/* Profile link */}
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 hover:text-[#008080] transition-colors"
          >
            <i className="bi bi-person-fill text-sm" />
            <span className="text-xs font-semibold whitespace-nowrap">{profileLabel}</span>
          </Link>

          {/* Caller-provided items (wishlist, switch role, etc.) */}
          {extraItems}

          <div className="h-px bg-gray-100 mx-4 my-1" />

          {/* Logout */}
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 transition-colors"
            style={{ color: '#ef4444' }}
          >
            <i className="bi bi-box-arrow-right text-sm" />
            <span className="text-xs font-semibold whitespace-nowrap">Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
