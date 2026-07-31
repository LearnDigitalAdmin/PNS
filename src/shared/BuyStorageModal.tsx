import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

const purchaseStorageFn = httpsCallable<
  { accountType: 'photographer' | 'reader'; gigabytes: number; phone: string },
  { purchaseId: string; reference: string; amount: number }
>(functions, 'purchaseStorage');

// ⚠️ Must match KES_PER_GB in functions/src/storage-purchases.ts — shown
// here only for display before the charge is created; the actual amount
// charged is always computed server-side. See ADJUSTMENTS.md.
const KES_PER_GB = 150;
const OPTIONS = [1, 5, 10];

export default function BuyStorageModal({
  accountType,
  defaultPhone,
  onClose,
}: {
  accountType: 'photographer' | 'reader';
  defaultPhone: string;
  onClose: () => void;
}) {
  const [gigabytes, setGigabytes] = useState(1);
  const [phone, setPhone] = useState(defaultPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    setError(null);
    if (!phone.trim()) {
      setError('Enter the M-Pesa number to pay from.');
      return;
    }
    setBusy(true);
    try {
      await purchaseStorageFn({ accountType, gigabytes, phone: phone.trim() });
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? 'Could not start payment. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div className="bg-white rounded-lg p-5 space-y-3" style={{ width: '92%', maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div className="text-center space-y-2 py-2">
            <p className="text-sm font-medium">Check your phone</p>
            <p className="text-xs text-gray-500">
              Approve the M-Pesa prompt to complete the purchase. Your storage limit updates automatically once payment is confirmed.
            </p>
            <button onClick={onClose} className="text-xs border rounded px-4 py-1.5 mt-2">
              Close
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">Buy more storage</p>
            <div className="flex gap-2">
              {OPTIONS.map((gb) => (
                <button
                  key={gb}
                  onClick={() => setGigabytes(gb)}
                  className={`flex-1 border rounded py-2 text-sm ${gigabytes === gb ? 'bg-black text-white border-black' : 'text-gray-700'}`}
                >
                  {gb} GB
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">KSh {(gigabytes * KES_PER_GB).toLocaleString()} via M-Pesa</p>
            <input
              placeholder="+2547XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 border rounded text-sm py-2">
                Cancel
              </button>
              <button onClick={submit} disabled={busy} className="flex-1 bg-black text-white rounded text-sm py-2 disabled:opacity-50">
                {busy ? 'Sending…' : 'Pay'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
