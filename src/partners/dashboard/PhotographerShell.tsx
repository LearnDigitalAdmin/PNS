import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { usePhotographerAuth } from '../context/PhotographerAuthContext';

const TABS = [
  { to: 'overview', label: 'Overview' },
  { to: 'profile', label: 'Profile' },
  { to: 'gallery', label: 'Gallery' },
  { to: 'sessions', label: 'Sessions' },
  { to: 'bookings', label: 'Bookings' },
  { to: 'settings', label: 'Settings' },
];

export default function PhotographerShell() {
  const { profile, logout } = usePhotographerAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/partners');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, borderRight: '1px solid #e5e5e5', flexShrink: 0 }} className="hidden md:flex flex-col">
        <div className="p-4 border-b" style={{ borderColor: '#e5e5e5' }}>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.2rem', fontWeight: 900 }}>P&amp;S</p>
          <p style={{ fontSize: '.55rem', letterSpacing: '.2em', color: 'var(--gold, #c9a84c)', textTransform: 'uppercase' }}>
            Partner Studio
          </p>
        </div>
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
        <div className="p-3 border-t" style={{ borderColor: '#e5e5e5' }}>
          <p className="text-xs text-gray-500 truncate mb-2">{profile?.businessName || 'Unnamed studio'}</p>
          <button onClick={handleLogout} className="w-full text-xs text-left text-red-600">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around z-40" style={{ borderColor: '#e5e5e5' }}>
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

      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}
