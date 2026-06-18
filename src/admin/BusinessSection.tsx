import { useState } from 'react';
import { useAdminData } from './context/AdminDataContext';
import { ICONS, EmptyState } from './icons';
import { REQUEST_TYPE_LABELS } from './data';
import type { RequestType, RequestStatus, DealStage, Partner, PartnerStatus, SponsoredDeal } from './types';

const BIZ_TABS = ['requests', 'sponsored', 'partners'] as const;
type BizTab = (typeof BIZ_TABS)[number];
const BIZ_LABELS: Record<BizTab, string> = { requests: 'Requests', sponsored: 'Sponsored Stories', partners: 'Partners' };

const REQ_TYPES: RequestType[] = ['featured', 'booking', 'sponsored', 'partnership', 'mediaKit'];

function reqDisplayName(type: RequestType, item: any) {
  if (type === 'featured' || type === 'booking') return item.name;
  if (type === 'sponsored' || type === 'partnership') return item.business;
  if (type === 'mediaKit') return item.company;
  return '—';
}
function reqDisplaySubtitle(type: RequestType, item: any) {
  if (type === 'featured') return `Applying for ${item.category}`;
  if (type === 'booking') return item.service;
  if (type === 'sponsored') return `${item.industry} · ${item.budget}`;
  if (type === 'partnership') return item.category;
  if (type === 'mediaKit') return 'Media kit request';
  return '';
}
function reqDetailRows(type: RequestType, item: any): [string, string][] {
  const rows: [string, string][] = [];
  if (type === 'featured') rows.push(['Name', item.name], ['Email', item.email], ['Category', item.category], ['Instagram', item.instagram], ['Story', item.detail]);
  if (type === 'booking') rows.push(['Name', item.name], ['Email', item.email], ['Phone', item.phone], ['Service', item.service], ['Preferred Date', item.prefDate], ['Message', item.message]);
  if (type === 'sponsored') rows.push(['Business', item.business], ['Contact', item.contact], ['Email', item.email], ['Industry', item.industry], ['Budget', item.budget], ['Goals', item.goals]);
  if (type === 'partnership') rows.push(['Business', item.business], ['Email', item.email], ['Category', item.category], ['About', item.about]);
  if (type === 'mediaKit') rows.push(['Company', item.company], ['Email', item.email]);
  rows.push(['Submitted', item.date], ['Status', item.status]);
  return rows;
}

