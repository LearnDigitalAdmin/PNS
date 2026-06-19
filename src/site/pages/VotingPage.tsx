import { useEffect, useRef, useState, useCallback } from 'react';
import { rewardsStrip } from '../data';
import { useSite } from '../context/SiteContext';
import {
  canPerformAction,
  msUntilReset,
  formatCountdown,
  type ActionKey,
} from '../../lib/fingerprint';
import type { FSVotingCategory, FSContestant } from '@/lib/firebaseVoting';

// ─── Live countdown per category ──────────────────────────────────────────────

function useLiveCountdown(category: FSVotingCategory): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function compute() {
      const now = Date.now();

      if (category.concluded || category.status === 'closed') {
        setLabel('Voting closed');
        return;
      }

      if (category.status === 'scheduled') {
        if (category.opens) {
          const diff = category.opens.toMillis() - now;
          if (diff <= 0) {
            setLabel('Opening soon…');
          } else {
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            setLabel(d > 0 ? `Opens in ${d}d ${h}h` : `Opens in ${h}h ${m}m`);
          }
        } else {
          setLabel('Scheduled');
        }
        return;
      }

      if (category.status === 'open') {
        if (category.closes) {
          const diff = category.closes.toMillis() - now;
          if (diff <= 0) {
            setLabel('Concluding…');
          } else {
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            if (d > 0) setLabel(`Closes in ${d}d ${h}h ${m}m`);
            else if (h > 0) setLabel(`Closes in ${h}h ${m}m`);
            else if (m > 0) setLabel(`Closes in ${m}m ${s}s`);
            else setLabel(`Closes in ${s}s`);
          }
        } else {
          setLabel('Open — no end date set');
        }
      }
    }

    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [category]);

  return label;
}

// ─── Per-category vote gate (fingerprint check) ───────────────────────────────

function useVoteGate(catKey: string) {
  const action = `vote_${catKey}` as ActionKey;
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await canPerformAction(action);
      const ms = ok ? 0 : await msUntilReset(action);
      if (!cancelled) { setAllowed(ok); setRemainingMs(ms); }
    })();
    return () => { cancelled = true; };
  }, [action]);

  return { allowed, remainingMs };
}

// ─── CategoryPanel ─────────────────────────────────────────────────────────────

interface CategoryPanelProps {
  catIdx: number;
  category: FSVotingCategory;
  hidden: boolean;
}

