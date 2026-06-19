import { useRef, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { useAdminData } from './context/AdminDataContext';
import { ICONS, EmptyState } from './icons';
import type { AdminStory, StoryStatus, VotingCategory } from './types';
import VotingTab from './context/votingTab';

// ─────────────────────────────────────────────
// Shared image-upload hook
// ─────────────────────────────────────────────
function useStorageUpload(folder: string) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string> {
    setUploading(true);
    setError(null);
    setProgress(0);
    const ext = file.name.split('.').pop();
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, path);
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file);
      task.on(
        'state_changed',
        (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => {
          setError(err.message);
          setUploading(false);
          reject(err);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setUploading(false);
          setProgress(100);
          resolve(url);
        }
      );
    });
  }

  return { upload, uploading, progress, error };
}

// ─────────────────────────────────────────────
// Reusable ImageUploadField component
// Replaces every "Image URL" text input in the admin forms.
// ─────────────────────────────────────────────
interface ImageUploadFieldProps {
  label?: string;
  value: string;           // current download URL (or empty)
  onChange: (url: string) => void;
  folder: string;          // Firebase Storage sub-folder
  previewHeight?: number;
}

export function ImageUploadField({
  label = 'Image',
  value,
  onChange,
  folder,
  previewHeight = 130,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, progress, error } = useStorageUpload(folder);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await upload(file);
      onChange(url);
    } catch {
      // error already set inside hook
    }
    // reset so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      {label && <label className="field-label-admin">{label}</label>}

      {/* Hidden native file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {/* Upload button / progress */}
      <button
        type="button"
        className="btn-outline-admin w-full"
        style={{ fontSize: '.72rem', marginBottom: '.4rem', justifyContent: 'flex-start', gap: '.6rem' }}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <span
              style={{
                width: 13,
                height: 13,
                border: '2px solid rgba(0,0,0,.15)',
                borderTopColor: 'var(--gold)',
                borderRadius: '50%',
                animation: 'spin .8s linear infinite',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            Uploading… {progress}%
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {value ? 'Replace Image' : 'Upload Image'}
          </>
        )}
      </button>

      {/* Progress bar */}
      {uploading && (
        <div style={{ height: 3, background: 'var(--off-white)', marginBottom: '.4rem' }}>
          <div
            style={{
              height: 3,
              width: `${progress}%`,
              background: 'var(--gold)',
              transition: 'width .2s',
            }}
          />
        </div>
      )}

      {error && (
        <p style={{ fontSize: '.66rem', color: 'var(--danger)', marginBottom: '.3rem' }}>
          Upload failed: {error}
        </p>
      )}

      {/* Preview */}
      {value && (
        <div style={{ position: 'relative' }}>
          <img
            src={value}
            alt="preview"
            style={{
              width: '100%',
              height: previewHeight,
              objectFit: 'cover',
              display: 'block',
              border: '1px solid var(--line)',
            }}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              position: 'absolute',
              top: '.3rem',
              right: '.3rem',
              background: 'rgba(0,0,0,.6)',
              color: '#fff',
              border: 'none',
              borderRadius: 2,
              padding: '.15rem .4rem',
              fontSize: '.62rem',
              cursor: 'pointer',
            }}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Tab constants
