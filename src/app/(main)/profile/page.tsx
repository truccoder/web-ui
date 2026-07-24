'use client';

import { ChangePasswordForm, ProfileIdentityCard, ProfileInfoForm } from '@/features/security';
import { useT } from '@/lib/i18n';

export default function ProfilePage() {
  const t = useT();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-nx-title font-semibold tracking-tight text-nx-text-primary">
          {t('profile.title')}
        </h1>
        <p className="mt-1 text-nx-body-sm text-nx-text-muted">{t('profile.subtitle')}</p>
      </div>

      <ProfileIdentityCard />
      <ProfileInfoForm />
      <ChangePasswordForm />
    </div>
  );
}
