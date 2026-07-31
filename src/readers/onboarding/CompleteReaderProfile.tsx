import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, linkWithPhoneNumber, type ConfirmationResult } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useReaderAuth } from '../context/ReaderAuthContext';

const PHONE_RECAPTCHA_ID = 'reader-complete-phone-recaptcha';

type Phase = 'phone-entry' | 'phone-otp' | 'details';

export default function CompleteReaderProfile() {
  const { currentUser, profile } = useReaderAuth();
  const navigate = useNavigate();

  const needsPhoneStep = useMemo(() => !profile?.phone, [profile?.phone]);
  const [phase, setPhase] = useState<Phase>(needsPhoneStep ? 'phone-entry' : 'details');

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
      await updateDoc(doc(db, 'readers', currentUser!.uid), { phone: phoneInput.trim() });
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

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsBusy, setDetailsBusy] = useState(false);

  const submitDetails = async () => {
    setDetailsError(null);
    if (!displayName.trim()) {
      setDetailsError('Enter your name.');
      return;
    }
    setDetailsBusy(true);
    try {
      await updateDoc(doc(db, 'readers', currentUser!.uid), {
        displayName: displayName.trim(),
        profileComplete: true,
      });
      navigate('/account/overview', { replace: true });
    } catch (err: any) {
      setDetailsError(err.message ?? 'Could not save your profile. Please try again.');
    } finally {
      setDetailsBusy(false);
    }
  };

  if (phase === 'phone-entry') {
    return (
      <div className="max-w-md mx-auto p-6 space-y-4">
        <h2 className="text-xl font-semibold">Verify your phone number</h2>
        <p className="text-sm text-gray-600">
          This is how your photographer's delivered photos find their way to your inbox — make sure
          it's the same number you gave them at your shoot.
        </p>
        <input
          type="tel"
          placeholder="+2547XXXXXXXX"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        {phoneError && <p className="text-sm text-red-600">{phoneError}</p>}
        <button onClick={sendOtp} disabled={phoneBusy} className="w-full bg-black text-white rounded py-2 disabled:opacity-50">
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
        <button onClick={confirmOtp} disabled={phoneBusy} className="w-full bg-black text-white rounded py-2 disabled:opacity-50">
          {phoneBusy ? 'Verifying…' : 'Confirm'}
        </button>
        <button onClick={() => setPhase('phone-entry')} className="w-full text-sm text-gray-500">
          Use a different number
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold">What should we call you?</h2>
      <input
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Your name"
        className="w-full border rounded px-3 py-2"
      />
      {detailsError && <p className="text-sm text-red-600">{detailsError}</p>}
      <button onClick={submitDetails} disabled={detailsBusy} className="w-full bg-black text-white rounded py-2 disabled:opacity-50">
        {detailsBusy ? 'Saving…' : 'Finish'}
      </button>
    </div>
  );
}
