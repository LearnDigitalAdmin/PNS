// VotingTab replacement for ContentSection.tsx
// Replaces the local-state voting section with Firestore-backed CRUD.
// Drop this in where VotingTab is currently defined.

import { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAdminData } from './AdminDataContext';
import { ICONS, EmptyState } from '../icons';
import {
  concludeContest,
  saveContestant,
  deleteContestantFS,
  type FSVotingCategory,
  type FSContestant,
} from '../../lib/firebaseVoting';
import { ImageUploadField } from '../ContentSection';


// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryStatus = 'scheduled' | 'open' | 'closed';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDatetimeLocal(ts: Timestamp | null): string {
  if (!ts) return '';
  const d = ts.toDate();
  // Format as YYYY-MM-DDTHH:MM for datetime-local input
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function countdownText(closes: Timestamp | null, status: CategoryStatus, concluded: boolean): string {
  if (concluded || status === 'closed') return 'Closed';
  if (!closes) return status === 'open' ? 'Open (no end date)' : 'Scheduled';
  const diff = closes.toMillis() - Date.now();
  if (diff <= 0) return 'Concluding…';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

// ─── Category form defaults ───────────────────────────────────────────────────

const emptyCatForm = () => ({
  key: '',
  name: '',
  icon: '🗳',
  status: 'scheduled' as CategoryStatus,
  opens: '',       // datetime-local string
  closes: '',      // datetime-local string
  order: 0,
});

// ─── VotingTab ────────────────────────────────────────────────────────────────

export default function VotingTab() {
  const { openConfirm, showToast, logActivity } = useAdminData();

  // ── Live categories from Firestore ──
  const [categories, setCategories] = useState<FSVotingCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'votingCategories'), orderBy('order', 'asc'));
    return onSnapshot(q, (snap) => {
      // We don't hydrate contestants here — done separately per expanded category
      setCategories(
        snap.docs.map((d) => ({
          id: d.id,
          key: d.data().key ?? d.id,
          name: d.data().name ?? '',
          icon: d.data().icon ?? '🗳',
          status: d.data().status ?? 'scheduled',
          opens: d.data().opens ?? null,
          closes: d.data().closes ?? null,
          winnerId: d.data().winnerId ?? null,
          winnerStoryId: d.data().winnerStoryId ?? null,
          concluded: d.data().concluded ?? false,
          contestants: [],   // hydrated in ContestantsPanel
        }))
      );
      setCatLoading(false);
    });
  }, []);

  // ── Category modal ──
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catForm, setCatForm] = useState(emptyCatForm());

  function openAddCat() {
    setEditingCatId(null);
    setCatForm({ ...emptyCatForm(), order: categories.length });
    setCatModalOpen(true);
  }

  function openEditCat(cat: FSVotingCategory) {
    setEditingCatId(cat.id);
    setCatForm({
      key: cat.key,
      name: cat.name,
      icon: cat.icon,
      status: cat.status,
      opens: formatDatetimeLocal(cat.opens),
      closes: formatDatetimeLocal(cat.closes),
      order: 0,
    });
    setCatModalOpen(true);
  }

  async function saveCat(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      key: catForm.key || catForm.name.toLowerCase().replace(/\s+/g, '_'),
      name: catForm.name,
      icon: catForm.icon,
      status: catForm.status,
      opens: catForm.opens ? Timestamp.fromDate(new Date(catForm.opens)) : null,
      closes: catForm.closes ? Timestamp.fromDate(new Date(catForm.closes)) : null,
      order: catForm.order,
    };

    if (editingCatId) {
      await updateDoc(doc(db, 'votingCategories', editingCatId), payload);
      logActivity(`Updated voting category: ${catForm.name}`);
      showToast('Category updated', 'success');
    } else {
      await addDoc(collection(db, 'votingCategories'), {
        ...payload,
        concluded: false,
        winnerId: null,
        winnerStoryId: null,
        createdAt: serverTimestamp(),
      });
      logActivity(`Created voting category: ${catForm.name}`);
      showToast('Category created', 'success');
    }
    setCatModalOpen(false);
  }

  async function deleteCat(cat: FSVotingCategory) {
    await deleteDoc(doc(db, 'votingCategories', cat.id));
    logActivity(`Deleted voting category: ${cat.name}`);
    showToast('Category deleted', 'danger');
  }

  async function handleConclude(cat: FSVotingCategory) {
    showToast('Concluding contest…', 'info');
    const ran = await concludeContest(cat.id);
    if (ran) {
      logActivity(`Concluded voting: ${cat.name} — winner auto-published as story`);
      showToast(`${cat.name} concluded — winner story published!`, 'success');
    } else {
      showToast('Already concluded', 'info');
    }
  }

  // ── Expanded category (show contestants) ──
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">Community Choice</p>
          <h1 className="page-title">Voting Arena</h1>
        </div>
        <button className="btn-gold-admin" onClick={openAddCat}>+ New Category</button>
      </div>

      {catLoading && (
        <div className="panel text-center" style={{ padding: '2rem' }}>
          <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)' }}>Loading…</p>
        </div>
      )}

      {!catLoading && categories.length === 0 && (
        <EmptyState message="No voting categories yet. Create one to get started." />
      )}

      <div className="space-y-4">
        {categories.map((cat) => {
          const isExpanded = expandedCatId === cat.id;
          const cd = countdownText(cat.closes, cat.status, cat.concluded);
          const statusBadge = cat.concluded || cat.status === 'closed'
            ? 'badge-gray'
            : cat.status === 'open'
            ? 'badge-success'
            : 'badge-info';

          return (
            <div className="panel" key={cat.id}>
              {/* Category header */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '1.3rem' }}>{cat.icon}</span>
                  <div>
                    <p className="font-display" style={{ fontSize: '1.05rem', fontWeight: 800 }}>{cat.name}</p>
                    <p style={{ fontSize: '.66rem', color: 'var(--warm-gray)' }}>
                      {cd}
                      {cat.closes && (
                        <> · closes {cat.closes.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
                      )}
                    </p>
                  </div>
                  <span className={`badge ${statusBadge}`}>{cat.concluded ? 'concluded' : cat.status}</span>
                  {cat.winnerStoryId && (
                    <span className="badge badge-gold">Story auto-published</span>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {/* Conclude / End button */}
                  {cat.status === 'open' && !cat.concluded && (
                    <button
                      className="btn-danger-admin"
                      style={{ fontSize: '.62rem', padding: '.35rem .7rem' }}
                      onClick={() =>
                        openConfirm(
                          `End "${cat.name}" now?`,
                          'The winner will be determined by votes (random on tie) and auto-published as a featured story.',
                          () => handleConclude(cat)
                        )
                      }
                    >
                      🏁 End Contest
                    </button>
                  )}

                  <button className="btn-icon" title="Edit" onClick={() => openEditCat(cat)}>{ICONS.edit}</button>
                  <button
                    className="btn-icon danger"
                    title="Delete"
                    onClick={() =>
                      openConfirm(`Delete "${cat.name}"?`, 'All contestants and votes will be lost.', () => deleteCat(cat))
                    }
                  >
                    {ICONS.trash}
                  </button>
                  <button
                    className="btn-outline-admin"
                    style={{ fontSize: '.62rem', padding: '.35rem .7rem' }}
                    onClick={() => setExpandedCatId(isExpanded ? null : cat.id)}
                  >
                    {isExpanded ? 'Hide' : 'Contestants'}
                  </button>
                </div>
              </div>

              {/* Winner display */}
              {cat.concluded && cat.winnerId && (
                <div style={{ background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,.3)', padding: '.5rem .8rem', marginBottom: '.8rem', fontSize: '.74rem' }}>
                  👑 Winner determined — story auto-published to the site.
                  {cat.winnerStoryId && (
                    <span style={{ marginLeft: '.5rem', color: 'var(--gold)', fontWeight: 600 }}>Story ID: {cat.winnerStoryId.slice(0, 8)}…</span>
                  )}
                </div>
              )}

              {/* Contestants panel */}
              {isExpanded && <ContestantsPanel category={cat} />}
            </div>
          );
        })}
      </div>

      {/* Category modal */}
      <div className={`modal-admin ${catModalOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setCatModalOpen(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 520 }}>
          <button onClick={() => setCatModalOpen(false)} style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
            &times;
          </button>
          <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
            <p className="section-eyebrow mb-1">{editingCatId ? 'Edit Category' : 'New Category'}</p>
            <h2 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {editingCatId ? 'Edit Voting Category' : 'Create Voting Category'}
            </h2>
          </div>
          <form onSubmit={saveCat} className="space-y-3" style={{ padding: '1.2rem 1.4rem' }}>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="field-label-admin">Icon</label>
                <input className="form-input-admin text-center" style={{ fontSize: '1.3rem' }} value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} maxLength={2} />
              </div>
              <div className="col-span-3">
                <label className="field-label-admin">Category Name *</label>
                <input className="form-input-admin" required value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Lady of the Week" />
              </div>
            </div>
            <div>
              <label className="field-label-admin">URL Key (auto-generated if blank)</label>
              <input className="form-input-admin" value={catForm.key} onChange={(e) => setCatForm({ ...catForm, key: e.target.value })} placeholder="lady_of_the_week" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="field-label-admin">Status</label>
                <select className="form-input-admin" value={catForm.status} onChange={(e) => setCatForm({ ...catForm, status: e.target.value as CategoryStatus })}>
                  <option value="scheduled">Scheduled</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="field-label-admin">Opens</label>
                <input type="datetime-local" className="form-input-admin" value={catForm.opens} onChange={(e) => setCatForm({ ...catForm, opens: e.target.value })} />
              </div>
              <div>
                <label className="field-label-admin">Closes *</label>
                <input type="datetime-local" className="form-input-admin" required value={catForm.closes} onChange={(e) => setCatForm({ ...catForm, closes: e.target.value })} />
              </div>
            </div>
            <div style={{ background: 'var(--info-bg)', border: '1px solid var(--info)', padding: '.55rem .8rem', fontSize: '.7rem', color: 'var(--info)' }}>
              ⏰ When the closing time passes, any connected client will automatically determine the winner and publish the featured story. You can also trigger this manually with the "End Contest" button.
            </div>
            <div className="flex gap-2 justify-end" style={{ marginTop: '.6rem' }}>
              <button type="button" className="btn-outline-admin" onClick={() => setCatModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-gold-admin">Save Category</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── ContestantsPanel ─────────────────────────────────────────────────────────

function ContestantsPanel({ category }: { category: FSVotingCategory }) {
  const { openConfirm, showToast, logActivity } = useAdminData();
  const [contestants, setContestants] = useState<FSContestant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'votingCategories', category.id, 'contestants'),
      orderBy('votes', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setContestants(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSContestant)));
      setLoading(false);
    });
  }, [category.id]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', tagline: '', image: '', reward: '🏆 Magazine Feature', votes: 0 });

  function openAdd() {
    setEditId(null);
    setForm({ name: '', tagline: '', image: '', reward: '🏆 Magazine Feature', votes: 0 });
    setModalOpen(true);
  }

  function openEdit(c: FSContestant) {
    setEditId(c.id);
    setForm({ name: c.name, tagline: c.tagline, image: c.image, reward: c.reward, votes: c.votes });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await saveContestant(category.id, editId, form);
    logActivity(`${editId ? 'Updated' : 'Added'} contestant "${form.name}" in ${category.name}`);
    showToast(editId ? 'Contestant updated' : 'Contestant added', 'success');
    setModalOpen(false);
  }

  async function remove(c: FSContestant) {
    await deleteContestantFS(category.id, c.id);
    logActivity(`Removed contestant "${c.name}" from ${category.name}`);
    showToast('Contestant removed', 'danger');
  }

  const maxVotes = Math.max(...contestants.map((c) => c.votes), 1);
  const total = contestants.reduce((s, c) => s + c.votes, 0);

  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem', marginTop: '.5rem' }}>
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Contestants · {total.toLocaleString()} total votes
        </p>
        {!category.concluded && (
          <button className="btn-outline-admin" style={{ fontSize: '.62rem', padding: '.35rem .7rem' }} onClick={openAdd}>
            + Add Contestant
          </button>
        )}
      </div>

      {loading && <p style={{ fontSize: '.72rem', color: 'var(--warm-gray)' }}>Loading contestants…</p>}

      <div className="space-y-2">
        {contestants.map((c, rank) => (
          <div key={c.id} className="flex items-center gap-3 p-2" style={{ border: '1px solid var(--line)' }}>
            <span style={{ fontSize: '.7rem', color: 'var(--warm-gray)', width: 20 }}>#{rank + 1}</span>
            {c.image ? (
              <img src={c.image} style={{ width: 40, height: 40, objectFit: 'cover', flexShrink: 0, outline: c.winner ? '2px solid var(--gold)' : 'none' }} />
            ) : (
              <div style={{ width: 40, height: 40, background: 'var(--off-white)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '.5rem', color: 'var(--warm-gray)' }}>No img</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '.78rem', fontWeight: 600 }} className="truncate">
                {c.name} {c.winner ? '👑' : ''}
              </p>
              <p className="font-script truncate" style={{ fontSize: '.72rem', fontStyle: 'italic', color: 'var(--warm-gray)' }}>{c.tagline}</p>
              <div style={{ background: 'var(--off-white)', height: 3, marginTop: '.3rem', maxWidth: 220 }}>
                <div style={{ height: 3, width: `${Math.round((c.votes / maxVotes) * 100)}%`, background: 'var(--gold)' }} />
              </div>
            </div>
            <span className="badge badge-gray hidden sm:inline-flex">{c.reward}</span>
            <span className="font-display" style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gold)', minWidth: 50, textAlign: 'right' }}>
              {c.votes.toLocaleString()}
            </span>
            {!category.concluded && (
              <div className="flex gap-1">
                <button className="btn-icon" title="Edit" onClick={() => openEdit(c)}>{ICONS.edit}</button>
                <button className="btn-icon danger" title="Remove" onClick={() => openConfirm('Remove contestant?', `"${c.name}" will be removed.`, () => remove(c))}>{ICONS.trash}</button>
              </div>
            )}
          </div>
        ))}
        {!loading && contestants.length === 0 && (
          <p style={{ fontSize: '.72rem', color: 'var(--warm-gray)' }}>No contestants yet.</p>
        )}
      </div>

      {/* Contestant modal */}
      <div className={`modal-admin ${modalOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setModalOpen(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 500 }}>
          <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>&times;</button>
          <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
            <p className="section-eyebrow mb-1">{editId ? 'Edit Contestant' : 'Add Contestant'}</p>
            <h2 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {editId ? 'Edit' : 'Add'} Contestant — {category.name}
            </h2>
          </div>
          <form onSubmit={save} className="space-y-3" style={{ padding: '1.2rem 1.4rem' }}>
            <div>
              <label className="field-label-admin">Name *</label>
              <input className="form-input-admin" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="field-label-admin">Tagline / Quote</label>
              <input className="form-input-admin" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder='"Their inspiring tagline"' />
            </div>
            <ImageUploadField
              label="Contestant Photo"
              value={form.image}
              onChange={(url) => setForm({ ...form, image: url })}
              folder="contestants"
              previewHeight={110}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label-admin">Reward Badge</label>
                <input className="form-input-admin" value={form.reward} onChange={(e) => setForm({ ...form, reward: e.target.value })} placeholder="🏆 Magazine Feature" />
              </div>
              <div>
                <label className="field-label-admin">Starting Votes</label>
                <input type="number" min={0} className="form-input-admin" value={form.votes} onChange={(e) => setForm({ ...form, votes: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end" style={{ marginTop: '.6rem' }}>
              <button type="button" className="btn-outline-admin" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-gold-admin">Save Contestant</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}