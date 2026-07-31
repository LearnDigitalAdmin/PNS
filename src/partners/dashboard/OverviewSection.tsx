import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePhotographerAuth } from '../context/PhotographerAuthContext';
import StorageGauge from './StorageGauge';
import BuyStorageModal from '../../shared/BuyStorageModal';

export default function OverviewSection() {
  const { profile } = usePhotographerAuth();
  const [showBuyStorage, setShowBuyStorage] = useState(false);
  if (!profile) return null;

  const checklist = [
    { label: 'Business details', done: !!profile.businessName && !!profile.bio },
    { label: 'At least one category selected', done: profile.categories.length > 0 },
    { label: 'At least one service listed', done: profile.services.length > 0 },
  ];
  const completeCount = checklist.filter((c) => c.done).length;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Welcome back, {profile.businessName || profile.ownerName}</h1>
        <p className="text-sm text-gray-600 mt-1">
          Status:{' '}
          <span className={profile.status === 'active' ? 'text-green-600' : 'text-red-600'}>
            {profile.status === 'active' ? 'Live on the directory' : 'Suspended'}
          </span>
          {profile.verified && <span className="ml-2 text-blue-600">✓ Verified</span>}
        </p>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <p className="text-sm font-medium">Profile completeness ({completeCount}/{checklist.length})</p>
        {checklist.map((c) => (
          <div key={c.label} className="flex items-center gap-2 text-sm">
            <span className={c.done ? 'text-green-600' : 'text-gray-300'}>●</span>
            <span className={c.done ? 'text-gray-800' : 'text-gray-500'}>{c.label}</span>
          </div>
        ))}
        {completeCount < checklist.length && (
          <Link to="../profile" className="text-sm text-blue-600 inline-block mt-1">
            Finish your profile →
          </Link>
        )}
      </div>

      <div className="border rounded-lg p-4">
        <p className="text-sm font-medium mb-3">Storage</p>
        <StorageGauge
          usedBytes={profile.storageUsedBytes}
          capBytes={profile.storageCapBytes}
          onUpgradeClick={() => setShowBuyStorage(true)}
        />
      </div>
      {showBuyStorage && (
        <BuyStorageModal accountType="photographer" defaultPhone={profile.phone} onClose={() => setShowBuyStorage(false)} />
      )}

      <div className="border rounded-lg p-4">
        <p className="text-sm font-medium mb-1">Bookings</p>
        <Link to="../bookings" className="text-sm text-blue-600">
          View booking requests →
        </Link>
      </div>
    </div>
  );
}
