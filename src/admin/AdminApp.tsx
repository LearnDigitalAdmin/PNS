import { AdminDataProvider } from './context/AdminDataContext';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import AdminLogin from './AdminLogin';
import AdminShell from './AdminShell';

function AdminGate() {
  const { isAuthenticated } = useAdminAuth();
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
