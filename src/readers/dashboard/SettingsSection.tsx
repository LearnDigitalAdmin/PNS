import { useReaderAuth } from '../context/ReaderAuthContext';

export default function SettingsSection() {
  const { profile, currentUser } = useReaderAuth();
  return (
    <div className="p-6 max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="border rounded-lg p-4 space-y-2 text-sm">
        <p><span className="text-gray-500">Name:</span> {profile?.displayName}</p>
        <p><span className="text-gray-500">Phone:</span> {profile?.phone}</p>
        {currentUser?.email && <p><span className="text-gray-500">Email:</span> {currentUser.email}</p>}
      </div>
      <p className="text-xs text-gray-400">
        Your phone number is what photographers match your delivered photos against — keep it
        up to date if it changes.
      </p>
    </div>
  );
}
