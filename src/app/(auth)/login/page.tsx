'use client';

import { LoginForm } from '@/features/security';
import { usePostAuthRedirect } from '../post-auth-redirect';

export default function LoginPage() {
  const redirectAfterAuth = usePostAuthRedirect();
  return <LoginForm onSuccess={redirectAfterAuth} />;
}
