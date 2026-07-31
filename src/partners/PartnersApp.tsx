import { PhotographerAuthProvider, usePhotographerAuth } from './context/PhotographerAuthContext';
import PhotographerLogin from './onboarding/PhotographerLogin';
import CompleteProfile from './onboarding/CompleteProfile';
import PhotographerShell from './dashboard/PhotographerShell';

// Mirrors AdminApp/AdminGate exactly: this component decides which of
// Login / CompleteProfile / Shell to render. PhotographerShell owns the
// <Outlet/> for the dashboard tab routes, same as AdminShell does for
// /admin/* — so those routes only ever mount once the gate reaches Shell.
function PartnersGate() {
  const { currentUser, authLoading, needsProfileCompletion } = usePhotographerAuth();

  if (authLoading) return null;
  if (!currentUser) return <PhotographerLogin />;
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
