import { AuthForm } from '@/components/AuthForm';
import { AuthLayout } from '@/components/AuthLayout';

export const metadata = { title: 'Log in — Kosh' };

export default function LoginPage() {
  return (
    <AuthLayout title="Log in" intro="Borrowers and Kosh staff use the same login.">
      <AuthForm mode="login" />
    </AuthLayout>
  );
}