function RequestsTab() {
  const { requests, setRequestStatus, deleteRequest, openConfirm } = useAdminData();
  const [activeType, setActiveType] = useState<RequestType>('featured');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<{ type: RequestType; id: number } | null>(null);

  function pendingCountFor(t: RequestType) {
    return requests[t].filter((r) => r.status === 'pending').length;
  }

  const list = (requests[activeType] as any[])
    .filter((r) => statusFilter === 'all' || r.status === statusFilter)
    .filter((r) => {
      const name = (reqDisplayName(activeType, r) || '').toLowerCase();
      const email = (r.email || '').toLowerCase();
      const q = search.toLowerCase();
      return !q || name.includes(q) || email.includes(q);
    });

  const viewingItem = viewing ? (requests[viewing.type] as any[]).find((r) => r.id === viewing.id) : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">Inbox</p>
          <h1 className="page-title">Requests</h1>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto mb-4" style={{ borderBottom: '1px solid var(--line)' }}>
        {REQ_TYPES.map((t) => (
          <button key={t} className={`tab-btn ${activeType === t ? 'active' : ''}`} onClick={() => setActiveType(t)}>
            {REQUEST_TYPE_LABELS[t]}
            <span className="count">{pendingCountFor(t)}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select className="form-input-admin" style={{ width: 'auto', fontSize: '.72rem', padding: '.45rem .6rem' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="contacted">Contacted</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="text"
          className="form-input-admin"
          style={{ width: 'auto', maxWidth: 220, fontSize: '.72rem', padding: '.45rem .6rem' }}
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="space-y-3">
        {list.length === 0 && <EmptyState message="No requests match these filters." />}
        {list.map((r) => {
          const name = reqDisplayName(activeType, r);
          const initials = (name || '??').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
          const statusBadge = { pending: 'badge-warn', approved: 'badge-success', contacted: 'badge-info', rejected: 'badge-danger' }[r.status as RequestStatus];
          return (
            <div className="data-card p-3 flex flex-col sm:flex-row sm:items-center gap-3" key={r.id}>
              <div className="avatar" style={{ background: 'var(--off-white)', color: 'var(--mid-gray)', flexShrink: 0 }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '.82rem', fontWeight: 700 }}>{name}</p>
                <p style={{ fontSize: '.7rem', color: 'var(--warm-gray)' }}>
                  {reqDisplaySubtitle(activeType, r)} · {r.email || ''}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: '.62rem', color: 'var(--warm-gray)' }}>{r.date}</span>
                <span className={`badge ${statusBadge}`}>{r.status}</span>
                <button className="btn-icon" title="View" onClick={() => setViewing({ type: activeType, id: r.id })}>
                  {ICONS.eye}
                </button>
                {r.status === 'pending' && (
                  <>
                    <button className="btn-icon" title="Approve" onClick={() => setRequestStatus(activeType, r.id, 'approved')}>
                      {ICONS.check}
                    </button>
                    <button className="btn-icon danger" title="Reject" onClick={() => setRequestStatus(activeType, r.id, 'rejected')}>
                      {ICONS.x}
                    </button>
                  </>
                )}
                {r.status === 'approved' && (
                  <button className="btn-icon" title="Mark contacted" onClick={() => setRequestStatus(activeType, r.id, 'contacted')}>
                    {ICONS.mail}
                  </button>
                )}
                <button
                  className="btn-icon danger"
                  title="Delete"
                  onClick={() => openConfirm('Delete this request?', `This entry from ${name} will be permanently removed.`, () => deleteRequest(activeType, r.id))}
                >
                  {ICONS.trash}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`modal-admin ${viewing ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setViewing(null)} />
        <div className="modal-box-admin" style={{ maxWidth: 520 }}>
          <button className="modal-close" onClick={() => setViewing(null)} style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
            &times;
          </button>
          {viewing && viewingItem && (
            <>
              <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
                <p className="section-eyebrow mb-1">{REQUEST_TYPE_LABELS[viewing.type]}</p>
                <h2 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  {reqDisplayName(viewing.type, viewingItem)}
                </h2>
              </div>
              <div style={{ padding: '1.2rem 1.4rem' }}>
                {reqDetailRows(viewing.type, viewingItem).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-1.5" style={{ borderBottom: '1px solid var(--line)', fontSize: '.78rem' }}>
                    <span style={{ color: 'var(--warm-gray)', flexShrink: 0 }}>{k}</span>
                    <span style={{ textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end" style={{ padding: '.9rem 1.4rem 1.3rem' }}>
                {viewingItem.status === 'pending' && (
                  <>
                    <button
                      className="btn-outline-admin"
                      onClick={() => {
                        setRequestStatus(viewing.type, viewingItem.id, 'rejected');
                        setViewing(null);
                      }}
                    >
                      Reject
                    </button>
                    <button
                      className="btn-gold-admin"
                      onClick={() => {
                        setRequestStatus(viewing.type, viewingItem.id, 'approved');
                        setViewing(null);
                      }}
                    >
                      Approve
                    </button>
                  </>
                )}
                {viewingItem.status === 'approved' && (
                  <button
                    className="btn-gold-admin"
                    onClick={() => {
                      setRequestStatus(viewing.type, viewingItem.id, 'contacted');
                      setViewing(null);
                    }}
                  >
                    Mark Contacted
                  </button>
                )}
                {(viewingItem.status === 'contacted' || viewingItem.status === 'rejected') && (
                  <button className="btn-outline-admin" onClick={() => setViewing(null)}>
                    Close
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const STAGES: { key: DealStage; label: string }[] = [
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'production', label: 'In Production' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
];

function SponsoredTab() {
  const { sponsoredDeals, addSponsoredDeal, moveDealStage, deleteDeal, openConfirm } = useAdminData();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Omit<SponsoredDeal, 'id'>>({ business: '', contact: '', industry: '', budget: '', stage: 'inquiry' });

  function save(e: React.FormEvent) {
    e.preventDefault();
    addSponsoredDeal({ ...form, industry: form.industry || 'General', budget: form.budget || '—' });
    setForm({ business: '', contact: '', industry: '', budget: '', stage: 'inquiry' });
    setModalOpen(false);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">Brand Partnerships</p>
          <h1 className="page-title">Sponsored Stories Pipeline</h1>
        </div>
        <button className="btn-gold-admin" onClick={() => setModalOpen(true)}>
          + New Deal
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((st, si) => {
          const cards = sponsoredDeals.filter((d) => d.stage === st.key);
          return (
            <div className="kanban-col" key={st.key}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{st.label}</span>
                <span className="badge badge-gray">{cards.length}</span>
              </div>
              {cards.length === 0 && <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)' }}>No deals here yet.</p>}
              {cards.map((d) => (
                <div className="kanban-card" key={d.id}>
                  <p style={{ fontWeight: 700 }}>{d.business}</p>
                  <p style={{ color: 'var(--warm-gray)', fontSize: '.68rem', marginTop: '.15rem' }}>
                    {d.industry} · {d.budget}
                  </p>
                  <p style={{ color: 'var(--warm-gray)', fontSize: '.68rem' }}>Contact: {d.contact}</p>
                  <div className="flex justify-between items-center mt-2">
                    <button
                      className="btn-icon danger"
                      title="Remove"
                      onClick={() => openConfirm('Remove this deal?', `"${d.business}" will be removed from the pipeline.`, () => deleteDeal(d.id))}
                    >
                      {ICONS.trash}
                    </button>
                    {si < STAGES.length - 1 && (
                      <button className="btn-outline-admin" style={{ fontSize: '.6rem', padding: '.3rem .5rem' }} onClick={() => moveDealStage(d.id)}>
                        {STAGES[si + 1].label} {ICONS.arrow}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className={`modal-admin ${modalOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setModalOpen(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 460 }}>
          <button className="modal-close" onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
            &times;
          </button>
          <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
            <h2 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              New Sponsored Deal
            </h2>
          </div>
          <form onSubmit={save} className="space-y-3" style={{ padding: '1.2rem 1.4rem' }}>
            <div>
              <label className="field-label-admin">Business / Story Name</label>
              <input className="form-input-admin" required value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} />
            </div>
            <div>
              <label className="field-label-admin">Contact Person</label>
              <input className="form-input-admin" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label-admin">Industry</label>
                <input className="form-input-admin" placeholder="Beauty & Wellness" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </div>
              <div>
                <label className="field-label-admin">Budget</label>
                <input className="form-input-admin" placeholder="KES 30K–60K" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="field-label-admin">Pipeline Stage</label>
              <select className="form-input-admin" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as DealStage })}>
                <option value="inquiry">Inquiry</option>
                <option value="production">In Production</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end" style={{ marginTop: '.6rem' }}>
              <button type="button" className="btn-outline-admin" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-gold-admin">
                Add Deal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function PartnersTab() {
  const { partners, addPartner, updatePartner, deletePartner, setPartnerStatus, openConfirm } = useAdminData();
  const [filter, setFilter] = useState<'all' | PartnerStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Partner, 'id'>>({ name: '', category: 'Salon', status: 'pending', email: '' });

  function openAdd() {
    setEditingId(null);
    setForm({ name: '', category: 'Salon', status: 'pending', email: '' });
    setModalOpen(true);
  }
  function openEdit(p: Partner) {
    setEditingId(p.id);
    setForm({ name: p.name, category: p.category, status: p.status, email: p.email });
    setModalOpen(true);
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) updatePartner(editingId, form);
    else addPartner(form);
    setModalOpen(false);
  }

  const list = partners.filter((p) => filter === 'all' || p.status === filter);

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">Our Ecosystem</p>
          <h1 className="page-title">Partners</h1>
        </div>
        <button className="btn-gold-admin" onClick={openAdd}>
          + Add Partner
        </button>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'active', 'pending', 'suspended'] as const).map((f) => (
          <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.length === 0 && <EmptyState message="No partners match this filter." />}
        {list.map((p) => {
          const statusBadge = { active: 'badge-success', pending: 'badge-warn', suspended: 'badge-danger' }[p.status];
          return (
            <div className="data-card p-3.5" key={p.id}>
              <div className="flex items-center gap-2.5">
                <div className="avatar" style={{ background: 'var(--gold-dim)', color: '#9a7a2c', flexShrink: 0 }}>
                  {p.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '.82rem', fontWeight: 700 }} className="truncate">
                    {p.name}
                  </p>
                  <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)' }}>{p.category}</p>
                </div>
                <span className={`badge ${statusBadge}`}>{p.status}</span>
              </div>
              <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)', marginTop: '.6rem' }}>{p.email}</p>
              <div className="flex gap-1.5 mt-2.5">
                <button className="btn-icon" title="Edit" onClick={() => openEdit(p)}>
                  {ICONS.edit}
                </button>
                {p.status !== 'suspended' ? (
                  <button className="btn-icon" title="Suspend" onClick={() => setPartnerStatus(p.id, 'suspended')}>
                    {ICONS.x}
                  </button>
                ) : (
                  <button className="btn-icon" title="Reactivate" onClick={() => setPartnerStatus(p.id, 'active')}>
                    {ICONS.check}
                  </button>
                )}
                <button
                  className="btn-icon danger"
                  title="Delete"
                  onClick={() => openConfirm('Remove this partner?', `"${p.name}" will be permanently removed from the directory.`, () => deletePartner(p.id))}
                >
                  {ICONS.trash}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`modal-admin ${modalOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setModalOpen(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 480 }}>
          <button className="modal-close" onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
            &times;
          </button>
          <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
            <p className="section-eyebrow mb-1">{editingId ? 'Edit Entry' : 'New Entry'}</p>
            <h2 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {editingId ? 'Edit Partner' : 'Add Partner'}
            </h2>
          </div>
          <form onSubmit={save} className="space-y-3" style={{ padding: '1.2rem 1.4rem' }}>
            <div>
              <label className="field-label-admin">Business Name</label>
              <input className="form-input-admin" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label-admin">Category</label>
                <select className="form-input-admin" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {['Salon', 'Barber', 'Fashion Designer', 'Makeup Artist', 'Tailor', 'Hotel', 'Wedding Planner', 'Gym / Fitness', 'Beauty Shop', 'Print Shop', 'Other'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label-admin">Status</label>
                <select className="form-input-admin" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PartnerStatus })}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div>
              <label className="field-label-admin">Contact Email</label>
              <input type="email" className="form-input-admin" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end" style={{ marginTop: '.6rem' }}>
              <button type="button" className="btn-outline-admin" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-gold-admin">
                Save Partner
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function BusinessSection() {
  const [tab, setTab] = useState<BizTab>('requests');

  return (
    <div className="dash-section">
      <div className="flex gap-1 overflow-x-auto mb-5" style={{ borderBottom: '1px solid var(--line)' }}>
        {BIZ_TABS.map((t) => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {BIZ_LABELS[t]}
          </button>
        ))}
      </div>
      {tab === 'requests' && <RequestsTab />}
      {tab === 'sponsored' && <SponsoredTab />}
      {tab === 'partners' && <PartnersTab />}
    </div>
  );
}
