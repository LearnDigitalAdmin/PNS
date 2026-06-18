import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAdminData } from './context/AdminDataContext';
import { useAdminAuth } from './context/AdminAuthContext';

const NAV_GROUPS = [
  {
    label: 'Overview',
    links: [{ to: '/admin/overview', label: 'Dashboard', icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z' }],
  },
  {
    label: 'Content',
    links: [{ to: '/admin/content', label: 'Stories, Voting, Gallery & Shop', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z' }],
  },
  {
    label: 'Business',
    links: [{ to: '/admin/business', label: 'Requests, Sponsored & Partners', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }],
  },
  {
    label: 'System',
    links: [{ to: '/admin/system', label: 'Activity, Security & Settings', icon: 'M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6l-8-4Z' }],
  },
];

export default function AdminShell() {
  const { toasts, confirmState, closeConfirm, requests } = useAdminData();
  const { logout, sessionWarningOpen, sessionCountdown, staySignedIn } = useAdminAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const pendingCount = Object.values(requests).flat().filter((r) => r.status === 'pending').length;

  function handleLogout() {
    setProfileOpen(false);
    logout();
    navigate('/admin');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div
        onClick={() => setSidebarOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 110, opacity: sidebarOpen ? 1 : 0, pointerEvents: sidebarOpen ? 'all' : 'none', transition: 'opacity .25s' }}
      />

      <aside id="sidebar" className={sidebarOpen ? 'open' : ''}>
        <div style={{ padding: '1.15rem 1.1rem .9rem', borderBottom: '1px solid rgba(247,244,239,.07)' }} className="flex items-center justify-between">
          <div>
            <span className="font-display" style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', letterSpacing: '-.03em' }}>
              P&amp;S
            </span>
            <div style={{ fontSize: '.42rem', letterSpacing: '.26em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 600 }}>Editor Dashboard</div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden" style={{ background: 'none', border: 'none', color: 'rgba(247,244,239,.5)', fontSize: '1.2rem', cursor: 'pointer' }}>
            &times;
          </button>
        </div>
        <nav style={{ flex: 1, overflowY: 'auto', padding: '.6rem .9rem 1rem' }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="side-group-label">{group.label}</div>
              {group.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}
                >
                  <svg className="icon" viewBox="0 0 24 24">
                    <path d={link.icon} />
                  </svg>
                  {link.label}
                  {group.label === 'Business' && pendingCount > 0 && <span className="count">{pendingCount}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: '.9rem 1.1rem', borderTop: '1px solid rgba(247,244,239,.07)' }}>
          <button onClick={handleLogout} className="btn-outline-dark-admin w-full" style={{ fontSize: '.66rem' }}>
            <svg className="icon" viewBox="0 0 24 24" style={{ stroke: 'rgba(247,244,239,.85)' }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      <div id="mainWrap">
        <header id="topbar">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '.3rem', display: 'flex' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" stroke="#0A0A0A" strokeWidth="2" fill="none" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="hidden md:flex items-center gap-1.5 ml-auto" style={{ fontSize: '.62rem', color: 'var(--warm-gray)' }} title="Simulated Firebase connection — demo mode">
            <span className="fb-dot" /> Firebase Connected
          </div>
          <div style={{ position: 'relative', cursor: 'pointer' }} className="ml-auto md:ml-0" onClick={() => navigate('/admin/business')}>
            <svg width="19" height="19" viewBox="0 0 24 24" stroke="#3a3a3a" strokeWidth="1.8" fill="none" strokeLinecap="round">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
            </svg>
            {pendingCount > 0 && <span className="bell-badge">{pendingCount}</span>}
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setProfileOpen((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} className="flex items-center gap-2">
              <div className="avatar">AE</div>
            </button>
            {profileOpen && (
              <div style={{ position: 'absolute', right: 0, top: 42, background: '#fff', border: '1px solid var(--line)', width: 190, boxShadow: '0 12px 30px rgba(0,0,0,.12)', zIndex: 50 }}>
                <div className="p-3" style={{ borderBottom: '1px solid var(--line)' }}>
                  <p style={{ fontSize: '.78rem', fontWeight: 600 }}>Amara Editor</p>
                  <p style={{ fontSize: '.65rem', color: 'var(--warm-gray)' }}>editor@pnsmagazine.com</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      navigate('/admin/system');
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5"
                    style={{ fontSize: '.72rem', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Account Settings
                  </button>
                  <button onClick={handleLogout} className="w-full text-left px-2 py-1.5" style={{ fontSize: '.72rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main id="content">
          <Outlet />
        </main>
      </div>

      {/* SESSION TIMEOUT MODAL */}
      <div className={`modal-admin ${sessionWarningOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" />
        <div className="modal-box-admin" style={{ maxWidth: 380 }}>
          <div className="modal-body text-center pt-6 p-6">
            <svg width="30" height="30" viewBox="0 0 24 24" stroke="var(--warn)" strokeWidth="1.8" fill="none" style={{ margin: '0 auto' }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <p className="font-display mt-2" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              Session expiring soon
            </p>
            <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)', marginTop: '.4rem' }}>
              For your security, you'll be signed out in <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{sessionCountdown}</span>s due to inactivity.
            </p>
          </div>
          <div className="p-4 pt-0">
            <button className="btn-gold-admin w-full" onClick={staySignedIn}>
              Stay Signed In
            </button>
          </div>
        </div>
      </div>

      {/* GENERIC CONFIRM MODAL */}
      <div className={`modal-admin ${confirmState ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={closeConfirm} />
        <div className="modal-box-admin" style={{ maxWidth: 380 }}>
          <div className="modal-body text-center pt-6 p-6">
            <p className="font-display" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
              {confirmState?.title}
            </p>
            <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)', marginTop: '.4rem' }}>{confirmState?.message}</p>
          </div>
          <div className="p-4 pt-0 flex gap-2 justify-end">
            <button className="btn-outline-admin" onClick={closeConfirm}>
              Cancel
            </button>
            <button
              className="btn-danger-admin"
              style={{ background: 'var(--danger)', color: '#fff' }}
              onClick={() => {
                confirmState?.onConfirm();
                closeConfirm();
              }}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>

      <div style={{ position: 'fixed', bottom: '1.1rem', right: '1.1rem', zIndex: 600, display: 'flex', flexDirection: 'column', gap: '.5rem', maxWidth: 300 }}>
        {toasts.map((t) => (
          <div className={`toast ${t.type === 'success' ? 'success' : t.type === 'danger' ? 'danger' : ''}`} key={t.id}>
            <span>{t.type === 'success' ? '✦' : t.type === 'danger' ? '⚠' : '●'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
