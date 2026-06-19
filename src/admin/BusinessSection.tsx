import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAdminData } from './context/AdminDataContext';
import { ICONS, EmptyState } from './icons';
import { REQUEST_TYPE_LABELS } from './data';
import { openWhatsApp, cleanPhoneForWhatsApp } from '../lib/fingerprint';
import type { RequestType, RequestStatus, DealStage, Partner, PartnerStatus, SponsoredDeal } from './types';

// ─── Types for Firestore documents ────────────────────────────────────────────

interface FirestoreRequest {
  id: string; // Firestore doc id
  [key: string]: any;
}

// ─── WhatsApp message builders ────────────────────────────────────────────────

function buildApproveMessage(type: RequestType, item: FirestoreRequest): string {
  const name = item.name ?? item.business ?? item.company ?? 'there';
  switch (type) {
    case 'featured':
      return (
        `Hi ${name}! 🎉 Great news — your application to be featured on P&S Magazine (${item.category}) has been *approved*! ` +
        `Our editorial team will be in touch soon with next steps. Welcome to the P&S family! ✦`
      );
    case 'booking':
      return (
        `Hi ${name}! ✅ Your booking request for *${item.service}* on ${item.prefDate ?? 'your preferred date'} has been *confirmed*. ` +
        `Please reply to confirm your attendance. Looking forward to working with you! — P&S Studio`
      );
    case 'sponsored':
      return (
        `Hi ${item.contact ?? name}! 🌟 We're excited to let you know that *${item.business}*'s sponsored story inquiry has been *approved*. ` +
        `Our brand partnership team will reach out within 48 hours with a proposal. — P&S Magazine`
      );
    case 'partnership':
      return (
        `Hi there! 🤝 *${item.business}* has been *approved* as a P&S Partner. ` +
        `Welcome to our ecosystem! We'll send you partner onboarding details shortly. — P&S Magazine`
      );
    case 'mediaKit':
      return (
        `Hi! 📄 Your media kit request from *${item.company ?? item.email}* has been approved. ` +
        `We're sending the P&S Media Kit to your email (${item.email}) now. — P&S Magazine`
      );
    default:
      return `Hi! Your request has been approved by P&S Magazine. We'll be in touch soon!`;
  }
}

function buildRejectMessage(type: RequestType, item: FirestoreRequest): string {
  const name = item.name ?? item.business ?? item.company ?? 'there';
  switch (type) {
    case 'featured':
      return (
        `Hi ${name}, thank you for applying to P&S Magazine. Unfortunately, we're unable to feature you this cycle — ` +
        `but we encourage you to apply again next month! Keep shining. ✦ — P&S Editorial`
      );
    case 'booking':
      return (
        `Hi ${name}, unfortunately we're unable to accommodate your booking request for *${item.service}* at this time. ` +
        `Please reach out to reschedule. — P&S Studio`
      );
    case 'sponsored':
      return (
        `Hi ${item.contact ?? name}, thank you for your interest in a P&S Sponsored Story. ` +
        `We're unable to proceed with *${item.business}*'s inquiry at this time, but we'd love to explore future opportunities. — P&S Magazine`
      );
    case 'partnership':
      return (
        `Hi, thank you for applying to become a P&S Partner. Unfortunately, *${item.business}*'s application was unsuccessful at this time. ` +
        `You're welcome to reapply in 3 months. — P&S Magazine`
      );
    case 'mediaKit':
      return `Hi, we're unable to fulfill your media kit request at this time. Please email hello@pandsmag.co.ke for assistance.`;
    default:
      return `Hi, your request to P&S Magazine was unsuccessful this time. Thank you for reaching out!`;
  }
}

// ─── Helper: display name / subtitle from a request ──────────────────────────

function reqDisplayName(type: RequestType, item: FirestoreRequest) {
  if (type === 'featured' || type === 'booking') return item.name ?? '—';
  if (type === 'sponsored' || type === 'partnership') return item.business ?? '—';
  if (type === 'mediaKit') return item.company ?? '—';
  return '—';
}

function reqDisplaySubtitle(type: RequestType, item: FirestoreRequest) {
  if (type === 'featured') return `Applying for ${item.category ?? ''}`;
  if (type === 'booking') return item.service ?? '';
  if (type === 'sponsored') return `${item.industry ?? ''} · ${item.budget ?? ''}`;
  if (type === 'partnership') return item.category ?? '';
  if (type === 'mediaKit') return 'Media kit request';
  return '';
}

