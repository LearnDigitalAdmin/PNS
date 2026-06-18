import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SiteProvider } from './site/context/SiteContext';
import SiteApp from './site/SiteApp';
import AdminApp from './admin/AdminApp';
import OverviewSection from './admin/OverviewSection';
import ContentSection from './admin/ContentSection';
import BusinessSection from './admin/BusinessSection';
import SystemSection from './admin/SystemSection';

function Site() {
  return (
    <SiteProvider>
      <SiteApp />
    </SiteProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Site />,
  },
  {
    path: '/admin',
    element: <AdminApp />,
    children: [
      { index: true, element: <Navigate to="overview" replace /> },
      { path: 'overview', element: <OverviewSection /> },
      { path: 'content', element: <ContentSection /> },
      { path: 'business', element: <BusinessSection /> },
      { path: 'system', element: <SystemSection /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