function CategoryPanel({ catIdx, category, hidden }: CategoryPanelProps) {
  const { votingClient, goToContestant, nextContestant, prevContestant, castVote, triggerConclude } = useSite();
  const { allowed, remainingMs } = useVoteGate(category.key);
  const client = votingClient[catIdx];
  const countdown = useLiveCountdown(category);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const position = client?.position ?? 0;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    if (!wrapper || !track) return;
    const w = wrapper.offsetWidth;
    track.style.transform = `translateX(-${position * w}px)`;
  }, [position]);

  if (!client) return null;

  const contestants = category.contestants;
  const current: FSContestant | undefined = contestants[position];
  const hasVoted = client.voted || allowed === false;
  const isClosed = category.status === 'closed' || category.concluded;
  const isOpen = category.status === 'open' && !category.concluded;

  // Total votes for bar calculation
  const totalVotes = contestants.reduce((s, c) => s + c.votes, 0);
  const maxVotes = Math.max(...contestants.map((c) => c.votes), 1);
  const currentBarPct = current ? Math.round((current.votes / maxVotes) * 100) : 0;

  // Winner
  const winner = contestants.find((c) => c.winner);

  async function handleVote() {
    if (!isOpen || hasVoted || allowed === null) return;
    await castVote(catIdx);
  }

  async function handleEndContest() {
    await triggerConclude(category.id);
  }

  return (
    <div
      className={`vote-panel ${hidden ? 'hidden' : ''}`}
      data-cat={catIdx}
    >
      {/* Winner banner */}
      {isClosed && winner && (
        <div
          style={{
            background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
            color: '#0a0a0a',
            padding: '.7rem 1.2rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '.8rem',
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>👑</span>
          <div>
            <p style={{ fontSize: '.56rem', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase' }}>
              Winner — {category.name}
            </p>
            <p style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: '1.1rem' }}>
              {winner.name}
            </p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ fontSize: '.62rem', fontWeight: 700 }}>{winner.votes.toLocaleString()} votes</p>
            <p style={{ fontSize: '.56rem', opacity: .7 }}>Story auto-published ✦</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Left: image carousel */}
        <div>
          <div style={{ overflow: 'hidden' }} className="reveal" ref={wrapperRef}>
            <div className="vote-category-track" ref={trackRef}>
              {contestants.map((c, i) => (
                <div className="contestant-card" key={c.id}>
                  <div className="relative overflow-hidden" style={{ height: 360 }}>
                    <img loading="lazy" decoding="async" src={c.image} className="w-full h-full object-cover" />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top,rgba(10,10,10,.82) 0%,transparent 58%)',
                      }}
                    />
                    {c.winner && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '.7rem',
                          left: '.7rem',
                          background: 'var(--gold)',
                          color: '#000',
                          fontSize: '.56rem',
                          fontWeight: 700,
                          letterSpacing: '.12em',
                          textTransform: 'uppercase',
                          padding: '.2rem .6rem',
                        }}
                      >
                        👑 Winner
                      </div>
                    )}
                    <div className="reward-badge absolute top-3 right-3">{c.reward}</div>
                    <div className="absolute bottom-3 left-4 right-4">
                      <p style={{ fontSize: '.55rem', color: 'var(--gold)', letterSpacing: '.15em', textTransform: 'uppercase', fontWeight: 600 }}>
                        {i + 1} of {contestants.length}
                      </p>
                      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>
                        {c.name}
                      </h3>
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
              {contestants.map((c, i) => (
                <button
                  key={c.id}
                  className={`contestant-pip ${i === position ? 'active' : ''}`}
                  onClick={() => goToContestant(catIdx, i)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => prevContestant(catIdx)} className="btn-outline-gold" style={{ fontSize: '.9rem', padding: '.28rem .7rem' }}>←</button>
              <button onClick={() => nextContestant(catIdx)} className="btn-outline-gold" style={{ fontSize: '.9rem', padding: '.28rem .7rem' }}>→</button>
            </div>
          </div>
        </div>

        {/* Right: vote panel */}
        <div className="glass-dark p-5 reveal">
          <p style={{ fontSize: '.56rem', color: 'var(--gold)', letterSpacing: '.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '.4rem' }}>
            {category.name}
          </p>
          <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.55rem', fontWeight: 800, color: '#fff' }}>
            {current?.name ?? '—'}
          </h3>
          <p style={{ fontSize: '.75rem', color: 'var(--warm-gray)', marginTop: '.25rem' }}>
            {current?.tagline}
          </p>

          {/* Vote count */}
          <div className="mt-5 mb-1">
            <div className="vote-count-big">{current?.votes.toLocaleString() ?? '0'}</div>
            <p style={{ fontSize: '.62rem', color: 'var(--warm-gray)' }}>votes · {totalVotes.toLocaleString()} total this cycle</p>
          </div>

          {/* Vote bar */}
          <div style={{ background: 'rgba(247,244,239,.1)', height: 4, margin: '.9rem 0', borderRadius: 2 }}>
            <div style={{ background: 'var(--gold)', height: 4, width: `${currentBarPct}%`, borderRadius: 2, transition: 'width .5s' }} />
          </div>

          {/* Countdown */}
          <p className="countdown">{countdown}</p>

          {/* Rate-limit note */}
          {allowed === false && !client.voted && isOpen && (
            <div style={{ background: 'rgba(201,168,76,.12)', border: '1px solid rgba(201,168,76,.3)', padding: '.5rem .7rem', marginTop: '.6rem', marginBottom: '.2rem', fontSize: '.68rem', color: 'var(--gold-light)', textAlign: 'center' }}>
              ⏳ You've already voted. Returns in <strong>{formatCountdown(remainingMs)}</strong>.
            </div>
          )}

          {/* Vote button */}
          {!isClosed ? (
            <button
              className={`vote-btn-big mt-3 ${hasVoted ? 'voted' : ''}`}
              onClick={handleVote}
              disabled={hasVoted || allowed === null || !isOpen}
            >
              {allowed === null
                ? '…'
                : category.status === 'scheduled'
                ? '⏳ Voting not open yet'
                : hasVoted
                ? '✦ Voted!'
                : '✦ Vote for This Contestant'}
            </button>
          ) : (
            <div style={{ marginTop: '.8rem', padding: '.7rem', background: 'rgba(201,168,76,.1)', border: '1px solid rgba(201,168,76,.25)', textAlign: 'center' }}>
              <p style={{ fontSize: '.72rem', color: 'var(--gold)', fontWeight: 600 }}>
                {winner ? `👑 ${winner.name} won this round!` : 'Voting has closed.'}
              </p>
            </div>
          )}

          {client.voted && !isClosed && (
            <div className="text-center py-2 fade-in-up">
              <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1rem', color: 'var(--gold)', fontWeight: 700 }}>✦ Vote Cast!</p>
              <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)', marginTop: '.15rem' }}>Results announced when voting closes.</p>
            </div>
          )}

          {/* Leaderboard */}
          {contestants.length > 0 && (
            <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(247,244,239,.07)' }}>
              <p style={{ fontSize: '.56rem', color: 'var(--warm-gray)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '.6rem' }}>
                {isClosed ? 'Final Standings' : 'Leaderboard'}
              </p>
              <div className="space-y-2">
                {[...contestants].sort((a, b) => b.votes - a.votes).slice(0, 3).map((c, rank) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.7rem' }}>
                    <span style={{ color: rank === 0 ? 'var(--gold)' : 'var(--warm-gray)', width: 16, fontWeight: 700 }}>
                      {rank === 0 && isClosed ? '👑' : `#${rank + 1}`}
                    </span>
                    <img src={c.image} style={{ width: 28, height: 28, objectFit: 'cover', flexShrink: 0 }} alt={c.name} />
                    <span style={{ flex: 1, color: '#fff', fontWeight: rank === 0 ? 700 : 400 }}>{c.name}</span>
                    <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{c.votes.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thumbnail grid */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(247,244,239,.07)' }}>
            <p style={{ fontSize: '.56rem', color: 'var(--warm-gray)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '.6rem' }}>
              All Contestants
            </p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(contestants.length, 4)}, minmax(0,1fr))` }}>
              {contestants.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => goToContestant(catIdx, i)}
                  className="cursor-pointer relative overflow-hidden thumb-box"
                  style={{ height: 65, border: i === position ? '2px solid var(--gold)' : '2px solid transparent' }}
                >
                  <img
                    loading="lazy"
                    decoding="async"
                    src={c.image}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-end">
                    <p style={{ fontSize: '.44rem', background: 'rgba(0,0,0,.7)', color: '#fff', width: '100%', padding: '.15rem .25rem', textAlign: 'center' }}>
                      {c.name.split(' ')[0] === 'The' ? c.name.split(' ')[1] : c.name.split(' ')[0]}
                    </p>
                  </div>
                  {c.winner && (
                    <div style={{ position: 'absolute', top: 2, right: 2, fontSize: '.55rem' }}>👑</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Manual end button (for open categories that may be past deadline or admin override) */}
          {isOpen && (
            <button
              onClick={handleEndContest}
              style={{
                marginTop: '.8rem',
                width: '100%',
                fontSize: '.6rem',
                padding: '.4rem',
                background: 'transparent',
                border: '1px solid rgba(247,244,239,.15)',
                color: 'rgba(247,244,239,.4)',
                cursor: 'pointer',
                letterSpacing: '.06em',
                textTransform: 'uppercase',
              }}
            >
              End & Conclude Voting
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function VotingSkeleton() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(201,168,76,.25)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <p style={{ fontSize: '.72rem', color: 'var(--warm-gray)' }}>Loading voting arena…</p>
      </div>
    </div>
  );
}

// ─── VotingPage ────────────────────────────────────────────────────────────────

export default function VotingPage() {
  const { votingCategories, votingLoading } = useSite();
  const [activeCat, setActiveCat] = useState(0);

  // Keep activeCat in bounds when categories load
  useEffect(() => {
    if (activeCat >= votingCategories.length && votingCategories.length > 0) {
      setActiveCat(0);
    }
  }, [votingCategories.length, activeCat]);

  return (
    <div className="px-5 md:px-10 py-6 max-w-7xl mx-auto">
      <div className="reveal text-center mb-5">
        <p className="section-eyebrow mb-1">Community Choice</p>
        <div className="gold-line mx-auto mb-3" />
        <h2 className="section-title" style={{ color: 'var(--warm-white)' }}>
          Voting Arena
        </h2>
        <p className="text-xs mt-1 max-w-md mx-auto" style={{ color: 'var(--warm-gray)' }}>
          Swipe through contestants in each category. One vote per category per 24 hours.
        </p>
      </div>

      {votingLoading ? (
        <VotingSkeleton />
      ) : votingCategories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--warm-gray)', fontSize: '.82rem' }}>
          No voting categories set up yet. Check back soon!
        </div>
      ) : (
        <>
          {/* Category tabs */}
          <div className="flex gap-2 mb-5 justify-center flex-wrap">
            {votingCategories.map((cat, i) => (
              <button
                key={cat.id}
                className={`cat-tab ${activeCat === i ? 'active' : ''}`}
                onClick={() => setActiveCat(i)}
                style={{ position: 'relative' }}
              >
                {cat.icon} {cat.name}
                {cat.status === 'open' && !cat.concluded && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#5c7a52',
                    border: '1px solid #fff',
                  }} />
                )}
                {cat.concluded && (
                  <span style={{ marginLeft: '.3rem', fontSize: '.55rem' }}>✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Panels */}
          <div>
            {votingCategories.map((cat, i) => (
              <CategoryPanel
                key={cat.id}
                catIdx={i}
                category={cat}
                hidden={activeCat !== i}
              />
            ))}
          </div>

          {/* Rewards strip */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-7 reveal">
            {rewardsStrip.map((r) => (
              <div className="glass-dark p-3 text-center" key={r.label}>
                <div className="text-lg mb-1">{r.emoji}</div>
                <p style={{ fontSize: '.56rem', color: 'var(--warm-white)', fontWeight: 600 }}>{r.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}