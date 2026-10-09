import { redirect } from 'next/navigation';

/** The proxy normally routes "/" to the right home; this is the fallback. */
export default function Home() {
  redirect('/login');
}
