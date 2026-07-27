'use client';

import { useState } from 'react';
import { Calendar, ChevronDown, Globe, Lock, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EventDateTimeFields } from './event-datetime-picker';
import { EventLocationInput } from './event-location-input';
import { LocationPicker, useCreatePost } from '@/features/posts';
import type { EventDetails, LocationResolution, PostVisibility } from '@/features/posts';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/lib/i18n';

/**
 * TEMPORARY BRIDGE — this file exists only until P2.4″d (cycle 3, `EventController`).
 *
 * It is what is left of the legacy `create-post-form.tsx` after P2.4d replaced that composer
 * with `features/posts`' `PostComposer`. The new composer covers seven of the eight post kinds;
 * `EVENT` is cycle 3's work, so deleting the legacy form wholesale would have removed the only
 * way in the app to create an event post. Rather than ship that regression, the legacy form was
 * cut down to its `EVENT` branch and kept mounted beneath the new composer. Two stacked
 * composers on `/newsfeed` is deliberately ugly: the ugliness is the reminder to finish cycle 3,
 * and it disappears the moment `PostComposer` grows an `EVENT` entry.
 *
 * WHAT WAS CUT, and why none of it is a loss:
 * - `REGULAR` and `BOOK` modes, the kind switcher, the character counter and the (never wired)
 *   photo button — all superseded by `PostComposer`.
 * - the legacy `PdfPreview` — cut for good at P2.4c-4, see the ledger's posts notes.
 * - the avatar header, which only existed to decorate the composer and pulled in `useProfile`.
 *
 * WHAT IS DELIBERATELY NEW HERE: the data path. This form calls `features/posts`' `useCreatePost`
 * and renders `features/posts`' `LocationPicker` instead of their legacy twins, which is what
 * allowed the legacy `useCreatePost`/`useCreateBookPost`/`toCreatePostRequest` and the legacy
 * location picker to be deleted in the same checkpoint. Only the *fields* below are still legacy
 * (`EventDateTimeFields`, `EventLocationInput`, shadcn `Input`/`Button`/`Card`); do not rebuild
 * them against `shared/components` here — that is cycle 3's job, and doing it now would smuggle
 * a whole UI checkpoint into a wiring one.
 *
 * `onPosted` mirrors `PostComposer`'s: posts is write-only and its read side lives in another
 * domain, so the host page refreshes the feed rather than this component knowing the feed's
 * cache layout (CLAUDE.md §4).
 */
export interface CreateEventFormProps {
  /** Called after a successful create, for the host page to refresh its feed. */
  onPosted?: () => void;
}

const VISIBILITY_ICONS: Record<PostVisibility, typeof Globe> = {
  PUBLIC: Globe,
  FRIENDS: Users,
  PRIVATE: Lock,
};

const EMPTY_EVENT: EventDetails = {
  eventTitle: '',
  eventDescription: '',
  startTime: '',
  endTime: '',
  location: '',
  onlineUrl: '',
};

