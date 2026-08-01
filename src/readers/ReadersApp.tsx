import { Link } from 'react-router-dom';
import { ReaderAuthProvider, useReaderAuth } from './context/ReaderAuthContext';
import ReaderLogin from './onboarding/ReaderLogin';
import CompleteReaderProfile from './onboarding/CompleteReaderProfile';
import ReaderShell from './dashboard/ReaderShell';

// Shown when this Firebase Auth uid is signed in but has no reader profile
// document at all. In normal use that only happens for a photographer
// account visiting /account via the shared Firebase Auth session (see
// ReaderAuthContext's cross-account guard) — a brand-new reader always gets
// their doc provisioned as part of signInWithGoogle/confirmPhoneCode before
// they ever reach this gate.
function WrongPortal() {
  const { logout } = useReaderAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="px-5">
      <div className="w-full max-w-sm space-y-4 text-center">
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 900 }}>P&amp;S</p>
        <p className="text-sm text-gray-700">
          This account is signed in as a photographer, not a reader — there's no reader profile to show here.
        </p>
        <Link to="/partners" className="inline-block bg-black text-white rounded px-4 py-2 text-sm">
          Go to photographer portal
        </Link>
        <button onClick={() => logout()} className="block w-full text-sm text-gray-500 mt-2">
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
}

// Mirrors PartnersApp/AdminApp exactly. ReaderShell owns the <Outlet/> for
// the dashboard tab routes.
function ReaderGate() {
  const { currentUser, authLoading, profileLoading, profile, needsProfileCompletion } = useReaderAuth();

  if (authLoading) return null;
  if (!currentUser) return <ReaderLogin />;
  if (profileLoading) return null;
  if (!profile) return <WrongPortal />;
  if (needsProfileCompletion) return <CompleteReaderProfile />;
  return <ReaderShell />;
}

export default function ReadersApp() {
  return (
    <ReaderAuthProvider>
      <ReaderGate />
    </ReaderAuthProvider>
  );
}
