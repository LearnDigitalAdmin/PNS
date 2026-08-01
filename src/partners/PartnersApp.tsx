import { Link } from 'react-router-dom';
import { PhotographerAuthProvider, usePhotographerAuth } from './context/PhotographerAuthContext';
import PhotographerLogin from './onboarding/PhotographerLogin';
import CompleteProfile from './onboarding/CompleteProfile';
import PhotographerShell from './dashboard/PhotographerShell';

// Shown when this Firebase Auth uid is signed in but has no photographer
// profile document at all. In normal use that only happens for a reader
// account visiting /partners via the shared Firebase Auth session (see
// PhotographerAuthContext's cross-account guard).
function WrongPortal() {
  const { logout } = usePhotographerAuth();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="px-5">
      <div className="w-full max-w-sm space-y-4 text-center">
        <p style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.4rem', fontWeight: 900 }}>P&amp;S</p>
        <p className="text-sm text-gray-700">
          This account is signed in as a reader, not a photographer — there's no photographer profile to show here.
        </p>
        <Link to="/account" className="inline-block bg-black text-white rounded px-4 py-2 text-sm">
          Go to My Account
        </Link>
        <button onClick={() => logout()} className="block w-full text-sm text-gray-500 mt-2">
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
}

// Mirrors AdminApp/AdminGate exactly: this component decides which of
// Login / CompleteProfile / Shell to render. PhotographerShell owns the
// <Outlet/> for the dashboard tab routes, same as AdminShell does for
// /admin/* — so those routes only ever mount once the gate reaches Shell.
function PartnersGate() {
  const { currentUser, authLoading, profileLoading, profile, needsProfileCompletion } = usePhotographerAuth();

  if (authLoading) return null;
  if (!currentUser) return <PhotographerLogin />;
  if (profileLoading) return null;
  if (!profile) return <WrongPortal />;
  if (needsProfileCompletion) return <CompleteProfile />;
  return <PhotographerShell />;
}

export default function PartnersApp() {
  return (
    <PhotographerAuthProvider>
      <PartnersGate />
    </PhotographerAuthProvider>
  );
}
