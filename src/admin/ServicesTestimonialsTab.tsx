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
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAdminData } from './context/AdminDataContext';
import { ICONS, EmptyState } from './icons';
import { ImageUploadField } from './ContentSection';
import type { ServiceItem, Testimonial } from './types';

const SUB_TABS = ['services', 'testimonials'] as const;
type SubTab = (typeof SUB_TABS)[number];

function useFsCollection<T>(name: string, orderField = 'order') {
  const [items, setItems] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, name), orderBy(orderField, 'asc'));
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T & { id: string })));
      setLoading(false);
    });
  }, [name, orderField]);
  return { items, loading };
}

// ─── Services ───────────────────────────────────────────────────────────────

function ServicesTab() {
  const { openConfirm, showToast, logActivity } = useAdminData();
  const { items: services, loading } = useFsCollection<Omit<ServiceItem, 'id'>>('services');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ image: '', eyebrow: '', title: '' });

  function openAdd() {
    setEditId(null);
    setForm({ image: '', eyebrow: '', title: '' });
    setModalOpen(true);
  }
  function openEdit(s: ServiceItem & { id: string }) {
    setEditId(s.id);
    setForm({ image: s.image, eyebrow: s.eyebrow, title: s.title });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      await updateDoc(doc(db, 'services', editId), { ...form });
      logActivity(`Updated service: ${form.title}`);
      showToast('Service updated', 'success');
    } else {
      const maxOrder = services.reduce((m, s) => Math.max(m, s.order ?? 0), 0);
      await addDoc(collection(db, 'services'), { ...form, order: maxOrder + 1, createdAt: serverTimestamp() });
      logActivity(`Added service: ${form.title}`);
      showToast('Service added', 'success');
    }
    setModalOpen(false);
  }

  async function remove(s: ServiceItem & { id: string }) {
    await deleteDoc(doc(db, 'services', s.id));
    logActivity(`Removed service: ${s.title}`);
    showToast('Service removed', 'danger');
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">What We Offer</p>
          <h1 className="page-title">Services</h1>
        </div>
        <button className="btn-gold-admin" onClick={openAdd}>+ Add Service</button>
      </div>

      {loading && <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)' }}>Loading…</p>}
      {!loading && services.length === 0 && <EmptyState message="No services yet." />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((s) => (
          <div className="data-card" key={s.id}>
            <div style={{ height: 110, overflow: 'hidden' }}>
              {s.image ? (
                <img src={s.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'var(--off-white)' }} />
              )}
            </div>
            <div className="p-3">
              <p style={{ fontSize: '.62rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{s.eyebrow}</p>
              <p style={{ fontWeight: 700, fontSize: '.85rem', marginTop: '.2rem' }}>{s.title}</p>
              <div className="flex gap-1.5 mt-2.5">
                <button className="btn-icon" title="Edit" onClick={() => openEdit(s)}>{ICONS.edit}</button>
                <button
                  className="btn-icon danger"
                  title="Delete"
                  onClick={() => openConfirm('Remove this service?', `"${s.title}" will be removed.`, () => remove(s))}
                >
                  {ICONS.trash}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`modal-admin ${modalOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setModalOpen(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 440 }}>
          <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>&times;</button>
          <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
            <h2 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800 }}>{editId ? 'Edit' : 'Add'} Service</h2>
          </div>
          <form onSubmit={save} className="space-y-3" style={{ padding: '1.2rem 1.4rem' }}>
            <ImageUploadField label="Image" value={form.image} onChange={(url) => setForm({ ...form, image: url })} folder="services" previewHeight={110} />
            <div>
              <label className="field-label-admin">Eyebrow Label</label>
              <input className="form-input-admin" placeholder="Photography" required value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} />
            </div>
            <div>
              <label className="field-label-admin">Title</label>
              <input className="form-input-admin" placeholder="Editorial & Portrait" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end" style={{ marginTop: '.6rem' }}>
              <button type="button" className="btn-outline-admin" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-gold-admin">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Testimonials ───────────────────────────────────────────────────────────

function TestimonialsTab() {
  const { openConfirm, showToast, logActivity } = useAdminData();
  const { items: testimonials, loading } = useFsCollection<Omit<Testimonial, 'id'>>('testimonials');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ quote: '', image: '', name: '', role: '' });

  function openAdd() {
    setEditId(null);
    setForm({ quote: '', image: '', name: '', role: '' });
    setModalOpen(true);
  }
  function openEdit(t: Testimonial & { id: string }) {
    setEditId(t.id);
    setForm({ quote: t.quote, image: t.image, name: t.name, role: t.role });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      await updateDoc(doc(db, 'testimonials', editId), { ...form });
      logActivity(`Updated testimonial from ${form.name}`);
      showToast('Testimonial updated', 'success');
    } else {
      const maxOrder = testimonials.reduce((m, t) => Math.max(m, t.order ?? 0), 0);
      await addDoc(collection(db, 'testimonials'), { ...form, order: maxOrder + 1, createdAt: serverTimestamp() });
      logActivity(`Added testimonial from ${form.name}`);
      showToast('Testimonial added', 'success');
    }
    setModalOpen(false);
  }

  async function remove(t: Testimonial & { id: string }) {
    await deleteDoc(doc(db, 'testimonials', t.id));
    logActivity(`Removed testimonial from ${t.name}`);
    showToast('Testimonial removed', 'danger');
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="section-eyebrow mb-1">Social Proof</p>
          <h1 className="page-title">Testimonials</h1>
        </div>
        <button className="btn-gold-admin" onClick={openAdd}>+ Add Testimonial</button>
      </div>

      {loading && <p style={{ fontSize: '.78rem', color: 'var(--warm-gray)' }}>Loading…</p>}
      {!loading && testimonials.length === 0 && <EmptyState message="No testimonials yet." />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {testimonials.map((t) => (
          <div className="data-card p-4" key={t.id}>
            <p style={{ fontSize: '.8rem', fontStyle: 'italic', lineHeight: 1.5 }}>"{t.quote}"</p>
            <div className="flex items-center gap-2.5 mt-3">
              {t.image ? (
                <img src={t.image} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="avatar" style={{ width: 34, height: 34 }}>{t.name?.[0] ?? '?'}</div>
              )}
              <div>
                <p style={{ fontSize: '.76rem', fontWeight: 700 }}>{t.name}</p>
                <p style={{ fontSize: '.64rem', color: 'var(--warm-gray)' }}>{t.role}</p>
              </div>
            </div>
            <div className="flex gap-1.5 mt-3">
              <button className="btn-icon" title="Edit" onClick={() => openEdit(t)}>{ICONS.edit}</button>
              <button
                className="btn-icon danger"
                title="Delete"
                onClick={() => openConfirm('Remove this testimonial?', `From ${t.name}.`, () => remove(t))}
              >
                {ICONS.trash}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={`modal-admin ${modalOpen ? 'active' : ''}`}>
        <div className="modal-backdrop-admin" onClick={() => setModalOpen(false)} />
        <div className="modal-box-admin" style={{ maxWidth: 460 }}>
          <button onClick={() => setModalOpen(false)} style={{ position: 'absolute', top: '.7rem', right: '.7rem', fontSize: '1.3rem', background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>&times;</button>
          <div style={{ padding: '1.2rem 1.4rem .9rem', borderBottom: '1px solid var(--line)' }}>
            <h2 className="font-display" style={{ fontSize: '1.15rem', fontWeight: 800 }}>{editId ? 'Edit' : 'Add'} Testimonial</h2>
          </div>
          <form onSubmit={save} className="space-y-3" style={{ padding: '1.2rem 1.4rem' }}>
            <div>
              <label className="field-label-admin">Quote</label>
              <textarea className="form-input-admin" rows={3} required value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} />
            </div>
            <ImageUploadField label="Photo" value={form.image} onChange={(url) => setForm({ ...form, image: url })} folder="testimonials" previewHeight={90} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label-admin">Name</label>
                <input className="form-input-admin" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="field-label-admin">Role</label>
                <input className="form-input-admin" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 justify-end" style={{ marginTop: '.6rem' }}>
              <button type="button" className="btn-outline-admin" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-gold-admin">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────

export default function ServicesTestimonialsTab() {
  const [sub, setSub] = useState<SubTab>('services');
  return (
    <div>
      <div className="flex gap-1 overflow-x-auto mb-5" style={{ borderBottom: '1px solid var(--line)' }}>
        {SUB_TABS.map((s) => (
          <button key={s} className={`tab-btn ${sub === s ? 'active' : ''}`} onClick={() => setSub(s)}>
            {s === 'services' ? 'Services' : 'Testimonials'}
          </button>
        ))}
      </div>
      {sub === 'services' && <ServicesTab />}
      {sub === 'testimonials' && <TestimonialsTab />}
    </div>
  );
}