import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSiteSettings } from '@/lib/site-settings';

function isMaintenanceExempt(pathname: string): boolean {
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/wellwisher') ||
    pathname === '/maintenance' ||
    pathname.startsWith('/_next')
  );
}

/**
 * Server-side gate so maintenance mode works even when Edge middleware
 * cannot reach the settings API (common on Vercel / www vs apex).
 */
export default async function MaintenanceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const pathname =
    headerStore.get('x-pathname') ||
    headerStore.get('x-invoke-path') ||
    headerStore.get('next-url') ||
    '';

  if (!pathname) {
    return children;
  }

  if (isMaintenanceExempt(pathname)) {
    return children;
  }

  const settings = await getSiteSettings();
  if (settings.maintenanceMode) {
    redirect('/maintenance');
  }

  return children;
}
