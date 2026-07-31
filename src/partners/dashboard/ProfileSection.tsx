import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { usePhotographerAuth } from '../context/PhotographerAuthContext';
import { PHOTOGRAPHER_CATEGORIES, type PhotographerCategory, type PhotographerService } from '../types';

export default function ProfileSection() {
  const { currentUser, profile } = usePhotographerAuth();
  if (!profile || !currentUser) return null;

  const [businessName, setBusinessName] = useState(profile.businessName);
  const [ownerName, setOwnerName] = useState(profile.ownerName);
  const [county, setCounty] = useState(profile.county);
  const [bio, setBio] = useState(profile.bio);
  const [categories, setCategories] = useState<PhotographerCategory[]>(profile.categories);
  const [services, setServices] = useState<PhotographerService[]>(
    profile.services.length ? profile.services : [{ name: '', description: '', priceFrom: 0 }]
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (cat: PhotographerCategory) =>
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));

  const updateService = (idx: number, patch: Partial<PhotographerService>) =>
    setServices((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));

  const addService = () => setServices((prev) => [...prev, { name: '', description: '', priceFrom: 0 }]);
  const removeService = (idx: number) => setServices((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setError(null);
    setSaved(false);
    if (!businessName.trim() || !ownerName.trim() || !county.trim()) {
      setError('Business name, your name, and location are required.');
      return;
    }
    if (categories.length === 0) {
      setError('Pick at least one category.');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'photographers', currentUser.uid), {
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        county: county.trim(),
        bio: bio.trim(),
        categories,
        services: services.filter((s) => s.name.trim()).map((s) => ({ ...s, priceFrom: Number(s.priceFrom) || 0 })),
      });
      setSaved(true);
    } catch (err: any) {
      setError(err.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <h1 className="text-xl font-semibold">Profile</h1>

      <div className="space-y-1">
        <label className="text-sm font-medium">Business name</label>
        <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Your name</label>
        <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Location / county</label>
        <input value={county} onChange={(e) => setCounty(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full border rounded px-3 py-2" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Categories</label>
        <div className="flex flex-wrap gap-2">
          {PHOTOGRAPHER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1 rounded-full text-sm border ${
                categories.includes(cat) ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Services</label>
        {services.map((s, idx) => (
          <div key={idx} className="border rounded p-3 space-y-2">
            <input
              placeholder="Service name"
              value={s.name}
              onChange={(e) => updateService(idx, { name: e.target.value })}
              className="w-full border rounded px-2 py-1 text-sm"
            />
            <input
              placeholder="Short description"
              value={s.description}
              onChange={(e) => updateService(idx, { description: e.target.value })}
              className="w-full border rounded px-2 py-1 text-sm"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Priced from KSh</span>
              <input
                type="number"
                value={s.priceFrom}
                onChange={(e) => updateService(idx, { priceFrom: Number(e.target.value) })}
                className="w-28 border rounded px-2 py-1 text-sm"
              />
              {services.length > 1 && (
                <button onClick={() => removeService(idx)} className="ml-auto text-xs text-red-600">
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <button onClick={addService} className="text-sm text-blue-600">
          + Add another service
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-600">Saved.</p>}

      <button onClick={save} disabled={saving} className="bg-black text-white rounded px-5 py-2 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
