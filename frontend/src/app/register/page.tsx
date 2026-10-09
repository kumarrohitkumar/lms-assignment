import { AuthForm } from '@/components/AuthForm';
import { AuthLayout } from '@/components/AuthLayout';

export const metadata = { title: 'Create account — Kosh' };

export default function RegisterPage() {
  return (
    <AuthLayout title="Create your account" intro="You will need your PAN and a recent salary slip to apply.">
      <AuthForm mode="register" />
    </AuthLayout>
  );
}
