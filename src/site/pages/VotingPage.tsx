import { useEffect, useRef, useState } from 'react';
import { votingCategories, rewardsStrip } from '../data';
import { useSite } from '../context/SiteContext';
import type { VotingCategory } from '../types';

function useCountdown() {
  const [label, setLabel] = useState('');
  useEffect(() => {
    function update() {
      const now = new Date();
      const sun = new Date(now);
      sun.setDate(sun.getDate() + ((7 - sun.getDay()) % 7 || 7));
      sun.setHours(23, 59, 59, 0);
      const diff = sun.getTime() - now.getTime();
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLabel(`Closes in ${d}d ${h}h ${m}m`);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);
  return label;
}

function CategoryPanel({ catIdx, category, hidden, countdown }: { catIdx: number; category: VotingCategory; hidden: boolean; countdown: string }) {
  const { voting, goToContestant, nextContestant, prevContestant, castVote } = useSite();
  const state = voting[catIdx];
  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    if (!wrapper || !track) return;
    const w = wrapper.offsetWidth;
    track.style.transform = `translateX(-${state.position * w}px)`;
  }, [state.position]);

  const current = category.contestants[state.position];
  const gridCols = category.contestants.length;

  return (
    <div className={`vote-panel ${hidden ? 'hidden' : ''}`} data-cat={catIdx}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div>
          <div style={{ overflow: 'hidden' }} className="reveal" ref={wrapperRef}>
            <div className="vote-category-track" ref={trackRef}>
              {category.contestants.map((c, i) => (
                <div className="contestant-card" key={c.id}>
                  <div className="relative overflow-hidden" style={{ height: 360 }}>
                    <img loading="lazy" decoding="async" src={c.image} className="w-full h-full object-cover" />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(10,10,10,.82) 0%,transparent 58%)' }} />
                    <div className="reward-badge absolute top-3 right-3">{c.reward}</div>
                    <div className="absolute bottom-3 left-4 right-4">
                      <p style={{ fontSize: '.55rem', color: 'var(--gold)', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 600 }}>
                        {i + 1} of {category.contestants.length}
                      </p>
                      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>{c.name}</h3>
                      <p style={{ fontSize: '.72rem', color: 'rgba(247,244,239,.62)', fontStyle: 'italic', fontFamily: "'Cormorant Garamond',serif" }}>
                        {c.tagline}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2 items-center">
              {category.contestants.map((c, i) => (
                <button key={c.id} className={`contestant-pip ${i === state.position ? 'active' : ''}`} onClick={() => goToContestant(catIdx, i)} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => prevContestant(catIdx)} className="btn-outline-gold" style={{ fontSize: '.9rem', padding: '.28rem .7rem' }}>
                ←
              </button>
              <button onClick={() => nextContestant(catIdx)} className="btn-outline-gold" style={{ fontSize: '.9rem', padding: '.28rem .7rem' }}>
                →
              </button>
            </div>
          </div>
        </div>

        <div className="glass-dark p-5 reveal">
          <p style={{ fontSize: '.56rem', color: 'var(--gold)', letterSpacing: '.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '.4rem' }}>
            {category.panelTitle}
          </p>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.55rem', fontWeight: 800, color: '#fff' }}>{current.name}</h3>
          <p style={{ fontSize: '.75rem', color: 'var(--warm-gray)', marginTop: '.25rem' }}>{current.tagline}</p>
          <div className="mt-5 mb-1">
            <div className="vote-count-big" style={state.voted ? { transform: 'scale(1.1)' } : undefined}>
              {state.votes.toLocaleString()}
            </div>
            <p style={{ fontSize: '.62rem', color: 'var(--warm-gray)' }}>votes this week</p>
          </div>
          <div style={{ background: 'rgba(247,244,239,.1)', height: 4, margin: '.9rem 0', borderRadius: 2 }}>
            <div style={{ background: 'var(--gold)', height: 4, width: `${state.barWidth}%`, borderRadius: 2, transition: 'width .5s' }} />
          </div>
          <p className="countdown">{countdown}</p>
          <button
            className={`vote-btn-big mt-3 ${state.voted ? 'voted' : ''}`}
            onClick={() => castVote(catIdx)}
            disabled={state.voted}
          >
            {state.voted ? '✦ Voted!' : '✦ Vote for This Contestant'}
          </button>
          {state.voted && (
            <div className="text-center py-2 fade-in-up">
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', color: 'var(--gold)', fontWeight: 700 }}>✦ Vote Cast!</p>
              <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)', marginTop: '.15rem' }}>Results announced Monday.</p>
            </div>
          )}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(247,244,239,.07)' }}>
            <p style={{ fontSize: '.56rem', color: 'var(--warm-gray)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '.6rem' }}>
              All Contestants
            </p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0,1fr))` }}>
              {category.contestants.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => goToContestant(catIdx, i)}
                  className="cursor-pointer relative overflow-hidden thumb-box"
                  style={{ height: 65, border: i === state.position ? '2px solid var(--gold)' : '2px solid transparent' }}
                >
                  <img loading="lazy" decoding="async" src={c.image.replace(/w=\d+/, 'w=120').replace(/q=\d+/, 'q=60')} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-end">
                    <p style={{ fontSize: '.44rem', background: 'rgba(0,0,0,.7)', color: '#fff', width: '100%', padding: '.15rem .25rem', textAlign: 'center' }}>
                      {c.name.split(' ')[0] === 'The' ? c.name.split(' ')[1] : c.name.split(' ')[0]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VotingPage() {
  const [activeCat, setActiveCat] = useState(0);
  const countdown = useCountdown();

  return (
    <div className="px-5 md:px-10 py-6 max-w-7xl mx-auto">
      <div className="reveal text-center mb-5">
        <p className="section-eyebrow mb-1">Community Choice</p>
        <div className="gold-line mx-auto mb-3" />
        <h2 className="section-title" style={{ color: 'var(--warm-white)' }}>
          Voting Arena
        </h2>
        <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: 'var(--warm-gray)' }}>
          Swipe through contestants in each category. One vote per category. Voting closes Sunday midnight.
        </p>
      </div>

      <div className="flex gap-2 mb-5 justify-center flex-wrap">
        {votingCategories.map((cat, i) => (
          <button key={cat.id} className={`cat-tab ${activeCat === i ? 'active' : ''}`} onClick={() => setActiveCat(i)}>
            {cat.label}
          </button>
        ))}
      </div>

      <div>
        {votingCategories.map((cat, i) => (
          <CategoryPanel key={cat.id} catIdx={i} category={cat} hidden={activeCat !== i} countdown={countdown} />
        ))}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-7 reveal">
        {rewardsStrip.map((r) => (
          <div className="glass-dark p-3 text-center" key={r.label}>
            <div className="text-lg mb-1">{r.emoji}</div>
            <p style={{ fontSize: '.56rem', color: 'var(--warm-white)', fontWeight: 600 }}>{r.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
