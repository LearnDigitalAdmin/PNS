import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { REPORT_REASONS, type Report } from '../../partners/types';

export default function ReportModal({
  targetType,
  targetId,
  photographerId,
  onClose,
}: {
  targetType: Report['targetType'];
  targetId: string;
  photographerId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        targetType,
        targetId,
        photographerId,
        reporterUserId: null, // reader accounts land in Phase 2; anonymous for now
        reason: note.trim() ? `${reason}: ${note.trim()}` : reason,
        status: 'open',
        createdAt: serverTimestamp(),
      });
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 100 }} className="flex items-center justify-center px-5" onClick={onClose}>
      <div className="bg-white rounded-lg p-5 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <p className="text-sm font-medium">Thanks — we'll take a look.</p>
            <button onClick={onClose} className="text-sm text-gray-500">
              Close
            </button>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Report this {targetType === 'photographer' ? 'profile' : 'photo'}</p>
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Additional detail (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="text-sm text-gray-500 px-3 py-1.5">
                Cancel
              </button>
              <button onClick={submit} disabled={submitting} className="text-sm bg-black text-white rounded px-3 py-1.5 disabled:opacity-50">
                {submitting ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
