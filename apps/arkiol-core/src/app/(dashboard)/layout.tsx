// src/app/(dashboard)/layout.tsx
// Dashboard shell — redirects unauthenticated users to login.
// When auth or DB is not configured the dashboard renders without a session check
// so the app remains accessible for local development and partial deployments.
// Server Component (Node.js runtime): may use detectCapabilities().
import { redirect }           from 'next/navigation';
import { detectCapabilities } from '@arkiol/shared';
import { SidebarLayout }      from '../../components/dashboard/SidebarLayout';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Guard only when both auth and DB are available — uses centralized capability system.
  if (detectCapabilities().auth && detectCapabilities().database) {
    try {
      const { getServerSession } = require('next-auth');
      const { authOptions }      = require('../../lib/auth');
      const session = await getServerSession(authOptions).catch(() => null);
      if (!session?.user) redirect('/login');
    } catch {
      redirect('/login');
    }
  }

  return <SidebarLayout>{children}</SidebarLayout>;
}
