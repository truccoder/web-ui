'use client';

import { Check, Loader2, Star, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import { useEventAttendees } from '@/lib/hooks/use-events';
import { useFriends } from '@/lib/hooks/use-friendship';
import { useProfile } from '@/lib/hooks/use-user';
import { getNeutralAvatarColor } from '@/lib/avatar-color';
import type { EventRsvp, RsvpStatus } from '@/lib/types';

const STATUS_ORDER: { status: RsvpStatus; icon: React.ElementType; labelKey: string }[] = [
  { status: 'GOING', icon: Check, labelKey: 'post.event.rsvp.going' },
  { status: 'INTERESTED', icon: Star, labelKey: 'post.event.rsvp.interested' },
  { status: 'NOT_GOING', icon: X, labelKey: 'post.event.rsvp.notGoing' },
];

interface EventAttendeesDialogProps {
  postId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventAttendeesDialog({ postId, open, onOpenChange }: EventAttendeesDialogProps) {
  const t = useT();
  const { data: attendees, isLoading, isError } = useEventAttendees(postId, open);
  // The backend only returns userIds — resolve display names from the viewer's own
  // network (friends + self); anyone else falls back to a generic "User #id" label.
  const { data: friendsData } = useFriends();
  const { data: profile } = useProfile();

  const nameById = new Map<number, { fullname: string; profilePictureUrl?: string }>();
  friendsData?.friends.forEach((f) => {
    nameById.set(Number(f.id), { fullname: f.fullname, profilePictureUrl: f.profilePictureUrl });
  });
  if (profile?.userId != null) {
    nameById.set(profile.userId, {
      fullname: profile.fullname,
      profilePictureUrl: profile.profilePictureUrl,
    });
  }

  const byStatus = new Map<RsvpStatus, EventRsvp[]>();
  attendees?.forEach((a) => {
    const list = byStatus.get(a.status) ?? [];
    list.push(a);
    byStatus.set(a.status, list);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('post.event.attendeesTitle')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {isError && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('post.event.attendeesError')}
            </p>
          )}

          {!isLoading && !isError && (attendees?.length ?? 0) === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('post.event.attendeesEmpty')}
            </p>
          )}

          {STATUS_ORDER.map(({ status, icon: Icon, labelKey }) => {
            const list = byStatus.get(status);
            if (!list || list.length === 0) return null;
            return (
              <div key={status}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground">{t(labelKey)}</span>
                  <Badge variant="secondary">{list.length}</Badge>
                </div>
                <div className="space-y-2">
                  {list.map((a) => {
                    const user = nameById.get(a.userId);
                    const name = user?.fullname ?? t('post.event.unknownUser', { id: a.userId });
                    return (
                      <div key={a.id} className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={user?.profilePictureUrl} />
                          <AvatarFallback
                            className={`${getNeutralAvatarColor(String(a.userId))} text-white text-[10px] font-medium`}
                          >
                            {name
                              .split(' ')
                              .filter(Boolean)
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm truncate">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
