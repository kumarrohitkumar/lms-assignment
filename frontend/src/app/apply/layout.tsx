import { AppHeader } from '@/components/AppHeader';
import { SessionProvider } from '@/components/SessionProvider';

export const metadata = { title: 'Apply — Kosh' };

export default function ApplyLayout({ children }: LayoutProps<'/apply'>) {
  return (
    <SessionProvider>
      <AppHeader subtitle="Personal loans" homeHref="/apply" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </SessionProvider>
  );
}
