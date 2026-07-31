import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { useReaderAuth } from '../context/ReaderAuthContext';
import type { ReaderDelivery } from '../types';
import StorageGauge from './StorageGauge';
import BuyStorageModal from '../../shared/BuyStorageModal';

function DeliveryCard({ delivery }: { delivery: ReaderDelivery }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDownloadURL(ref(storage, delivery.storageUrl))
      .then((u) => !cancelled && setUrl(u))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [delivery.storageUrl]);

  const isPdf = delivery.contentType === 'pdf';

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="aspect-square bg-gray-100 flex items-center justify-center">
        {!url ? (
          <span className="text-xs text-gray-400">Loading…</span>
        ) : isPdf ? (
          <div className="flex flex-col items-center gap-1 text-gray-500">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
            <span className="text-[.6rem]">PDF</span>
          </div>
        ) : (
          <img src={url} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="p-2 space-y-1">
        <p className="text-xs font-medium truncate">{delivery.sessionLabel || (isPdf ? 'Delivered file' : 'Delivered photo')}</p>
        <p className="text-[.65rem] text-gray-500 truncate">from {delivery.photographerBusinessName}</p>
        {url && (
          <a href={url} download className="text-xs text-blue-600 inline-block mt-1">
            {isPdf ? 'Download PDF' : 'Download'}
          </a>
        )}
      </div>
    </div>
  );
}

export default function PhotoInboxSection() {
  const { currentUser, profile } = useReaderAuth();
  const [deliveries, setDeliveries] = useState<ReaderDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuyStorage, setShowBuyStorage] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'readers', currentUser.uid, 'deliveries'),
      orderBy('deliveredAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setDeliveries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReaderDelivery)));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold">My Photos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Photos and files your photographer delivers here automatically once they match them to
          your phone number. This inbox is download-only — you can't upload anything here.
        </p>
      </div>

      {profile && (
        <div className="border rounded-lg p-4 max-w-sm">
          <StorageGauge
            usedBytes={profile.storageUsedBytes}
            capBytes={profile.storageCapBytes}
            onUpgradeClick={() => setShowBuyStorage(true)}
          />
        </div>
      )}
      {showBuyStorage && profile && (
        <BuyStorageModal accountType="reader" defaultPhone={profile.phone} onClose={() => setShowBuyStorage(false)} />
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : deliveries.length === 0 ? (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">
            Nothing here yet. Once a photographer delivers photos from your shoot, they'll show up
            in this inbox.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {deliveries.map((d) => (
            <DeliveryCard key={d.id} delivery={d} />
          ))}
        </div>
      )}
    </div>
  );
}
