import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getBackend, isDemoBackend } from '../lib/backend';
import { Avatar, Brand, Icon } from './ui';

const NAV = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/guidance', label: 'Guidance', icon: 'book' },
  { to: '/bookings', label: 'Bookings', icon: 'calendar' },
  { to: '/testimonials', label: 'Community', icon: 'heart' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];

export function Layout() {
  const { profile } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);
  const demo = isDemoBackend();

  useEffect(() => {
    if (!profile) {
      setUnread(0);
      return;
    }
    let active = true;
    getBackend()
      .listNotifications()
      .then((items) => {
        if (active) setUnread(items.filter((item) => !item.read).length);
      })
      .catch(() => {
        if (active) setUnread(0);
      });
    return () => {
      active = false;
    };
  }, [profile, location.pathname]);

  return (
    <div className="app-shell">
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="row gap-8" aria-label="Swayam Swasti home">
            <Brand />
          </Link>

          <div className="header-actions">
            {demo && <span className="badge badge-gold nowrap hidden-mobile">Demo mode</span>}
            {profile?.role === 'admin' && (
              <Link className="icon-btn" to="/admin" aria-label="Admin console" title="Admin console">
                <Icon name="shield" size={20} />
              </Link>
            )}
            <Link className="icon-btn" to="/notifications" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
              <Icon name="bell" size={20} />
              {unread > 0 && <span className="unread-dot" aria-hidden="true" />}
            </Link>
            {profile ? (
              <Link to="/profile" aria-label="Your profile">
                <Avatar name={profile.fullName || profile.email} size={36} />
              </Link>
            ) : (
              <Link className="btn btn-primary btn-sm" to="/login">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container" style={{ paddingTop: 20, paddingBottom: 32 }}>
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <Brand compact />
          <p className="tiny muted">
            Guidance for reflection and wellbeing — not a substitute for medical, legal or financial advice.
          </p>
          <div className="footer-links">
            <Link to="/services">Services</Link>
            <Link to="/guidance">Guidance</Link>
            <Link to="/testimonials">Community</Link>
            <Link to="/profile">Account</Link>
          </div>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="Primary">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            <Icon name={item.icon} size={21} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
