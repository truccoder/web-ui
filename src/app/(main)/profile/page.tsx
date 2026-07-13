'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Loader2 } from 'lucide-react';
import {
  useProfile,
  useUpdateProfile,
  useUploadProfilePicture,
  useChangePassword,
} from '@/lib/hooks/use-user';
import { updateProfileSchema, type UpdateProfileFormData } from '@/lib/schemas/user';
import { changePasswordSchema, type ChangePasswordFormData } from '@/lib/schemas/user';
import { useT } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { getNeutralAvatarColor } from '@/lib/avatar-color';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationPreferences } from '@/components/notifications/notification-preferences';

function ProfilePictureUpload({ liveFullname }: { liveFullname?: string }) {
  const { data: profile } = useProfile();
  const { mutate: uploadPicture, isPending } = useUploadProfilePicture();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const t = useT();

  const initials = (liveFullname || profile?.fullname)
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const avatarColor = getNeutralAvatarColor(profile?.id ?? liveFullname ?? 'default');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;

    setPreview(URL.createObjectURL(file));
    uploadPicture(file, {
      onSettled: () => {
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  const displayUrl = preview ?? profile?.profilePictureUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative group">
        <Avatar className="h-28 w-28">
          {displayUrl ? <AvatarImage src={displayUrl} /> : null}
          <AvatarFallback className={`${avatarColor} text-white text-3xl`}>
            {initials ?? '?'}
          </AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t('profile.uploadHint')}</p>
    </div>
  );
}

function ProfileInfoTab({ onFullnameChange }: { onFullnameChange: (value: string) => void }) {
  const { data: profile } = useProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const t = useT();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    values: { fullname: profile?.fullname ?? '' },
  });

  const onSubmit = (data: UpdateProfileFormData) => {
    updateProfile(data);
  };

  const fullname = useWatch({ control, name: 'fullname' });
  useEffect(() => {
    onFullnameChange(fullname ?? '');
  }, [fullname, onFullnameChange]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullname">{t('profile.info.fullname')}</Label>
        <Input id="fullname" {...register('fullname')} />
        {errors.fullname && <p className="text-sm text-destructive">{errors.fullname.message}</p>}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? t('profile.info.saving') : t('profile.info.save')}
      </Button>
    </form>
  );
}

function ChangePasswordTab() {
  const { mutate: changePassword, isPending } = useChangePassword();
  const t = useT();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = (data: ChangePasswordFormData) => {
    changePassword(
      { currentPassword: data.currentPassword, newPassword: data.newPassword },
      { onSuccess: () => reset() }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t('profile.password.currentPassword')}</Label>
        <Input
          id="currentPassword"
          type="password"
          placeholder={t('profile.password.currentPlaceholder')}
          {...register('currentPassword')}
        />
        {errors.currentPassword && (
          <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">{t('profile.password.newPassword')}</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder={t('profile.password.newPlaceholder')}
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p className="text-sm text-destructive">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t('profile.password.confirm')}</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder={t('profile.password.confirmPlaceholder')}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? t('profile.password.updating') : t('profile.password.update')}
      </Button>
    </form>
  );
}

export default function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const [liveFullname, setLiveFullname] = useState('');
  const t = useT();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('profile.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('profile.subtitle')}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ProfilePictureUpload liveFullname={liveFullname} />
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold">{liveFullname || profile?.fullname || '—'}</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {t('profile.id', { id: profile?.userId ?? '' })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">{t('profile.tabs.info')}</TabsTrigger>
          <TabsTrigger value="password">{t('profile.tabs.password')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('profile.tabs.notifications')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.info.title')}</CardTitle>
              <CardDescription>{t('profile.info.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileInfoTab onFullnameChange={setLiveFullname} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.password.title')}</CardTitle>
              <CardDescription>{t('profile.password.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t('notifications.prefs.title')}</CardTitle>
              <CardDescription>{t('notifications.prefs.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferences />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
