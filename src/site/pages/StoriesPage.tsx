import { useSite } from '../context/SiteContext';
import { stories as demoStories } from '../data';


// Map FSStory sizes for layout: first is large, next 2 medium, rest small
function getSizeClass(index: number): 'large' | 'medium' | 'small' {
  if (index === 0) return 'large';
  if (index <= 2) return 'medium';
  return 'small';
}

interface DisplayStory {
  id: string;
  size: 'large' | 'medium' | 'small';
  image: string;
  category: string;
  title: string;
  excerpt?: string;
  body?: string;
  author?: string;
  date?: string;
  cta: string;
}

export default function StoriesPage() {
  const { liveStories, storiesLoading, openStoryModal } = useSite();

  // Build display list: use live stories if available, fallback to demo
  const displayStories: DisplayStory[] = storiesLoading || liveStories.length === 0
    ? demoStories.map((s) => ({
        id: s.id,
        size: s.size,
        image: s.image,
        category: s.category,
        title: s.title,
        excerpt: s.excerpt,
        cta: s.cta,
      }))
    : liveStories.slice(0, 6).map((s, i) => ({
        id: s.id,
        size: getSizeClass(i),
        image: s.image,
        category: s.category,
        title: s.title,
        excerpt: s.excerpt,
        body: s.body,
        author: s.author,
        date: s.date,
        cta: s.isVotingWinner ? 'See Winner →' : 'Read Story',
      }));

  function handleRead(s: DisplayStory) {
    openStoryModal({
      title: s.title,
      category: s.category,
      excerpt: s.excerpt,
      body: s.body,
      image: s.image,
      author: s.author,
      date: s.date,
    });
  }

  const large = displayStories.find((s) => s.size === 'large');
  const mediums = displayStories.filter((s) => s.size === 'medium');
  const smalls = displayStories.filter((s) => s.size === 'small');

  if (!large) {
    return (
      <div className="px-5 md:px-10 py-7 max-w-7xl mx-auto">
        <div className="reveal flex items-end justify-between mb-7">
          <div>
            <p className="section-eyebrow mb-1">This Week's Edition</p>
            <div className="gold-line mb-3" />
            <h2 className="section-title">Featured Stories</h2>
          </div>
        </div>
        <div className="flex items-center justify-center" style={{ height: 300 }}>
          {storiesLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 32, height: 32,
                border: '2px solid rgba(201,168,76,.25)',
                borderTopColor: 'var(--gold)',
                borderRadius: '50%',
                animation: 'spin .8s linear infinite',
              }} />
              <p style={{ fontSize: '.72rem', color: 'var(--warm-gray)' }}>Loading stories…</p>
            </div>
          ) : (
            <p style={{ color: 'var(--warm-gray)', fontSize: '.82rem' }}>No live stories yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 md:px-10 py-7 max-w-7xl mx-auto">
      <div className="reveal flex items-end justify-between mb-7">
        <div>
          <p className="section-eyebrow mb-1">This Week's Edition</p>
          <div className="gold-line mb-3" />
          <h2 className="section-title">Featured Stories</h2>
        </div>
        <a href="#" className="btn-outline-gold hidden md:inline-block" style={{ fontSize: '.6rem' }}>
          View All Stories
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Large card */}
        <div className="story-card md:col-span-7 h-80 md:h-[440px] reveal">
          <img loading="lazy" decoding="async" src={large.image} alt={large.category} className="absolute inset-0" />
          <div className="story-card-overlay" />
          <div className="card-content">
            <span className="category-badge">{large.category}</span>
            <h3
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 'clamp(1.2rem,3vw,1.9rem)',
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.1,
                marginTop: '.35rem',
              }}
            >
              {large.title}
            </h3>
            {large.excerpt && (
              <p className="text-xs mt-1" style={{ color: 'rgba(247,244,239,.7)' }}>
                {large.excerpt}
              </p>
            )}
            <button className="btn-gold mt-3" onClick={() => handleRead(large)}>
              {large.cta}
            </button>
          </div>
        </div>

        {/* Medium cards */}
        <div className="md:col-span-5 flex flex-col gap-3">
          {mediums.map((s) => (
            <div className="story-card h-48 md:flex-1 reveal" key={s.id}>
              <img loading="lazy" decoding="async" src={s.image} alt={s.category} />
              <div className="story-card-overlay" />
              <div className="card-content">
                <span className="category-badge">{s.category}</span>
                <h3
                  style={{
                    fontFamily: "'Playfair Display',serif",
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: '#fff',
                    marginTop: '.25rem',
                  }}
                >
                  {s.title}
                </h3>
                <button
                  className="btn-outline-gold mt-2"
                  style={{ fontSize: '.56rem', padding: '.3rem .8rem' }}
                  onClick={() => handleRead(s)}
                >
                  {s.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Small cards */}
        {smalls.map((s) => (
          <div className="story-card md:col-span-4 h-48 reveal" key={s.id}>
            <img loading="lazy" decoding="async" src={s.image} alt={s.category} className="absolute inset-0" />
            <div className="story-card-overlay" />
            <div className="card-content">
              <span className="category-badge">{s.category}</span>
              <h3
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: '.95rem',
                  fontWeight: 800,
                  color: '#fff',
                  marginTop: '.25rem',
                }}
              >
                {s.title}
              </h3>
              <button
                className="btn-outline-gold mt-2"
                style={{ fontSize: '.56rem', padding: '.3rem .8rem' }}
                onClick={() => handleRead(s)}
              >
                {s.cta}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}