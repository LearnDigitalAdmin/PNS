import { useSite, TOTAL_PAGES } from '../context/SiteContext';

const PAGE_TITLES = ['Hero', 'Stories', 'Voting', 'Directory', 'Services', 'Partners', 'Sponsored', 'Shop', 'Book'];

export default function PageNavUI() {
  const { currentPage, goToPage, swipeHintVisible } = useSite();

  return (
    <>
      <div id="page-arrows">
        <button className="arrow-btn" onClick={() => goToPage(currentPage - 1)} title="Previous">
          ←
        </button>
        <button className="arrow-btn" onClick={() => goToPage(currentPage + 1)} title="Next">
          →
        </button>
      </div>
      <div id="page-indicator">
        {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
          <button
            key={i}
            className={`page-dot ${i === currentPage ? 'active' : ''}`}
            onClick={() => goToPage(i)}
            title={PAGE_TITLES[i]}
          />
        ))}
      </div>
      <div id="swipe-hint" className={swipeHintVisible ? '' : 'hidden-hint'}>
        <div
          style={{
            background: 'rgba(10,10,10,.58)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(201,168,76,.28)',
            padding: '.36rem .85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '.45rem',
            borderRadius: '2px',
          }}
        >
          <span style={{ color: 'var(--gold)', fontSize: '.9rem' }}>⟵ ⟶</span>
          <span style={{ fontSize: '.58rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(247,244,239,.6)', fontWeight: 500 }}>
            Swipe to turn page
          </span>
        </div>
      </div>
    </>
  );
}
