import { ReaderAuthProvider, useReaderAuth } from './context/ReaderAuthContext';
import ReaderLogin from './onboarding/ReaderLogin';
import CompleteReaderProfile from './onboarding/CompleteReaderProfile';
import ReaderShell from './dashboard/ReaderShell';

// Mirrors PartnersApp/AdminApp exactly. ReaderShell owns the <Outlet/> for
// the dashboard tab routes.
function ReaderGate() {
  const { currentUser, authLoading, needsProfileCompletion } = useReaderAuth();

  if (authLoading) return null;
  if (!currentUser) return <ReaderLogin />;
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
