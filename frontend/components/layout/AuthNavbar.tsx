'use client';

import Link from 'next/link';

export default function AuthNavbar() {
  return (
    <nav className="navbar navbar-expand-lg bg-white auth-navbar">
      <div className="container">
        <Link className="navbar-brand" href="/">Flex Market</Link>
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" href="/">Home</Link>
            </li>
          </ul>
          <div className="d-flex align-items-center">
            <Link href="/login" className="login-links">
              <i className="bi bi-person-fill"></i> <span>LOGIN / REGISTER</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
