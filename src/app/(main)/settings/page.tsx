import { redirect } from 'next/navigation';

/** `/settings` is the hub's shell; land on the first panel. */
export default function SettingsPage() {
  redirect('/settings/notifications');
}
