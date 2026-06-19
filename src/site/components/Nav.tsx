import { useSite } from '../context/SiteContext';

const NAV_LINKS = ['Stories', 'Voting', 'Cogvana', 'Services', 'Partners', 'Sponsored', 'Shop', 'Book'];

export default function Nav() {
  const { goToPage, toggleMobileMenu, mobileMenuOpen, openModal, siteSettings } = useSite();
  const tickerItems = [...siteSettings.tickerMessages, ...siteSettings.tickerMessages];

  return (
    <div id="chrome">
      <div className="ticker-wrap">
        <div className="ticker-content text-xs font-semibold tracking-widest uppercase text-black">
          {tickerItems.map((msg, i) => (
            <span className="mx-7" key={i}>
              ✦ {msg}
            </span>
          ))}
        </div>
      </div>
      <nav id="nav" className="flex items-center justify-between px-5 md:px-8">
        
        <a href="#" className="flex flex-col leading-none">
          <span
            onClick={(e) => {
              e.preventDefault();
              goToPage(0);
            }}
            style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.55rem', fontWeight: 900, color: '#fff', letterSpacing: '-.03em' }}
          >
            P&amp;S
          </span>
          <span style={{ fontSize: '.43rem', letterSpacing: '.28em', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 500 }}>
            Every Face Has A Story
          </span>
        </a>

        <div className="hidden lg:flex items-center gap-6">
          {NAV_LINKS.map((label, i) => (
            <span className="nav-link" key={label} onClick={() => goToPage(i + 1)}>
              {label}
            </span>
          ))}
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <button onClick={() => openModal('bookModal')} className="btn-outline-gold" style={{ fontSize: '.6rem', padding: '.46rem 1rem' }}>
            Book A Shoot
          </button>
          <button onClick={() => openModal('applyModal')} className="btn-gold" style={{ fontSize: '.6rem', padding: '.46rem 1rem' }}>
            Apply To Feature
          </button>
        </div>
        <button className="lg:hidden flex flex-col gap-1.5 p-2" onClick={toggleMobileMenu} aria-label="Toggle menu">
          <span
            className="block w-6 h-px bg-white transition-all"
            style={mobileMenuOpen ? { transform: 'rotate(45deg) translate(4px,4px)' } : undefined}
          />
          <span className="block w-6 h-px bg-white transition-all" style={mobileMenuOpen ? { opacity: 0 } : undefined} />
          <span
            className="block w-4 h-px bg-white transition-all"
            style={mobileMenuOpen ? { transform: 'rotate(-45deg) translate(4px,-4px)', width: '24px' } : undefined}
          />
        </button>
      </nav>
    </div>
  );
}