import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RecaptchaVerifier,
  linkWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { usePhotographerAuth } from '../context/PhotographerAuthContext';
import {
  PHOTOGRAPHER_CATEGORIES,
  type PhotographerCategory,
  type PhotographerService,
} from '../types';

const PHONE_RECAPTCHA_ID = 'profile-phone-recaptcha';

type Phase = 'phone-entry' | 'phone-otp' | 'details';

export default function CompleteProfile({ onComplete }: { onComplete?: () => void }) {
  const { currentUser, profile } = usePhotographerAuth();
  const navigate = useNavigate();

  // Only Google sign-ins land here without a phone number already on file.
  const needsPhoneStep = useMemo(() => !profile?.phone, [profile?.phone]);
  const [phase, setPhase] = useState<Phase>(needsPhoneStep ? 'phone-entry' : 'details');

  // ---- phone verification state ----
  const [phoneInput, setPhoneInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneBusy, setPhoneBusy] = useState(false);

  const sendOtp = async () => {
    setPhoneError(null);
    if (!/^\+\d{9,15}$/.test(phoneInput.trim())) {
      setPhoneError('Enter your number in international format, e.g. +2547XXXXXXXX.');
      return;
    }
    setPhoneBusy(true);
    try {
      const verifier = new RecaptchaVerifier(auth, PHONE_RECAPTCHA_ID, { size: 'invisible' });
      const result = await linkWithPhoneNumber(currentUser!, phoneInput.trim(), verifier);
      setConfirmation(result);
      setPhase('phone-otp');
    } catch (err: any) {
      setPhoneError(
        err.code === 'auth/credential-already-in-use'
          ? 'That number is already linked to another account.'
          : err.message ?? 'Could not send the code. Please try again.'
      );
    } finally {
      setPhoneBusy(false);
    }
  };

  const confirmOtp = async () => {
    setPhoneError(null);
    if (!confirmation) return;
    setPhoneBusy(true);
    try {
      await confirmation.confirm(otpInput.trim());
      await updateDoc(doc(db, 'photographers', currentUser!.uid), {
        phone: phoneInput.trim(),
      });
      setPhase('details');
    } catch (err: any) {
      setPhoneError(
        err.code === 'auth/invalid-verification-code'
          ? 'That code is incorrect. Please try again.'
          : err.message ?? 'Verification failed. Please try again.'
      );
    } finally {
      setPhoneBusy(false);
    }
  };

  // ---- business details state ----
  const [businessName, setBusinessName] = useState(profile?.businessName ?? '');
  const [ownerName, setOwnerName] = useState(profile?.ownerName ?? '');
  const [county, setCounty] = useState(profile?.county ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [categories, setCategories] = useState<PhotographerCategory[]>(profile?.categories ?? []);
  const [services, setServices] = useState<PhotographerService[]>(
    profile?.services?.length ? profile.services : [{ name: '', description: '', priceFrom: 0 }]
  );
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsBusy, setDetailsBusy] = useState(false);

  const toggleCategory = (cat: PhotographerCategory) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const updateService = (idx: number, patch: Partial<PhotographerService>) => {
    setServices((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addService = () =>
    setServices((prev) => [...prev, { name: '', description: '', priceFrom: 0 }]);

  const removeService = (idx: number) =>
    setServices((prev) => prev.filter((_, i) => i !== idx));

  const submitDetails = async () => {
    setDetailsError(null);
    if (!businessName.trim() || !ownerName.trim() || !county.trim()) {
      setDetailsError('Business name, your name, and location are required.');
      return;
    }
    if (categories.length === 0) {
      setDetailsError('Pick at least one category so people can find you.');
      return;
    }
    const cleanServices = services
      .filter((s) => s.name.trim())
      .map((s) => ({ ...s, priceFrom: Number(s.priceFrom) || 0 }));

    setDetailsBusy(true);
    try {
      await updateDoc(doc(db, 'photographers', currentUser!.uid), {
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        county: county.trim(),
        bio: bio.trim(),
        categories,
        services: cleanServices,
        profileComplete: true,
      });
      onComplete?.();
      navigate('/partners/overview', { replace: true });
    } catch (err: any) {
      setDetailsError(err.message ?? 'Could not save your profile. Please try again.');
    } finally {
      setDetailsBusy(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (phase === 'phone-entry') {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4">
        <h2 className="text-xl font-semibold">Verify your phone number</h2>
        <p className="text-sm text-gray-600">
          We need a verified number on file for booking payouts and client delivery matching.
        </p>
        <input
          type="tel"
          placeholder="+2547XXXXXXXX"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
        <button
          onClick={sendOtp}
          disabled={phoneBusy}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
        >
          {phoneBusy ? 'Sending…' : 'Send code'}
        </button>
        <div id={PHONE_RECAPTCHA_ID} />
      </div>
    );
  }

  if (phase === 'phone-otp') {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4">
        <h2 className="text-xl font-semibold">Enter the code</h2>
        <p className="text-sm text-gray-600">Sent to {phoneInput}.</p>
        <input
          type="text"
          inputMode="numeric"
          placeholder="6-digit code"
          value={otpInput}
          onChange={(e) => setOtpInput(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
        <button
          onClick={confirmOtp}
          disabled={phoneBusy}
          className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
        >
          {phoneBusy ? 'Verifying…' : 'Confirm'}
        </button>
        <button onClick={() => setPhase('phone-entry')} className="w-full text-sm text-gray-500">
          Use a different number
        </button>
      </div>
    );
  }

  // phase === 'details'
  return (
    <div className="max-w-lg mx-auto p-6 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Set up your profile</h2>
        <p className="text-sm text-gray-600">This is what readers and clients will see.</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Business name</label>
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Your name</label>
        <input
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Location / county</label>
        <input
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full border rounded px-3 py-2"
        />
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
                categories.includes(cat)
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Services (optional but recommended)</label>
        {services.map((s, idx) => (
          <div key={idx} className="border rounded p-3 space-y-2">
            <input
              placeholder="Service name, e.g. Wedding Package"
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
                <button
                  type="button"
                  onClick={() => removeService(idx)}
                  className="ml-auto text-xs text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={addService} className="text-sm text-blue-600">
          + Add another service
        </button>
      </div>

      {detailsError && <p className="text-sm text-red-600">{detailsError}</p>}

      <button
        onClick={submitDetails}
        disabled={detailsBusy}
        className="w-full bg-black text-white rounded py-2 disabled:opacity-50"
      >
        {detailsBusy ? 'Saving…' : 'Finish setup'}
      </button>
    </div>
  );
}
