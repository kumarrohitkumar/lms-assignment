'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/components/SessionProvider';
import { LoadingBlock } from '@/components/ui';
import { homePathFor } from '@/lib/rbac';

/** The proxy normally redirects /dashboard; this covers client-side navigation. */
export default function DashboardIndex() {
  const { user } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (user) router.replace(homePathFor(user.role));
  }, [user, router]);
  return <LoadingBlock />;
}