export function CreateEventForm({ onPosted }: CreateEventFormProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [location, setLocation] = useState<LocationResolution | undefined>();
  const [event, setEvent] = useState<EventDetails>(EMPTY_EVENT);
  const [justPosted, setJustPosted] = useState(false);

  const reset = () => {
    setOpen(false);
    setContent('');
    setVisibility('PUBLIC');
    setLocation(undefined);
    setEvent(EMPTY_EVENT);
    setJustPosted(true);
    onPosted?.();
  };

  const create = useCreatePost({ onSuccess: reset });

  const update = (patch: Partial<EventDetails>) =>
    setEvent((current) => ({ ...current, ...patch }));

  // `PostService.validateEventDetails` is one of only two kinds the backend really validates, so
  // unlike most gates in `PostComposer` these do mirror server rules: a title, both timestamps,
  // and an end after the start.
  const canSubmit =
    !create.isPending &&
    Boolean(event.eventTitle?.trim()) &&
    Boolean(event.startTime) &&
    Boolean(event.endTime) &&
    new Date(event.endTime!) > new Date(event.startTime!);

  const submit = () => {
    if (!canSubmit) return;
    setJustPosted(false);

    create.mutate({
      content: content.trim(),
      visibility,
      postType: 'EVENT',
      eventDetails: {
        ...event,
        // The pickers hand back local datetime strings; the backend parses ISO-8601.
        startTime: new Date(event.startTime!).toISOString(),
        endTime: new Date(event.endTime!).toISOString(),
      },
      // Spread the resolved candidate's own fields — `CreatePostRequestDto` has no flat
      // `location` key, it wants these three (see the ledger's posts notes).
      ...(location && {
        googlePlaceId: location.googlePlaceId,
        locationType: location.locationType,
        locationDetails: location.locationDetails,
      }),
    });
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant={open ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setOpen((current) => !current)}
            className="gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5" />
            {t('createPost.event.button')}
          </Button>
          <span className="text-xs text-muted-foreground">{t('createPost.event.bridgeNote')}</span>
        </div>

        {open && (
          <div className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('createPost.event.contentPlaceholder')}
              rows={2}
              className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none leading-relaxed"
            />

            <div className="rounded-lg border p-3 space-y-2.5 bg-accent/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('createPost.event.button')}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label={t('createPost.event.cancel')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <Input
                placeholder={t('createPost.event.title')}
                value={event.eventTitle ?? ''}
                onChange={(e) => update({ eventTitle: e.target.value })}
              />
              <Input
                placeholder={t('createPost.event.description')}
                value={event.eventDescription ?? ''}
                onChange={(e) => update({ eventDescription: e.target.value })}
              />

              <EventDateTimeFields
                startTime={event.startTime ?? ''}
                endTime={event.endTime ?? ''}
                onChange={({ startTime, endTime }) => update({ startTime, endTime })}
              />

              <EventLocationInput
                value={event.location ?? ''}
                onChange={(value) => update({ location: value })}
              />
              <Input
                placeholder={t('createPost.event.onlineUrl')}
                value={event.onlineUrl ?? ''}
                onChange={(e) => update({ onlineUrl: e.target.value })}
              />
              <Input
                type="number"
                min={1}
                placeholder={t('createPost.event.maxAttendees')}
                value={event.maxAttendees ?? ''}
                onChange={(e) =>
                  update({ maxAttendees: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>

            {create.error && (
              <p role="alert" className="text-xs text-destructive">
                {getErrorMessage(create.error)}
              </p>
            )}

            <div className="border-t pt-2.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <VisibilityPicker value={visibility} onChange={setVisibility} />
                <LocationPicker value={location} onChange={setLocation} />
              </div>
              <Button
                size="sm"
                disabled={!canSubmit}
                onClick={submit}
                className="rounded-full px-5"
              >
                {create.isPending ? t('createPost.posting') : t('createPost.post')}
              </Button>
            </div>
          </div>
        )}

        {/* Same hedge as `PostComposer`: a new post is saved as `PENDING_MODERATION`, so it may
            not show up in the feed at all. */}
        {justPosted && !create.isPending && (
          <p className="text-xs text-muted-foreground">{t('createPost.submittedPendingReview')}</p>
        )}
      </CardContent>
    </Card>
  );
}

function VisibilityPicker({
  value,
  onChange,
}: {
  value: PostVisibility;
  onChange: (value: PostVisibility) => void;
}) {
  const t = useT();
  const options: PostVisibility[] = ['PUBLIC', 'FRIENDS', 'PRIVATE'];
  const Icon = VISIBILITY_ICONS[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-full px-2 py-1 hover:bg-accent outline-none">
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t(`createPost.visibility.${value}`)}</span>
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((option) => {
          const OptionIcon = VISIBILITY_ICONS[option];
          return (
            <DropdownMenuItem key={option} onClick={() => onChange(option)}>
              <OptionIcon className="h-3.5 w-3.5" />
              {t(`createPost.visibility.${option}`)}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
