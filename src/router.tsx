import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SiteProvider } from './site/context/SiteContext';
import { ReaderAuthProvider } from './readers/context/ReaderAuthContext';
import SiteApp from './site/SiteApp';
import AdminApp from './admin/AdminApp';
import OverviewSection from './admin/OverviewSection';
import ContentSection from './admin/ContentSection';
import BusinessSection from './admin/BusinessSection';
import SystemSection from './admin/SystemSection';
import PhotographersSection from './admin/PhotographersSection';
import AdminBookingsSection from './admin/BookingsSection';
import ReportsSection from './admin/ReportsSection';
import PartnersApp from './partners/PartnersApp';
import PartnersOverviewSection from './partners/dashboard/OverviewSection';
import PartnersProfileSection from './partners/dashboard/ProfileSection';
import PartnersGallerySection from './partners/dashboard/GallerySection';
import PartnersSessionsSection from './partners/dashboard/SessionsSection';
import PartnersSessionDetail from './partners/dashboard/SessionDetail';
import PartnersBookingsSection from './partners/dashboard/BookingsSection';
import PartnersSettingsSection from './partners/dashboard/SettingsSection';
import ReadersApp from './readers/ReadersApp';
import ReaderOverviewSection from './readers/dashboard/OverviewSection';
import ReaderPhotoInboxSection from './readers/dashboard/PhotoInboxSection';
import ReaderBookingsSection from './readers/dashboard/BookingsSection';
import ReaderVotesSection from './readers/dashboard/VotesSection';
import ReaderSettingsSection from './readers/dashboard/SettingsSection';

function Site() {
  // ReaderAuthProvider sits above SiteProvider because SiteContext (voting)
  // needs useReaderAuth() to gate castVote on a signed-in reader. Every
  // other public page is unaffected — it just rides along.
  return (
    <ReaderAuthProvider>
      <SiteProvider>
        <SiteApp />
      </SiteProvider>
    </ReaderAuthProvider>
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
      { path: 'photographers', element: <PhotographersSection /> },
      { path: 'bookings', element: <AdminBookingsSection /> },
      { path: 'reports', element: <ReportsSection /> },
    ],
  },
  {
    // Photographer marketplace: PartnersApp/PartnersGate decides Login vs
    // CompleteProfile vs Shell, exactly like AdminApp/AdminGate does for
    // /admin. These children only ever mount once the gate reaches
    // PhotographerShell (which owns the <Outlet/> they render into).
    path: '/partners',
    element: <PartnersApp />,
    children: [
      { index: true, element: <Navigate to="overview" replace /> },
      { path: 'overview', element: <PartnersOverviewSection /> },
      { path: 'profile', element: <PartnersProfileSection /> },
      { path: 'gallery', element: <PartnersGallerySection /> },
      { path: 'sessions', element: <PartnersSessionsSection /> },
      { path: 'sessions/:sessionId', element: <PartnersSessionDetail /> },
      { path: 'bookings', element: <PartnersBookingsSection /> },
      { path: 'settings', element: <PartnersSettingsSection /> },
    ],
  },
  {
    // Reader accounts: same gate pattern as /partners and /admin.
    path: '/account',
    element: <ReadersApp />,
    children: [
      { index: true, element: <Navigate to="overview" replace /> },
      { path: 'overview', element: <ReaderOverviewSection /> },
      { path: 'photos', element: <ReaderPhotoInboxSection /> },
      { path: 'bookings', element: <ReaderBookingsSection /> },
      { path: 'votes', element: <ReaderVotesSection /> },
      { path: 'settings', element: <ReaderSettingsSection /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
