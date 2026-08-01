import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { usePhotographerAuth } from '../context/PhotographerAuthContext';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../lib/firebase';
import type { PaymentPolicy } from '../types';

const createSubaccountFn = httpsCallable<
  { businessName: string; bankCode: string; accountNumber: string },
  { subaccountCode: string }
>(functions, 'createPhotographerSubaccount');

function PayoutSetup() {
  const { profile } = usePhotographerAuth();
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!profile) return null;

  if (profile.payoutSetupComplete) {
    return (
      <div className="border rounded-lg p-4 space-y-1">
        <p className="text-sm font-medium">Payouts</p>
        <p className="text-sm text-green-600">✓ Payout account connected</p>
        <p className="text-xs text-gray-500">Account ending {profile.payoutAccountNumber?.slice(-4)}</p>
      </div>
    );
  }

  const save = async () => {
    setError(null);
    if (!bankCode.trim() || !accountNumber.trim()) {
      setError('Bank code and account number are required.');
      return;
    }
    setSaving(true);
    try {
      await createSubaccountFn({
        businessName: profile.businessName,
        bankCode: bankCode.trim(),
        accountNumber: accountNumber.trim(),
      });
      setDone(true);
    } catch (err: any) {
      setError(err.message ?? 'Could not set up payouts. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div>
        <p className="text-sm font-medium">Payouts</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Required before you can accept paid bookings. When a client pays by M-Pesa, our platform fee is
          deducted automatically and the rest settles straight to this account — find your bank's Paystack
          settlement bank code in your Paystack dashboard.
        </p>
      </div>
      <input
        placeholder="Bank code (from Paystack)"
        value={bankCode}
        onChange={(e) => setBankCode(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
      />
      <input
        placeholder="Account number"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {done && <p className="text-xs text-green-600">Payout account connected.</p>}
      <button onClick={save} disabled={saving} className="bg-black text-white text-sm rounded px-4 py-2 disabled:opacity-50">
        {saving ? 'Saving…' : 'Connect payout account'}
      </button>
    </div>
  );
}

function PaymentPolicySetting() {
  const { currentUser, profile } = usePhotographerAuth();
  const [saving, setSaving] = useState(false);
  if (!currentUser || !profile) return null;

  const current: PaymentPolicy = profile.paymentPolicy ?? 'pay_on_booking';

  const choose = async (policy: PaymentPolicy) => {
    if (policy === 'pay_later' || policy === current || saving) return; // pay_later disabled for now
    setSaving(true);
    try {
      await updateDoc(doc(db, 'photographers', currentUser.uid), { paymentPolicy: policy });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div>
        <p className="text-sm font-medium">Payment collection</p>
        <p className="text-xs text-gray-500 mt-0.5">
          How clients pay for a booking once you accept it. Prices are fixed per service in your Profile — clients
          always know the exact amount before they book.
        </p>
      </div>

      <button
        type="button"
        onClick={() => choose('pay_on_booking')}
        className={`w-full text-left border rounded-lg p-3 ${current === 'pay_on_booking' ? 'border-black bg-gray-50' : 'border-gray-200'}`}
      >
        <p className="text-sm font-medium flex items-center gap-2">
          Pay on booking (M-Pesa)
          {current === 'pay_on_booking' && <span className="text-xs text-green-600">✓ Active</span>}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Once you accept a request, the client is prompted to pay the fixed service price by M-Pesa before the
          booking is confirmed.
        </p>
      </button>

      <div className="w-full text-left border rounded-lg p-3 border-gray-200 opacity-50 cursor-not-allowed">
        <p className="text-sm font-medium flex items-center gap-2">
          Pay later
          <span className="text-xs bg-gray-200 text-gray-600 rounded px-1.5 py-0.5">Coming soon</span>
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Accept a booking without collecting payment upfront and settle with the client directly. Not available yet.
        </p>
      </div>
    </div>
  );
}

export default function SettingsSection() {
  const { currentUser, profile, logout } = usePhotographerAuth();
  const navigate = useNavigate();

  if (!profile || !currentUser) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/partners');
  };

  return (
    <div className="p-6 max-w-lg space-y-5">
      <h1 className="text-xl font-semibold">Settings</h1>

      <div className="border rounded-lg p-4 space-y-2 text-sm">
        <p>
          <span className="text-gray-500">Signed in via:</span> {profile.authProvider === 'google' ? 'Google' : 'Phone'}
        </p>
        {profile.email && (
          <p>
            <span className="text-gray-500">Email:</span> {profile.email}
          </p>
        )}
        <p>
          <span className="text-gray-500">Phone:</span> {profile.phone}
        </p>
        <p>
          <span className="text-gray-500">Account status:</span>{' '}
          <span className={profile.status === 'active' ? 'text-green-600' : 'text-red-600'}>{profile.status}</span>
        </p>
      </div>

      <PaymentPolicySetting />
      <PayoutSetup />

      {profile.status === 'suspended' && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-700">
          Your profile is currently suspended and not visible on the public directory. Contact P&amp;S support if you
          believe this is a mistake.
        </div>
      )}

      <button onClick={handleLogout} className="text-sm text-red-600 border border-red-200 rounded px-4 py-2">
        Sign out
      </button>
    </div>
  );
}
