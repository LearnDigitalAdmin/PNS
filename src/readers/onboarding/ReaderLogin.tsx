import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReaderAuth } from '../context/ReaderAuthContext';

const PHONE_RECAPTCHA_ID = 'reader-phone-recaptcha-container';

export default function ReaderLogin() {
  const { signInWithGoogle, requestPhoneCode, confirmPhoneCode, step, authError, crossAccountConflict } = useReaderAuth();
  const [mode, setMode] = useState<'choose' | 'phone-entry' | 'phone-otp'>('choose');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const busy = step === 'loading';

  return (
    <div
      style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      className="px-5"
    >
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.6rem', fontWeight: 900 }}>P&amp;S</p>
          <p style={{ fontSize: '.62rem', letterSpacing: '.22em', color: 'var(--gold)', textTransform: 'uppercase' }}>
            My Account
          </p>
        </div>

        {mode === 'choose' && (
          <div className="space-y-3">
            <button onClick={signInWithGoogle} disabled={busy} className="w-full border rounded py-2.5 disabled:opacity-50">
              Continue with Google
            </button>
            <button
              onClick={() => setMode('phone-entry')}
              disabled={busy}
              className="w-full bg-black text-white rounded py-2.5 disabled:opacity-50"
            >
              Continue with phone number
            </button>
            <p className="text-center text-xs text-gray-500">
              Vote in the Voting Arena, and receive photos delivered by your photographer.
            </p>
          </div>
        )}

        {mode === 'phone-entry' && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Phone number</label>
            <input
              type="tel"
              placeholder="+2547XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            <button
              onClick={async () => {
                await requestPhoneCode(phone.trim(), PHONE_RECAPTCHA_ID);
                setMode('phone-otp');
              }}
              disabled={busy || !phone.trim()}
              className="w-full bg-black text-white rounded py-2.5 disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send code'}
            </button>
            <button onClick={() => setMode('choose')} className="w-full text-sm text-gray-500">
              Back
            </button>
          </div>
        )}

        {mode === 'phone-otp' && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Enter the code sent to {phone}</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
            <button
              onClick={() => confirmPhoneCode(otp.trim())}
              disabled={busy || otp.trim().length < 4}
              className="w-full bg-black text-white rounded py-2.5 disabled:opacity-50"
            >
              {busy ? 'Verifying…' : 'Confirm'}
            </button>
            <button onClick={() => setMode('phone-entry')} className="w-full text-sm text-gray-500">
              Use a different number
            </button>
          </div>
        )}

        {authError && (
          <p className="text-sm text-red-600 text-center">
            {authError}
            {crossAccountConflict && (
              <>
                {' '}
                <Link to="/partners" className="underline">Go to photographer portal →</Link>
              </>
            )}
          </p>
        )}

        <p className="text-center text-xs text-gray-500">
          <Link to="/" style={{ color: 'rgba(201,168,76,.75)' }}>← Back to P&amp;S Magazine</Link>
        </p>
      </div>
    </div>
  );
}
