import { AppHeader } from '@/components/AppHeader';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { SessionProvider } from '@/components/SessionProvider';

export const metadata = { title: 'Operations — Kosh' };

export default function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  return (
    <SessionProvider>
      <AppHeader subtitle="Operations" homeHref="/dashboard" />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-10 lg:py-10">
        <DashboardNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </SessionProvider>
  );
}
