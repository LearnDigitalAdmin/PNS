import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useReaderAuth } from '../context/ReaderAuthContext';

const TABS = [
  { to: 'overview', label: 'Overview' },
  { to: 'photos', label: 'My Photos' },
  { to: 'bookings', label: 'Bookings' },
  { to: 'votes', label: 'My Votes' },
  { to: 'settings', label: 'Settings' },
];

export default function ReaderShell() {
  const { profile, logout } = useReaderAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/account');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 200, borderRight: '1px solid #e5e5e5', flexShrink: 0 }} className="hidden md:flex flex-col">
        <Link to="/" className="p-4 border-b block hover:bg-gray-50" style={{ borderColor: '#e5e5e5' }}>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900 }}>P&amp;S</p>
          <p style={{ fontSize: '.55rem', letterSpacing: '.2em', color: 'var(--gold, #c9a84c)', textTransform: 'uppercase' }}>
            My Account
          </p>
        </Link>
        <nav className="flex-1 p-2">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm mb-1 ${isActive ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t space-y-2" style={{ borderColor: '#e5e5e5' }}>
          <Link to="/" className="block text-xs text-gray-600 hover:text-black">
            ← Back to site
          </Link>
          <p className="text-xs text-gray-500 truncate">{profile?.displayName || 'Reader'}</p>
          <button onClick={handleLogout} className="w-full text-xs text-left text-red-600">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar — the bottom nav below is tab-only, so a fixed top
          bar is the only place a "back to site" link can live without
          crowding the tab bar. */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 bg-white border-b flex items-center justify-between px-4 py-2 z-40"
        style={{ borderColor: '#e5e5e5' }}
      >
        <Link to="/" className="text-xs text-gray-600 flex items-center gap-1">
          ← Site
        </Link>
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '.95rem', fontWeight: 900 }}>P&amp;S</p>
        <button onClick={handleLogout} className="text-xs text-red-600">
          Sign out
        </button>
      </div>

      <div
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around z-40"
        style={{ borderColor: '#e5e5e5' }}
      >
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `flex-1 text-center py-2.5 text-[.65rem] ${isActive ? 'font-semibold' : 'text-gray-500'}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </div>

      <main className="flex-1 pb-16 pt-12 md:pt-0 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