function reqDetailRows(type: RequestType, item: FirestoreRequest): [string, string][] {
  const rows: [string, string][] = [];
  if (type === 'featured')
    rows.push(
      ['Name', item.name], ['Email', item.email], ['Phone', item.phone],
      ['Category', item.category], ['Instagram', item.instagram], ['Story', item.detail]
    );
  if (type === 'booking')
    rows.push(
      ['Name', item.name], ['Email', item.email], ['Phone', item.phone],
      ['Service', item.service], ['Preferred Date', item.prefDate], ['Message', item.message]
    );
  if (type === 'sponsored')
    rows.push(
      ['Business', item.business], ['Contact', item.contact], ['Email', item.email],
      ['Phone', item.phone], ['Industry', item.industry], ['Budget', item.budget], ['Goals', item.goals]
    );
  if (type === 'partnership')
    rows.push(
      ['Business', item.business], ['Email', item.email], ['Phone', item.phone],
      ['Category', item.category], ['About', item.about]
    );
  if (type === 'mediaKit')
    rows.push(['Company', item.company], ['Email', item.email], ['Phone', item.phone]);
  rows.push(['Submitted', item.date], ['Status', item.status]);
  return rows.filter(([, v]) => v != null && v !== '');
}

// ─── Auto-populate on approval ────────────────────────────────────────────────

