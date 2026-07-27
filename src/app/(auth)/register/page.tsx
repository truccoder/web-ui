'use client';

import { RegisterForm } from '@/features/security';

export default function RegisterPage() {
  // Registration returns void and sends a verification email — the user signs in
  // separately, so no post-auth redirect here.
  return <RegisterForm />;
}
