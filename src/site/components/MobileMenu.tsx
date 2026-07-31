import { Link } from 'react-router-dom';
import { useSite } from '../context/SiteContext';
import { useReaderAuth } from '../../readers/context/ReaderAuthContext';

const ITEMS: { label: string; page: number }[] = [
  { label: 'Home', page: 0 },
  { label: 'Stories', page: 1 },
  { label: 'Voting Arena', page: 2 },
  { label: 'Cogvana Visuals', page: 3 },
  { label: 'Services', page: 4 },
  { label: 'Partners', page: 5 },
  { label: 'Sponsored', page: 6 },
  { label: 'Shop', page: 7 },
  { label: 'Book', page: 8 },
];

export default function MobileMenu() {
  const { mobileMenuOpen, toggleMobileMenu, goToPage, openModal } = useSite();
  const { currentUser: reader, profile: readerProfile } = useReaderAuth();

  return (
    <div id="mobile-menu" className={mobileMenuOpen ? 'open' : ''} style={{ background: 'var(--deep)' }}>
      <div className="flex flex-col h-full pt-6 pb-8 px-7 gap-5 overflow-y-auto">
        {ITEMS.map((item) => (
          <span
            key={item.label}
            className="font-display text-2xl text-white font-bold cursor-pointer"
            onClick={() => {
              goToPage(item.page);
              toggleMobileMenu();
            }}
          >
            {item.label}
          </span>
        ))}
        <Link
          to="/account"
          onClick={toggleMobileMenu}
          className="font-display text-2xl font-bold"
          style={{ color: 'var(--gold, #c9a84c)', textDecoration: 'none' }}
        >
          {reader ? (readerProfile?.displayName?.split(' ')[0] || 'My Account') : 'Sign In'}
        </Link>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              openModal('bookModal');
              toggleMobileMenu();
            }}
            className="btn-outline-gold flex-1 text-center"
          >
            Book
          </button>
          <button
            onClick={() => {
              openModal('applyModal');
              toggleMobileMenu();
            }}
            className="btn-gold flex-1 text-center"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
