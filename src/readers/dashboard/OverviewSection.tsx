import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useReaderAuth } from '../context/ReaderAuthContext';
import StorageGauge from './StorageGauge';
import BuyStorageModal from '../../shared/BuyStorageModal';

const STREAK_BADGES = [3, 7, 30];
const REFERRAL_BADGES = [1, 5, 10];

function CopyLinkRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };
  return (
    <div className="flex items-center gap-2">
      <input readOnly value={url} className="flex-1 border rounded px-2 py-1.5 text-xs text-gray-600" />
      <button onClick={copy} className="text-xs bg-black text-white rounded px-3 py-1.5">
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

export default function OverviewSection() {
  const { currentUser, profile } = useReaderAuth();
  const [showBuyStorage, setShowBuyStorage] = useState(false);
  if (!profile || !currentUser) return null;

  const referralUrl = `${window.location.origin}/?ref=${currentUser.uid}`;
  const earnedStreakBadges = STREAK_BADGES.filter((n) => profile.voteStreak >= n);
  const earnedReferralBadges = REFERRAL_BADGES.filter((n) => profile.referralCount >= n);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Hey, {profile.displayName || 'there'}</h1>

      <div className="border rounded-lg p-4">
        <p className="text-sm font-medium mb-3">Photo storage</p>
        <StorageGauge
          usedBytes={profile.storageUsedBytes}
          capBytes={profile.storageCapBytes}
          onUpgradeClick={() => setShowBuyStorage(true)}
        />
        <Link to="../photos" className="text-sm text-blue-600 inline-block mt-3">
          Open My Photos →
        </Link>
      </div>
      {showBuyStorage && (
        <BuyStorageModal accountType="reader" defaultPhone={profile.phone} onClose={() => setShowBuyStorage(false)} />
      )}

      <div className="border rounded-lg p-4">
        <p className="text-sm font-medium mb-1">Voting streak</p>
        <p className="text-2xl font-semibold">
          {profile.voteStreak} {profile.voteStreak === 1 ? 'day' : 'days'}
        </p>
        <p className="text-xs text-gray-500 mb-2">Vote once a day to keep it going.</p>
        {earnedStreakBadges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {earnedStreakBadges.map((n) => (
              <span key={n} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1">
                🔥 {n}-day streak
              </span>
            ))}
          </div>
        )}
        <Link to="../votes" className="text-sm text-blue-600 inline-block mt-2">
          See My Votes →
        </Link>
      </div>

      <div className="border rounded-lg p-4">
        <p className="text-sm font-medium mb-1">Bookings</p>
        <Link to="../bookings" className="text-sm text-blue-600">
          View my bookings →
        </Link>
      </div>

      <div className="border rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium">Invite friends</p>
        <p className="text-xs text-gray-500">
          {profile.referralCount} {profile.referralCount === 1 ? 'person has' : 'people have'} joined through your link.
        </p>
        <CopyLinkRow url={referralUrl} />
        {earnedReferralBadges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap pt-1">
            {earnedReferralBadges.map((n) => (
              <span key={n} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1">
                ✦ Invited {n}+
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
