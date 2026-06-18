import { AdminDataProvider } from './context/AdminDataContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLogin from './AdminLogin';
import AdminShell from './AdminShell';

function AdminGate() {
  const { isAuthenticated, authLoading } = useAdminAuth();

  // While Firebase resolves the persisted session, render nothing (login
  // screen handles its own loading spinner via authLoading prop).
  if (authLoading) return <AdminLogin />;

  return isAuthenticated ? <AdminShell /> : <AdminLogin />;
}

export default function AdminApp() {
  return (
    <AdminDataProvider>
      <AdminAuthProvider>
        <AdminGate />
      </AdminAuthProvider>
    </AdminDataProvider>
  );
}