async function autoPopulateOnApproval(type: RequestType, item: FirestoreRequest) {
  try {
    if (type === 'featured') {
      // Add to stories collection
      await addDoc(collection(db, 'stories'), {
        title: `${item.name}: Feature Story`,
        category: item.category ?? 'Woman of the Week',
        excerpt: item.detail?.slice(0, 120) ?? '',
        body: item.detail ?? '',
        image: item.image ?? '',
        status: 'draft',
        author: 'Editorial Team',
        date: '—',
        instagram: item.instagram ?? '',
        sourceRequestId: item.id,
        createdAt: serverTimestamp(),
      });
    }

    if (type === 'partnership') {
      // Add to partners collection
      await addDoc(collection(db, 'partners'), {
        name: item.business ?? '',
        category: item.category ?? 'Other',
        status: 'active',
        email: item.email ?? '',
        phone: item.phone ?? '',
        sourceRequestId: item.id,
        createdAt: serverTimestamp(),
      });
    }

    if (type === 'sponsored') {
      // Add to sponsored deals pipeline
      await addDoc(collection(db, 'sponsoredDeals'), {
        business: item.business ?? '',
        contact: item.contact ?? '',
        industry: item.industry ?? 'General',
        budget: item.budget ?? '—',
        stage: 'inquiry',
        email: item.email ?? '',
        phone: item.phone ?? '',
        sourceRequestId: item.id,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.error('autoPopulateOnApproval error:', err);
  }
}

// ─── Firestore request collection path ───────────────────────────────────────

function fsRequestPath(type: RequestType) {
  return collection(db, 'requests', type, 'items');
}

// ─── REQ_TYPES ────────────────────────────────────────────────────────────────

const REQ_TYPES: RequestType[] = ['featured', 'booking', 'sponsored', 'partnership', 'mediaKit'];

const BIZ_TABS = ['requests', 'sponsored', 'partners'] as const;
type BizTab = (typeof BIZ_TABS)[number];
const BIZ_LABELS: Record<BizTab, string> = {
  requests: 'Requests',
  sponsored: 'Sponsored Stories',
  partners: 'Partners',
};

// ─── RequestsTab ──────────────────────────────────────────────────────────────

function RequestsTab() {
  const { openConfirm, showToast, logActivity } = useAdminData();
  const [activeType, setActiveType] = useState<RequestType>('featured');
  const [statusFilter, setStatusFilter] = useState<'all' | RequestStatus>('all');
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<FirestoreRequest | null>(null);
  const [requests, setRequests] = useState<Record<RequestType, FirestoreRequest[]>>({
    featured: [], booking: [], sponsored: [], partnership: [], mediaKit: [],
  });
  const [loading, setLoading] = useState(true);

  // Live subscription per active type
  useEffect(() => {
    setLoading(true);
    const q = query(fsRequestPath(activeType), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as FirestoreRequest[];
      setRequests((prev) => ({ ...prev, [activeType]: docs }));
      setLoading(false);
    });
    return unsub;
  }, [activeType]);

  function pendingCountFor(t: RequestType) {
    return (requests[t] ?? []).filter((r) => r.status === 'pending').length;
  }

  const list = (requests[activeType] ?? [])
    .filter((r) => statusFilter === 'all' || r.status === statusFilter)
    .filter((r) => {
      const name = (reqDisplayName(activeType, r) ?? '').toLowerCase();
      const email = (r.email ?? '').toLowerCase();
      const q = search.toLowerCase();
      return !q || name.includes(q) || email.includes(q);
    });

  async function setStatus(item: FirestoreRequest, status: RequestStatus) {
    const ref = doc(db, 'requests', activeType, 'items', item.id);
    await updateDoc(ref, { status });
    if (status === 'approved') {
      await autoPopulateOnApproval(activeType, item);
      const name = reqDisplayName(activeType, item);
      logActivity(`Approved ${name}'s ${REQUEST_TYPE_LABELS[activeType].toLowerCase()} — auto-populated collections`);
      showToast(`Approved · collections updated`, 'success');
      // Open WhatsApp
      if (item.phone) {
        openWhatsApp(item.phone, buildApproveMessage(activeType, item));
      }
    } else if (status === 'rejected') {
      showToast('Marked as rejected', 'danger');
      logActivity(`Rejected ${reqDisplayName(activeType, item)}'s ${activeType} request`);
      if (item.phone) {
        openWhatsApp(item.phone, buildRejectMessage(activeType, item));
      }
    } else if (status === 'contacted') {
      showToast('Marked as contacted', 'success');
    }
  }

  async function deleteItem(item: FirestoreRequest) {
    await deleteDoc(doc(db, 'requests', activeType, 'items', item.id));
    showToast('Request deleted', 'danger');
    logActivity(`Deleted ${reqDisplayName(activeType, item)}'s ${activeType} request`);
  }

  function handleWhatsApp(item: FirestoreRequest, type: 'approve' | 'reject') {
    if (!item.phone) {
      showToast('No phone number on this request', 'danger');
      return;
    }
    const msg = type === 'approve'
      ? buildApproveMessage(activeType, item)
      : buildRejectMessage(activeType, item);
    openWhatsApp(item.phone, msg);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">Inbox</p>
          <h1 className="page-title">Requests</h1>
        </div>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 overflow-x-auto mb-4" style={{ borderBottom: '1px solid var(--line)' }}>
        {REQ_TYPES.map((t) => (
          <button key={t} className={`tab-btn ${activeType === t ? 'active' : ''}`} onClick={() => setActiveType(t)}>
            {REQUEST_TYPE_LABELS[t]}
            <span className="count">{pendingCountFor(t)}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select
          className="form-input-admin"
          style={{ width: 'auto', fontSize: '.72rem', padding: '.45rem .6rem' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
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

      {/* List */}
      <div className="space-y-3">
        {loading && (
          <div className="panel text-center" style={{ padding: '2rem' }}>
            <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)' }}>Loading…</p>
          </div>
        )}
        {!loading && list.length === 0 && <EmptyState message="No requests match these filters." />}
        {list.map((r) => {
          const name = reqDisplayName(activeType, r);
          const initials = (name || '??').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
          const statusBadge = {
            pending: 'badge-warn',
            approved: 'badge-success',
            contacted: 'badge-info',
            rejected: 'badge-danger',
          }[r.status as RequestStatus] ?? 'badge-gray';
          const hasPhone = !!r.phone && !!cleanPhoneForWhatsApp(r.phone);

          return (
            <div className="data-card p-3 flex flex-col sm:flex-row sm:items-center gap-3" key={r.id}>
              {/* Featured image thumbnail */}
              {activeType === 'featured' && r.image ? (
                <img
                  src={r.image}
                  alt={name}
                  style={{ width: 40, height: 40, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--line)' }}
                />
              ) : (
                <div className="avatar" style={{ background: 'var(--off-white)', color: 'var(--mid-gray)', flexShrink: 0 }}>
                  {initials}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p style={{ fontSize: '.82rem', fontWeight: 700 }}>{name}</p>
                <p style={{ fontSize: '.7rem', color: 'var(--warm-gray)' }}>
                  {reqDisplaySubtitle(activeType, r)} · {r.email ?? ''}
                  {r.phone ? ` · 📱 ${r.phone}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: '.62rem', color: 'var(--warm-gray)' }}>{r.date}</span>
                <span className={`badge ${statusBadge}`}>{r.status}</span>

                {/* View */}
                <button className="btn-icon" title="View" onClick={() => setViewing(r)}>
                  {ICONS.eye}
                </button>

                {/* Approve */}
                {r.status === 'pending' && (
                  <>
                    <button
                      className="btn-icon"
                      title="Approve (opens WhatsApp)"
                      onClick={() => setStatus(r, 'approved')}
                    >
                      {ICONS.check}
                    </button>
                    <button
                      className="btn-icon danger"
                      title="Reject (opens WhatsApp)"
                      onClick={() => setStatus(r, 'rejected')}
                    >
                      {ICONS.x}
                    </button>
                  </>
                )}

                {r.status === 'approved' && (
                  <button
                    className="btn-icon"
                    title="Mark contacted"
                    onClick={() => setStatus(r, 'contacted')}
                  >
                    {ICONS.mail}
                  </button>
                )}

                {/* WhatsApp resend */}
                {hasPhone && (r.status === 'approved' || r.status === 'rejected' || r.status === 'contacted') && (
                  <button
                    className="btn-icon"
                    title="Resend WhatsApp"
                    onClick={() =>
                      handleWhatsApp(r, r.status === 'rejected' ? 'reject' : 'approve')
                    }
                    style={{ color: '#25D366' }}
                  >
                    <svg className="icon" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  </button>
                )}

                {/* Delete */}
                <button
                  className="btn-icon danger"
                  title="Delete"
                  onClick={() =>
                    openConfirm(
                      'Delete this request?',
                      `This entry from ${name} will be permanently removed.`,
                      () => deleteItem(r)
                    )
                  }
                >
                  {ICONS.trash}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <div className={`modal-admin ${viewing ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setViewing(null)} />
        <div className="modal-box-admin" style={{ maxWidth: 520 }}>
          <button
            className="modal-close"
            onClick={() => setViewing(null)}
            style={{
              position: 'absolute', top: '.7rem', right: '.7rem',
              fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999',
            }}
          >
            &times;
          </button>
          {viewing && (
            <>
              <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
                <p className="section-eyebrow mb-1">{REQUEST_TYPE_LABELS[activeType]}</p>
                <h2 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  {reqDisplayName(activeType, viewing)}
                </h2>
              </div>

              {/* Featured image preview */}
              {activeType === 'featured' && viewing.image && (
                <div style={{ padding: '1rem 1.4rem 0' }}>
                  <img
                    src={viewing.image}
                    alt="Applicant"
                    style={{ width: '100%', height: 200, objectFit: 'cover', border: '1px solid var(--line)' }}
                  />
                </div>
              )}

              <div style={{ padding: '1.2rem 1.4rem' }}>
                {reqDetailRows(activeType, viewing).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between gap-3 py-1.5"
                    style={{ borderBottom: '1px solid var(--line)', fontSize: '.78rem' }}
                  >
                    <span style={{ color: 'var(--warm-gray)', flexShrink: 0 }}>{k}</span>
                    <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end flex-wrap" style={{ padding: '.9rem 1.4rem 1.3rem' }}>
                {viewing.status === 'pending' && (
                  <>
                    <button
                      className="btn-outline-admin"
                      onClick={() => {
                        setStatus(viewing, 'rejected');
                        setViewing(null);
                      }}
                    >
                      Reject
                    </button>
                    <button
                      className="btn-gold-admin"
                      onClick={() => {
                        setStatus(viewing, 'approved');
                        setViewing(null);
                      }}
                    >
                      Approve ↗ WhatsApp
                    </button>
                  </>
                )}
                {viewing.status === 'approved' && (
                  <>
                    <button
                      className="btn-outline-admin"
                      onClick={() => handleWhatsApp(viewing, 'approve')}
                    >
                      Resend WhatsApp
                    </button>
                    <button
                      className="btn-gold-admin"
                      onClick={() => {
                        setStatus(viewing, 'contacted');
                        setViewing(null);
                      }}
                    >
                      Mark Contacted
                    </button>
                  </>
                )}
                {(viewing.status === 'contacted' || viewing.status === 'rejected') && (
                  <>
                    {viewing.phone && (
                      <button
                        className="btn-outline-admin"
                        onClick={() =>
                          handleWhatsApp(viewing, viewing.status === 'rejected' ? 'reject' : 'approve')
                        }
                      >
                        WhatsApp
                      </button>
                    )}
                    <button className="btn-outline-admin" onClick={() => setViewing(null)}>
                      Close
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SponsoredTab (Firestore-backed pipeline) ─────────────────────────────────

const STAGES: { key: DealStage; label: string }[] = [
  { key: 'inquiry', label: 'Inquiry' },
  { key: 'production', label: 'In Production' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
];
const STAGE_ORDER: DealStage[] = ['inquiry', 'production', 'live', 'completed'];

function SponsoredTab() {
  const { openConfirm, showToast, logActivity } = useAdminData();
  const [deals, setDeals] = useState<FirestoreRequest[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ business: '', contact: '', industry: '', budget: '', stage: 'inquiry' as DealStage });

  useEffect(() => {
    const q = query(collection(db, 'sponsoredDeals'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setDeals(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  async function addDeal(e: React.FormEvent) {
    e.preventDefault();
    await addDoc(collection(db, 'sponsoredDeals'), {
      ...form,
      industry: form.industry || 'General',
      budget: form.budget || '—',
      createdAt: serverTimestamp(),
    });
    logActivity(`Added sponsored deal: ${form.business}`);
    showToast('Deal added', 'success');
    setForm({ business: '', contact: '', industry: '', budget: '', stage: 'inquiry' });
    setModalOpen(false);
  }

  async function moveDeal(deal: FirestoreRequest) {
    const idx = STAGE_ORDER.indexOf(deal.stage);
    if (idx >= STAGE_ORDER.length - 1) return;
    const nextStage = STAGE_ORDER[idx + 1];
    await updateDoc(doc(db, 'sponsoredDeals', deal.id), { stage: nextStage });
    logActivity(`"${deal.business}" moved to ${nextStage}`);
    showToast(`Moved to ${nextStage}`, 'success');
  }

  async function deleteDeal(deal: FirestoreRequest) {
    await deleteDoc(doc(db, 'sponsoredDeals', deal.id));
    showToast('Deal removed', 'danger');
    logActivity(`Removed deal: ${deal.business}`);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">Brand Partnerships</p>
          <h1 className="page-title">Sponsored Stories Pipeline</h1>
        </div>
        <button className="btn-gold-admin" onClick={() => setModalOpen(true)}>+ New Deal</button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((st, si) => {
          const cards = deals.filter((d) => d.stage === st.key);
          return (
            <div className="kanban-col" key={st.key}>
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                  {st.label}
                </span>
                <span className="badge badge-gray">{cards.length}</span>
              </div>
              {cards.length === 0 && (
                <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)' }}>No deals here yet.</p>
              )}
              {cards.map((d) => (
                <div className="kanban-card" key={d.id}>
                  <p style={{ fontWeight: 700 }}>{d.business}</p>
                  <p style={{ color: 'var(--warm-gray)', fontSize: '.68rem', marginTop: '.15rem' }}>
                    {d.industry} · {d.budget}
                  </p>
                  <p style={{ color: 'var(--warm-gray)', fontSize: '.68rem' }}>Contact: {d.contact}</p>
                  {d.phone && (
                    <p style={{ color: 'var(--warm-gray)', fontSize: '.68rem' }}>📱 {d.phone}</p>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <button
                      className="btn-icon danger"
                      title="Remove"
                      onClick={() =>
                        openConfirm(
                          'Remove this deal?',
                          `"${d.business}" will be removed.`,
                          () => deleteDeal(d)
                        )
                      }
                    >
                      {ICONS.trash}
                    </button>
                    {si < STAGES.length - 1 && (
                      <button
                        className="btn-outline-admin"
                        style={{ fontSize: '.6rem', padding: '.3rem .5rem' }}
                        onClick={() => moveDeal(d)}
                      >
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

      {/* New Deal Modal */}
      <div className={`modal-admin ${modalOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setModalOpen(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 460 }}>
          <button
            onClick={() => setModalOpen(false)}
            style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
          >
            &times;
          </button>
          <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
            <h2 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800 }}>New Sponsored Deal</h2>
          </div>
          <form onSubmit={addDeal} className="space-y-3" style={{ padding: '1.2rem 1.4rem' }}>
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
              <button type="button" className="btn-outline-admin" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-gold-admin">Add Deal</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── PartnersTab (Firestore-backed) ──────────────────────────────────────────

function PartnersTab() {
  const { openConfirm, showToast, logActivity } = useAdminData();
  const [partners, setPartners] = useState<FirestoreRequest[]>([]);
  const [filter, setFilter] = useState<'all' | PartnerStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: 'Salon', status: 'pending' as PartnerStatus, email: '', phone: '' });

  useEffect(() => {
    const q = query(collection(db, 'partners'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setPartners(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm({ name: '', category: 'Salon', status: 'pending', email: '', phone: '' });
    setModalOpen(true);
  }

  function openEdit(p: FirestoreRequest) {
    setEditingId(p.id);
    setForm({ name: p.name, category: p.category, status: p.status, email: p.email, phone: p.phone ?? '' });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await updateDoc(doc(db, 'partners', editingId), { ...form });
      logActivity(`Updated partner: ${form.name}`);
      showToast('Partner updated', 'success');
    } else {
      await addDoc(collection(db, 'partners'), { ...form, createdAt: serverTimestamp() });
      logActivity(`Added partner: ${form.name}`);
      showToast('Partner added', 'success');
    }
    setModalOpen(false);
  }

  async function deletePartner(p: FirestoreRequest) {
    await deleteDoc(doc(db, 'partners', p.id));
    showToast('Partner removed', 'danger');
    logActivity(`Removed partner: ${p.name}`);
  }

  async function setPartnerStatus(p: FirestoreRequest, status: PartnerStatus) {
    await updateDoc(doc(db, 'partners', p.id), { status });
    showToast(`${p.name} ${status === 'active' ? 'reactivated' : 'suspended'}`, status === 'active' ? 'success' : 'danger');
    logActivity(`${status === 'active' ? 'Reactivated' : 'Suspended'} partner: ${p.name}`);
  }

  const list = partners.filter((p) => filter === 'all' || p.status === filter);

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">Our Ecosystem</p>
          <h1 className="page-title">Partners</h1>
        </div>
        <button className="btn-gold-admin" onClick={openAdd}>+ Add Partner</button>
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
          const statusBadge = { active: 'badge-success', pending: 'badge-warn', suspended: 'badge-danger' }[p.status as PartnerStatus] ?? 'badge-gray';
          return (
            <div className="data-card p-3.5" key={p.id}>
              <div className="flex items-center gap-2.5">
                <div className="avatar" style={{ background: 'var(--gold-dim)', color: '#9a7a2c', flexShrink: 0 }}>
                  {(p.name?.[0] ?? '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '.82rem', fontWeight: 700 }} className="truncate">{p.name}</p>
                  <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)' }}>{p.category}</p>
                </div>
                <span className={`badge ${statusBadge}`}>{p.status}</span>
              </div>
              <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)', marginTop: '.6rem' }}>{p.email}</p>
              {p.phone && (
                <p style={{ fontSize: '.68rem', color: 'var(--warm-gray)' }}>📱 {p.phone}</p>
              )}
              <div className="flex gap-1.5 mt-2.5">
                <button className="btn-icon" title="Edit" onClick={() => openEdit(p)}>{ICONS.edit}</button>
                {p.status !== 'suspended' ? (
                  <button className="btn-icon" title="Suspend" onClick={() => setPartnerStatus(p, 'suspended')}>{ICONS.x}</button>
                ) : (
                  <button className="btn-icon" title="Reactivate" onClick={() => setPartnerStatus(p, 'active')}>{ICONS.check}</button>
                )}
                <button
                  className="btn-icon danger"
                  title="Delete"
                  onClick={() =>
                    openConfirm(
                      'Remove this partner?',
                      `"${p.name}" will be permanently removed.`,
                      () => deletePartner(p)
                    )
                  }
                >
                  {ICONS.trash}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <div className={`modal-admin ${modalOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setModalOpen(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 480 }}>
          <button
            onClick={() => setModalOpen(false)}
            style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
          >
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
                  {['Salon','Barber','Fashion Designer','Makeup Artist','Tailor','Hotel','Wedding Planner','Gym / Fitness','Beauty Shop','Print Shop','Other'].map((c) => (
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
            <div>
              <label className="field-label-admin">Phone / WhatsApp</label>
              <input type="tel" className="form-input-admin" placeholder="0712 345 678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end" style={{ marginTop: '.6rem' }}>
              <button type="button" className="btn-outline-admin" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-gold-admin">Save Partner</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

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