// ─────────────────────────────────────────────
const TABS = ['stories', 'voting', 'gallery', 'shop'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABELS: Record<Tab, string> = {
  stories: 'Featured Stories',
  voting: 'Voting Arena',
  gallery: 'Cogvana Gallery',
  shop: 'Shop Products',
};

function votingCountdownText(closes: string) {
  const diff = new Date(closes + 'T23:59:00').getTime() - Date.now();
  if (diff <= 0) return 'Closed';
  const days = Math.floor(diff / 86400000);
  const hrs = Math.floor((diff % 86400000) / 3600000);
  return `${days}d ${hrs}h left`;
}

const emptyStory = (): Omit<AdminStory, 'id'> => ({
  title: '',
  category: 'Woman of the Week',
  excerpt: '',
  body: '',
  image: '',
  status: 'draft',
  author: 'Editorial Team',
  date: '—',
});

// ─────────────────────────────────────────────
// STORIES TAB
// ─────────────────────────────────────────────
function StoriesTab() {
  const { stories, addStory, updateStory, deleteStory, publishStory, openConfirm } = useAdminData();
  const [filter, setFilter] = useState<'all' | StoryStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyStory());

  function openAdd() {
    setEditingId(null);
    setForm(emptyStory());
    setModalOpen(true);
  }
  function openEdit(s: AdminStory) {
    setEditingId(s.id);
    setForm({
      title: s.title,
      category: s.category,
      excerpt: s.excerpt,
      body: s.body,
      image: s.image,
      status: s.status,
      author: s.author,
      date: s.date,
    });
    setModalOpen(true);
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    const date =
      form.status === 'live'
        ? new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : form.status === 'scheduled'
        ? form.date || 'Scheduled'
        : '—';
    const payload = { ...form, date };
    if (editingId) updateStory(editingId, payload);
    else addStory(payload);
    setModalOpen(false);
  }

  const list = stories.filter((s) => filter === 'all' || s.status === filter);

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">This Week's Edition</p>
          <h1 className="page-title">Featured Stories</h1>
        </div>
        <button className="btn-gold-admin" onClick={openAdd}>
          + New Story
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'live', 'scheduled', 'draft'] as const).map((c) => (
          <button
            key={c}
            className={`filter-chip ${filter === c ? 'active' : ''}`}
            onClick={() => setFilter(c)}
          >
            {c === 'all' ? 'All' : c[0].toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.length === 0 && <EmptyState message="No stories match this filter." />}
        {list.map((s) => (
          <div className="data-card" key={s.id}>
            <div style={{ height: 150, overflow: 'hidden', position: 'relative' }}>
              {s.image ? (
                <img src={s.image} className="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--off-white)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '.68rem', color: 'var(--warm-gray)' }}>No image</span>
                </div>
              )}
              <span
                className={`badge ${s.status === 'live' ? 'badge-success' : s.status === 'scheduled' ? 'badge-warn' : 'badge-gray'}`}
                style={{ position: 'absolute', top: '.5rem', right: '.5rem' }}
              >
                {s.status}
              </span>
            </div>
            <div className="p-3">
              <p className="badge badge-gold mb-1.5">{s.category}</p>
              <p className="font-display" style={{ fontSize: '.95rem', fontWeight: 800, lineHeight: 1.2 }}>
                {s.title}
              </p>
              <p style={{ fontSize: '.72rem', color: 'var(--warm-gray)', marginTop: '.3rem', lineHeight: 1.4 }}>
                {s.excerpt}
              </p>
              <div
                className="flex items-center justify-between mt-3"
                style={{ fontSize: '.62rem', color: 'var(--warm-gray)' }}
              >
                <span>{s.author}</span>
                <span>{s.date}</span>
              </div>
              <div className="flex gap-1.5 mt-3">
                <button className="btn-icon" title="Edit" onClick={() => openEdit(s)}>
                  {ICONS.edit}
                </button>
                {s.status !== 'live' && (
                  <button className="btn-icon" title="Publish now" onClick={() => publishStory(s.id)}>
                    {ICONS.check}
                  </button>
                )}
                <button
                  className="btn-icon danger"
                  title="Delete"
                  onClick={() =>
                    openConfirm('Delete this story?', `"${s.title}" will be permanently removed.`, () =>
                      deleteStory(s.id)
                    )
                  }
                >
                  {ICONS.trash}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Story Modal */}
      <div className={`modal-admin ${modalOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setModalOpen(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 600 }}>
          <button
            className="modal-close"
            onClick={() => setModalOpen(false)}
            style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
          >
            &times;
          </button>
          <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
            <p className="section-eyebrow mb-1">{editingId ? 'Edit Entry' : 'New Entry'}</p>
            <h2 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              {editingId ? 'Edit Featured Story' : 'Add Featured Story'}
            </h2>
          </div>
          <form onSubmit={save} className="space-y-3" style={{ padding: '1.2rem 1.4rem' }}>
            <div>
              <label className="field-label-admin">Headline</label>
              <input
                className="form-input-admin"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label-admin">Category</label>
                <select
                  className="form-input-admin"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {[
                    'Woman of the Week',
                    'Man of the Week',
                    'Couple of the Week',
                    'Artist of the Week',
                    'Entrepreneur of the Week',
                    'Fashion Feature',
                  ].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label-admin">Author</label>
                <input
                  className="form-input-admin"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              </div>
            </div>

            {/* ▶ STORAGE UPLOAD replaces URL input */}
            <ImageUploadField
              label="Cover Image"
              value={form.image}
              onChange={(url) => setForm({ ...form, image: url })}
              folder="stories"
              previewHeight={140}
            />

            <div>
              <label className="field-label-admin">Excerpt</label>
              <textarea
                className="form-input-admin"
                rows={2}
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label-admin">Full Story Body</label>
              <textarea
                className="form-input-admin"
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label-admin">Status</label>
                <select
                  className="form-input-admin"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as StoryStatus })}
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                </select>
              </div>
              {form.status === 'scheduled' && (
                <div>
                  <label className="field-label-admin">Publish Date</label>
                  <input
                    type="date"
                    className="form-input-admin"
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end" style={{ marginTop: '.6rem' }}>
              <button type="button" className="btn-outline-admin" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-gold-admin">
                Save Story
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// VOTING TAB
// ─────────────────────────────────────────────
const STAGES: { key: VotingCategory['status']; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'closed', label: 'Closed' },
];

// function VotingTab() {
//   const {
//     votingCategories,
//     saveCategorySchedule,
//     addContestant,
//     updateContestant,
//     deleteContestant,
//     crownWinner,
//     resetCategoryVotes,
//     resetAllVotes,
//     openConfirm,
//   } = useAdminData();

//   const [schedules, setSchedules] = useState<
//     Record<number, { opens: string; closes: string; status: VotingCategory['status'] }>
//   >(() =>
//     Object.fromEntries(
//       votingCategories.map((c) => [c.id, { opens: c.opens, closes: c.closes, status: c.status }])
//     )
//   );
//   const [contModal, setContModal] = useState<{ catId: number; contId: number | null } | null>(null);
//   const [contForm, setContForm] = useState({
//     name: '',
//     tagline: '',
//     image: '',
//     reward: '',
//     votes: 0,
//   });

//   function openAddContestant(catId: number) {
//     setContModal({ catId, contId: null });
//     setContForm({ name: '', tagline: '', image: '', reward: '🏆 Magazine Feature', votes: 0 });
//   }
//   function openEditContestant(catId: number, contId: number) {
//     const cat = votingCategories.find((c) => c.id === catId)!;
//     const p = cat.contestants.find((x) => x.id === contId)!;
//     setContModal({ catId, contId });
//     setContForm({ name: p.name, tagline: p.tagline, image: p.image, reward: p.reward, votes: p.votes });
//   }
//   function saveContestant(e: React.FormEvent) {
//     e.preventDefault();
//     if (!contModal) return;
//     if (contModal.contId) updateContestant(contModal.catId, contModal.contId, contForm);
//     else addContestant(contModal.catId, contForm);
//     setContModal(null);
//   }

//   return (
//     <div>
//       <div className="page-head">
//         <div>
//           <p className="section-eyebrow mb-1">Community Choice</p>
//           <h1 className="page-title">Voting Arena</h1>
//         </div>
//         <button
//           className="btn-danger-admin"
//           onClick={() =>
//             openConfirm(
//               'Reset ALL votes?',
//               'This clears vote counts across every category. This cannot be undone.',
//               resetAllVotes
//             )
//           }
//         >
//           Reset All Votes
//         </button>
//       </div>

//       <div className="space-y-4">
//         {votingCategories.map((c) => {
//           const sorted = [...c.contestants].sort((a, b) => b.votes - a.votes);
//           const max = sorted[0]?.votes || 1;
//           const total = c.contestants.reduce((s, x) => s + x.votes, 0);
//           const sched = schedules[c.id];
//           return (
//             <div className="panel" key={c.id}>
//               <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
//                 <div className="flex items-center gap-2">
//                   <span style={{ fontSize: '1.3rem' }}>{c.icon}</span>
//                   <div>
//                     <p className="font-display" style={{ fontSize: '1.05rem', fontWeight: 800 }}>
//                       {c.name}
//                     </p>
//                     <p style={{ fontSize: '.66rem', color: 'var(--warm-gray)' }}>
//                       {total.toLocaleString()} total votes · {votingCountdownText(c.closes)}
//                     </p>
//                   </div>
//                   <span
//                     className={`badge ${
//                       c.status === 'open'
//                         ? 'badge-success'
//                         : c.status === 'scheduled'
//                         ? 'badge-info'
//                         : 'badge-gray'
//                     }`}
//                   >
//                     {c.status}
//                   </span>
//                 </div>
//                 {sched && (
//                   <div className="flex items-end gap-2 flex-wrap">
//                     <div>
//                       <label className="field-label-admin">Opens</label>
//                       <input
//                         type="date"
//                         className="form-input-admin"
//                         style={{ fontSize: '.7rem', padding: '.4rem' }}
//                         value={sched.opens}
//                         onChange={(e) =>
//                           setSchedules({ ...schedules, [c.id]: { ...sched, opens: e.target.value } })
//                         }
//                       />
//                     </div>
//                     <div>
//                       <label className="field-label-admin">Closes</label>
//                       <input
//                         type="date"
//                         className="form-input-admin"
//                         style={{ fontSize: '.7rem', padding: '.4rem' }}
//                         value={sched.closes}
//                         onChange={(e) =>
//                           setSchedules({ ...schedules, [c.id]: { ...sched, closes: e.target.value } })
//                         }
//                       />
//                     </div>
//                     <div>
//                       <label className="field-label-admin">Status</label>
//                       <select
//                         className="form-input-admin"
//                         style={{ fontSize: '.7rem', padding: '.4rem' }}
//                         value={sched.status}
//                         onChange={(e) =>
//                           setSchedules({
//                             ...schedules,
//                             [c.id]: { ...sched, status: e.target.value as VotingCategory['status'] },
//                           })
//                         }
//                       >
//                         {STAGES.map((s) => (
//                           <option key={s.key} value={s.key}>
//                             {s.label}
//                           </option>
//                         ))}
//                       </select>
//                     </div>
//                     <button
//                       className="btn-outline-admin"
//                       style={{ fontSize: '.62rem' }}
//                       onClick={() => saveCategorySchedule(c.id, sched.opens, sched.closes, sched.status)}
//                     >
//                       Save Schedule
//                     </button>
//                   </div>
//                 )}
//               </div>

//               <div className="space-y-2 mb-3">
//                 {sorted.map((p, i) => (
//                   <div
//                     className="flex items-center gap-3 p-2"
//                     style={{ border: '1px solid var(--line)' }}
//                     key={p.id}
//                   >
//                     <span style={{ fontSize: '.7rem', color: 'var(--warm-gray)', width: 16 }}>#{i + 1}</span>
//                     {p.image ? (
//                       <img
//                         src={p.image}
//                         style={{
//                           width: 40,
//                           height: 40,
//                           objectFit: 'cover',
//                           flexShrink: 0,
//                           outline: p.winner ? '2px solid var(--gold)' : 'none',
//                         }}
//                       />
//                     ) : (
//                       <div
//                         style={{
//                           width: 40,
//                           height: 40,
//                           background: 'var(--off-white)',
//                           flexShrink: 0,
//                           display: 'flex',
//                           alignItems: 'center',
//                           justifyContent: 'center',
//                         }}
//                       >
//                         <span style={{ fontSize: '.5rem', color: 'var(--warm-gray)' }}>No img</span>
//                       </div>
//                     )}
//                     <div className="flex-1 min-w-0">
//                       <p style={{ fontSize: '.78rem', fontWeight: 600 }} className="truncate">
//                         {p.name} {p.winner ? '👑' : ''}
//                       </p>
//                       <p
//                         className="font-script truncate"
//                         style={{ fontSize: '.72rem', fontStyle: 'italic', color: 'var(--warm-gray)' }}
//                       >
//                         {p.tagline}
//                       </p>
//                       <div style={{ background: 'var(--off-white)', height: 3, marginTop: '.3rem', maxWidth: 220 }}>
//                         <div
//                           style={{
//                             height: 3,
//                             width: `${Math.round((p.votes / max) * 100)}%`,
//                             background: 'var(--gold)',
//                           }}
//                         />
//                       </div>
//                     </div>
//                     <span className="badge badge-gray hidden sm:inline-flex">{p.reward}</span>
//                     <span
//                       className="font-display"
//                       style={{
//                         fontSize: '1.05rem',
//                         fontWeight: 800,
//                         color: 'var(--gold)',
//                         minWidth: 50,
//                         textAlign: 'right',
//                       }}
//                     >
//                       {p.votes.toLocaleString()}
//                     </span>
//                     <div className="flex gap-1">
//                       <button className="btn-icon" title="Crown as winner" onClick={() => crownWinner(c.id, p.id)}>
//                         {ICONS.crown}
//                       </button>
//                       <button
//                         className="btn-icon"
//                         title="Edit"
//                         onClick={() => openEditContestant(c.id, p.id)}
//                       >
//                         {ICONS.edit}
//                       </button>
//                       <button
//                         className="btn-icon danger"
//                         title="Remove"
//                         onClick={() =>
//                           openConfirm(
//                             'Remove contestant?',
//                             `"${p.name}" will be removed from ${c.name}.`,
//                             () => deleteContestant(c.id, p.id)
//                           )
//                         }
//                       >
//                         {ICONS.trash}
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>

//               <div className="flex gap-2">
//                 <button
//                   className="btn-outline-admin"
//                   style={{ fontSize: '.66rem' }}
//                   onClick={() => openAddContestant(c.id)}
//                 >
//                   + Add Contestant
//                 </button>
//                 <button
//                   className="btn-danger-admin"
//                   style={{ fontSize: '.62rem' }}
//                   onClick={() =>
//                     openConfirm(
//                       'Reset votes?',
//                       `All vote counts in ${c.name} will be set to zero.`,
//                       () => resetCategoryVotes(c.id)
//                     )
//                   }
//                 >
//                   Reset Category Votes
//                 </button>
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       {/* Contestant Modal */}
//       <div className={`modal-admin ${contModal ? 'active' : ''}`}>
//         <div className="modal-backdrop-admin" onClick={() => setContModal(null)} />
//         <div className="modal-box-admin" style={{ maxWidth: 480 }}>
//           <button
//             className="modal-close"
//             onClick={() => setContModal(null)}
//             style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
//           >
//             &times;
//           </button>
//           <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
//             <p className="section-eyebrow mb-1">{contModal?.contId ? 'Edit Entry' : 'New Entry'}</p>
//             <h2 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
//               {contModal?.contId ? 'Edit Contestant' : 'Add Contestant'}
//             </h2>
//           </div>
//           <form onSubmit={saveContestant} className="space-y-3" style={{ padding: '1.2rem 1.4rem' }}>
//             <div>
//               <label className="field-label-admin">Name</label>
//               <input
//                 className="form-input-admin"
//                 required
//                 value={contForm.name}
//                 onChange={(e) => setContForm({ ...contForm, name: e.target.value })}
//               />
//             </div>
//             <div>
//               <label className="field-label-admin">Tagline</label>
//               <input
//                 className="form-input-admin"
//                 value={contForm.tagline}
//                 onChange={(e) => setContForm({ ...contForm, tagline: e.target.value })}
//               />
//             </div>

//             {/* ▶ STORAGE UPLOAD replaces URL input */}
//             <ImageUploadField
//               label="Contestant Photo"
//               value={contForm.image}
//               onChange={(url) => setContForm({ ...contForm, image: url })}
//               folder="contestants"
//               previewHeight={100}
//             />

//             <div className="grid grid-cols-2 gap-3">
//               <div>
//                 <label className="field-label-admin">Reward Badge</label>
//                 <input
//                   className="form-input-admin"
//                   value={contForm.reward}
//                   onChange={(e) => setContForm({ ...contForm, reward: e.target.value })}
//                 />
//               </div>
//               <div>
//                 <label className="field-label-admin">Votes</label>
//                 <input
//                   type="number"
//                   min={0}
//                   className="form-input-admin"
//                   value={contForm.votes}
//                   onChange={(e) => setContForm({ ...contForm, votes: Number(e.target.value) })}
//                 />
//               </div>
//             </div>
//             <div className="flex gap-2 justify-end" style={{ marginTop: '.6rem' }}>
//               <button type="button" className="btn-outline-admin" onClick={() => setContModal(null)}>
//                 Cancel
//               </button>
//               <button type="submit" className="btn-gold-admin">
//                 Save Contestant
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }

// ─────────────────────────────────────────────
// GALLERY TAB
// ─────────────────────────────────────────────
function GalleryTab() {
  const { gallery, addGalleryImage, moveGalleryImage, deleteGalleryImage, openConfirm } = useAdminData();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ image: '', caption: '', credit: '' });

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.image) return;
    addGalleryImage({
      image: form.image,
      caption: form.caption || 'Untitled',
      credit: form.credit || 'P&S Studio',
    });
    setForm({ image: '', caption: '', credit: '' });
    setModalOpen(false);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">Visual Storytelling</p>
          <h1 className="page-title">Cogvana Gallery</h1>
        </div>
        <button className="btn-gold-admin" onClick={() => setModalOpen(true)}>
          + Add Image
        </button>
      </div>

      <div className="gal-masonry">
        {gallery.map((g) => (
          <div className="gal-item" key={g.id}>
            <img src={g.image} />
            <div className="gal-cap">
              <p style={{ fontSize: '.78rem', fontWeight: 700 }}>{g.caption}</p>
              <p style={{ fontSize: '.65rem', opacity: 0.75 }}>{g.credit}</p>
            </div>
            <div className="flex gap-1" style={{ position: 'absolute', top: '.4rem', right: '.4rem' }}>
              <button
                className="btn-icon"
                style={{ background: 'rgba(255,255,255,.9)' }}
                title="Move up"
                onClick={() => moveGalleryImage(g.id, -1)}
              >
                {ICONS.up}
              </button>
              <button
                className="btn-icon"
                style={{ background: 'rgba(255,255,255,.9)' }}
                title="Move down"
                onClick={() => moveGalleryImage(g.id, 1)}
              >
                {ICONS.down}
              </button>
              <button
                className="btn-icon danger"
                style={{ background: 'rgba(255,255,255,.9)' }}
                title="Delete"
                onClick={() =>
                  openConfirm(
                    'Remove this image?',
                    'It will be removed from the public gallery.',
                    () => deleteGalleryImage(g.id)
                  )
                }
              >
                {ICONS.trash}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Gallery Modal */}
      <div className={`modal-admin ${modalOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setModalOpen(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 460 }}>
          <button
            className="modal-close"
            onClick={() => setModalOpen(false)}
            style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
          >
            &times;
          </button>
          <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
            <h2 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              Add Gallery Image
            </h2>
          </div>
          <form onSubmit={save} className="space-y-3" style={{ padding: '1.2rem 1.4rem' }}>
            {/* ▶ STORAGE UPLOAD replaces URL input */}
            <ImageUploadField
              label="Image"
              value={form.image}
              onChange={(url) => setForm({ ...form, image: url })}
              folder="gallery"
              previewHeight={160}
            />

            <div>
              <label className="field-label-admin">Caption</label>
              <input
                className="form-input-admin"
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label-admin">Photographer Credit</label>
              <input
                className="form-input-admin"
                placeholder="by Cogvana Visuals"
                value={form.credit}
                onChange={(e) => setForm({ ...form, credit: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end" style={{ marginTop: '.6rem' }}>
              <button type="button" className="btn-outline-admin" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-gold-admin" disabled={!form.image}>
                Add Image
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SHOP TAB
// ─────────────────────────────────────────────
function ShopTab() {
  const { products, addProduct, updateProduct, deleteProduct, openConfirm } = useAdminData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', image: '', price: 0, stock: 0, category: '' });

  function openAdd() {
    setEditingId(null);
    setForm({ name: '', image: '', price: 0, stock: 0, category: '' });
    setModalOpen(true);
  }
  function openEdit(p: (typeof products)[number]) {
    setEditingId(p.id);
    setForm({ name: p.name, image: p.image, price: p.price, stock: p.stock, category: p.category });
    setModalOpen(true);
  }
  function save(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      category: form.category || 'General',
    };
    if (editingId) updateProduct(editingId, payload);
    else addProduct(payload);
    setModalOpen(false);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">P&amp;S Merchandise</p>
          <h1 className="page-title">Shop Products</h1>
        </div>
        <button className="btn-gold-admin" onClick={openAdd}>
          + Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p) => (
          <div className="data-card" key={p.id}>
            <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
              {p.image ? (
                <img src={p.image} className="thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--off-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: '.68rem', color: 'var(--warm-gray)' }}>No image</span>
                </div>
              )}
              {p.stock === 0 ? (
                <span className="badge badge-danger" style={{ position: 'absolute', top: '.5rem', right: '.5rem' }}>
                  Out of Stock
                </span>
              ) : p.stock <= 8 ? (
                <span className="badge badge-warn" style={{ position: 'absolute', top: '.5rem', right: '.5rem' }}>
                  Low Stock
                </span>
              ) : null}
            </div>
            <div className="p-3">
              <p className="badge badge-gray mb-1.5">{p.category}</p>
              <p style={{ fontSize: '.84rem', fontWeight: 700, lineHeight: 1.25 }}>{p.name}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="font-display" style={{ fontWeight: 800, color: 'var(--gold)' }}>
                  KES {p.price.toLocaleString()}
                </span>
                <span style={{ fontSize: '.68rem', color: 'var(--warm-gray)' }}>{p.stock} in stock</span>
              </div>
              <div className="flex gap-1.5 mt-3">
                <button className="btn-icon" title="Edit" onClick={() => openEdit(p)}>
                  {ICONS.edit}
                </button>
                <button
                  className="btn-icon danger"
                  title="Delete"
                  onClick={() =>
                    openConfirm(
                      'Delete this product?',
                      `"${p.name}" will be removed from the shop.`,
                      () => deleteProduct(p.id)
                    )
                  }
                >
                  {ICONS.trash}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Modal */}
      <div className={`modal-admin ${modalOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setModalOpen(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 480 }}>
          <button
            className="modal-close"
            onClick={() => setModalOpen(false)}
            style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}
          >
            &times;
          </button>
          <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
            <p className="section-eyebrow mb-1">{editingId ? 'Edit Entry' : 'New Entry'}</p>
            <h2 className="font-display" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
              {editingId ? 'Edit Product' : 'Add Product'}
            </h2>
          </div>
          <form onSubmit={save} className="space-y-3" style={{ padding: '1.2rem 1.4rem' }}>
            <div>
              <label className="field-label-admin">Product Name</label>
              <input
                className="form-input-admin"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* ▶ STORAGE UPLOAD replaces URL input */}
            <ImageUploadField
              label="Product Image"
              value={form.image}
              onChange={(url) => setForm({ ...form, image: url })}
              folder="products"
              previewHeight={120}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label-admin">Price (KES)</label>
                <input
                  type="number"
                  min={0}
                  className="form-input-admin"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="field-label-admin">Stock</label>
                <input
                  type="number"
                  min={0}
                  className="form-input-admin"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="field-label-admin">Category</label>
              <input
                className="form-input-admin"
                placeholder="Prints, Apparel, Accessories…"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end" style={{ marginTop: '.6rem' }}>
              <button type="button" className="btn-outline-admin" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-gold-admin">
                Save Product
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT EXPORT
// ─────────────────────────────────────────────
export default function ContentSection() {
  const [tab, setTab] = useState<Tab>('stories');

  return (
    <div className="dash-section">
      <div className="flex gap-1 overflow-x-auto mb-5" style={{ borderBottom: '1px solid var(--line)' }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      {tab === 'stories' && <StoriesTab />}
      {tab === 'voting' && <VotingTab />}
      {tab === 'gallery' && <GalleryTab />}
      {tab === 'shop' && <ShopTab />}
    </div>
  );
}