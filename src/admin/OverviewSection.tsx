import { useNavigate } from 'react-router-dom';
import { useAdminData } from './context/AdminDataContext';

function votingCountdownText(closes: string) {
  const diff = new Date(closes + 'T23:59:00').getTime() - Date.now();
  if (diff <= 0) return 'closed';
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  return `${days}d ${hrs}h left`;
}

export default function OverviewSection() {
  const { stories, votingCategories, requests, partners, sponsoredDeals, activityLog, products } = useAdminData();
  const navigate = useNavigate();

  const pendingCount = Object.values(requests).flat().filter((r) => r.status === 'pending').length;
  const totalVotes = votingCategories.reduce((s, c) => s + c.contestants.reduce((s2, p) => s2 + p.votes, 0), 0);
  const activePartners = partners.filter((p) => p.status === 'active').length;
  const lowStock = products.find((p) => p.stock > 0 && p.stock <= 8);
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const nextClosing = votingCategories.filter((c) => c.status === 'open').sort((a, b) => new Date(a.closes).getTime() - new Date(b.closes).getTime())[0];
  const sponsoredPending = requests.sponsored.filter((r) => r.status === 'pending').length;
  const partnerPending = requests.partnership.filter((r) => r.status === 'pending').length;

  const tickerItems = [
    `⚠ ${pendingCount} pending request${pendingCount === 1 ? '' : 's'} awaiting review`,
    nextClosing ? `🗳 ${nextClosing.name} voting ${votingCountdownText(nextClosing.closes)}` : '',
    lowStock ? `📦 Low stock: ${lowStock.name} (${lowStock.stock} left)` : outOfStock ? `📦 ${outOfStock} product(s) out of stock` : '',
    `🤝 ${partnerPending} partnership application${partnerPending === 1 ? '' : 's'} awaiting review`,
    `💼 ${sponsoredPending} sponsored inquir${sponsoredPending === 1 ? 'y' : 'ies'} pending`,
  ].filter(Boolean);
  const tickerLoop = [...tickerItems, ...tickerItems];

  const stats = [
    { lbl: 'Total Stories', num: stories.length, delta: `${stories.filter((s) => s.status === 'live').length} live now` },
    { lbl: 'Total Votes (cycle)', num: totalVotes.toLocaleString(), delta: 'across 5 categories' },
    { lbl: 'Pending Requests', num: pendingCount, delta: 'across all inboxes' },
    { lbl: 'Active Partners', num: activePartners, delta: `${partners.length} total` },
    { lbl: 'Monthly Revenue (KES)', num: '2.18M', delta: '+12% vs last month' },
    { lbl: 'Shop Orders', num: '164', delta: 'this month' },
    { lbl: 'Newsletter Subscribers', num: '5,892', delta: '+340 this month' },
    { lbl: 'Sponsored Deals Live', num: sponsoredDeals.filter((d) => d.stage === 'live').length, delta: `${sponsoredDeals.length} in pipeline` },
  ];

  return (
    <div className="dash-section">
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">Welcome back, Amara</p>
          <h1 className="page-title">Editor Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline-admin" onClick={() => navigate('/admin/content')}>
            + New Story
          </button>
          <button className="btn-gold-admin" onClick={() => navigate('/admin/business')}>
            Review Requests
          </button>
        </div>
      </div>

      <div className="alert-ticker">
        <div className="alert-ticker-track text-xs font-semibold uppercase tracking-wide text-black">
          {tickerLoop.map((item, i) => (
            <span className="mx-7" key={i}>
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {stats.map((s) => (
          <div className="stat-card" key={s.lbl}>
            <div className="accent" />
            <div className="num">{s.num}</div>
            <div className="lbl">{s.lbl}</div>
            <div className="delta" style={{ color: 'var(--success)' }}>
              {s.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="panel lg:col-span-2">
          <div className="panel-title">
            Recent Activity{' '}
            <a onClick={() => navigate('/admin/system')} style={{ cursor: 'pointer', color: 'var(--gold)', fontSize: '.62rem', textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
              View all →
            </a>
          </div>
          <div className="space-y-2.5">
            {activityLog.slice(0, 6).map((a, i) => {
              const c = a.type === 'security' ? 'var(--danger)' : a.type === 'system' ? 'var(--info)' : 'var(--gold)';
              return (
                <div className="flex items-start gap-2.5" key={i}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, marginTop: '.4rem', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '.78rem' }}>{a.text}</p>
                    <p style={{ fontSize: '.62rem', color: 'var(--warm-gray)' }}>{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div className="panel">
            <div className="panel-title">Voting Snapshot</div>
            <div className="space-y-3">
              {votingCategories.map((c) => {
                const total = c.contestants.reduce((s, x) => s + x.votes, 0);
                const leader = c.contestants.reduce((a, b) => (b.votes > a.votes ? b : a), c.contestants[0]);
                const share = total ? Math.round((leader.votes / total) * 100) : 0;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between" style={{ fontSize: '.74rem' }}>
                      <span>
                        {c.icon} {c.name}
                      </span>
                      <span className={`badge ${c.status === 'open' ? 'badge-success' : c.status === 'scheduled' ? 'badge-info' : 'badge-gray'}`}>{c.status}</span>
                    </div>
                    <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)', marginTop: '.15rem' }}>
                      Leading: <b style={{ color: 'var(--black)' }}>{leader.name}</b> · {leader.votes.toLocaleString()} votes
                    </p>
                    <div style={{ background: 'var(--off-white)', height: 4, marginTop: '.3rem' }}>
                      <div style={{ height: 4, width: `${share}%`, background: 'var(--gold)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="panel">
            <div className="panel-title">Quick Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-outline-admin" style={{ fontSize: '.64rem' }} onClick={() => navigate('/admin/content')}>
                + Story
              </button>
              <button className="btn-outline-admin" style={{ fontSize: '.64rem' }} onClick={() => navigate('/admin/content')}>
                + Contestant
              </button>
              <button className="btn-outline-admin" style={{ fontSize: '.64rem' }} onClick={() => navigate('/admin/business')}>
                + Partner
              </button>
              <button className="btn-outline-admin" style={{ fontSize: '.64rem' }} onClick={() => navigate('/admin/content')}>
                + Product
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
