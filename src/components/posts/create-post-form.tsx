'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  ImageIcon,
  Globe,
  Users,
  Lock,
  ChevronDown,
  Calendar,
  BookOpen,
  FileText,
  Image as ImageFileIcon,
  X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LocationPicker } from './location-picker';
import { EventDateTimeFields } from './event-datetime-picker';
import { EventLocationInput } from './event-location-input';
import { useCreatePost, useCreateBookPost } from '@/lib/hooks/use-posts';
import { useProfile } from '@/lib/hooks/use-user';
import { useT } from '@/lib/i18n';
import { getNeutralAvatarColor } from '@/lib/avatar-color';
import type { PostLocation, PostVisibility, EventDetails, CreateBookRequest } from '@/lib/types';

// react-pdf touches browser-only APIs (Worker, canvas, DOMMatrix) that don't exist during SSR.
const PdfPreview = dynamic(() => import('./pdf-preview').then((m) => m.PdfPreview), {
  ssr: false,
});

const VISIBILITY_ICONS: Record<PostVisibility, typeof Globe> = {
  PUBLIC: Globe,
  FRIENDS: Users,
  PRIVATE: Lock,
};

type ComposerMode = 'REGULAR' | 'EVENT' | 'BOOK';

const EMPTY_EVENT: EventDetails = {
  eventTitle: '',
  eventDescription: '',
  startTime: '',
  endTime: '',
  location: '',
  onlineUrl: '',
};

const EMPTY_BOOK: CreateBookRequest = {
  title: '',
  description: '',
};

const ALLOWED_BOOK_EXTENSIONS = ['pdf', 'epub'];

function getFileExtension(filename: string): string {
  return filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
}

export function CreatePostForm() {
  const [content, setContent] = useState('');
  const [location, setLocation] = useState<PostLocation | undefined>();
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [focused, setFocused] = useState(false);
  const [mode, setMode] = useState<ComposerMode>('REGULAR');
  const [eventDetails, setEventDetails] = useState<EventDetails>(EMPTY_EVENT);
  const [bookDetails, setBookDetails] = useState<CreateBookRequest>(EMPTY_BOOK);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookFileError, setBookFileError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bookFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useProfile();
  const { mutate: createPost, isPending: isCreatingPost } = useCreatePost();
  const { mutate: createBookPost, isPending: isCreatingBookPost } = useCreateBookPost();
  const isPending = isCreatingPost || isCreatingBookPost;
  const t = useT();

  const initials = profile?.fullname
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const avatarColor = getNeutralAvatarColor(profile?.id ?? 'default');

  const firstName =
    profile?.fullname?.split(' ')[0] ??
    t('createPost.placeholder').replace(' ${name}', '').replace('${name}', '');

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const resetComposer = () => {
    setContent('');
    setLocation(undefined);
    setVisibility('PUBLIC');
    setFocused(false);
    setMode('REGULAR');
    setEventDetails(EMPTY_EVENT);
    setBookDetails(EMPTY_BOOK);
    setBookFile(null);
    setCoverFile(null);
    setBookFileError(null);
    if (bookFileInputRef.current) bookFileInputRef.current.value = '';
    if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const toggleMode = (next: ComposerMode) => {
    setMode((current) => (current === next ? 'REGULAR' : next));
  };

  const handleBookFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !ALLOWED_BOOK_EXTENSIONS.includes(getFileExtension(file.name))) {
      setBookFileError(t('createPost.book.fileInvalidFormat'));
      setBookFile(null);
      return;
    }
    setBookFileError(null);
    setBookFile(file);
  };

  const handleRemoveBookFile = () => {
    setBookFile(null);
    setBookFileError(null);
    if (bookFileInputRef.current) bookFileInputRef.current.value = '';
  };

  const handleRemoveCoverFile = () => {
    setCoverFile(null);
    if (coverFileInputRef.current) coverFileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (mode === 'EVENT') {
      createPost(
        {
          content: content.trim(),
          location,
          visibility,
          postType: 'EVENT',
          eventDetails: {
            ...eventDetails,
            startTime: new Date(eventDetails.startTime).toISOString(),
            endTime: new Date(eventDetails.endTime).toISOString(),
          },
        },
        { onSuccess: resetComposer }
      );
      return;
    }

    if (mode === 'BOOK') {
      if (!bookFile) {
        setBookFileError(t('createPost.book.fileRequired'));
        return;
      }
      createBookPost(
        {
          content: content.trim(),
          location,
          visibility,
          bookDetails,
          bookFile,
          coverFile: coverFile ?? undefined,
        },
        { onSuccess: resetComposer }
      );
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) return;
    createPost({ content: trimmed, location, visibility }, { onSuccess: resetComposer });
  };

  const canSubmit = (() => {
    if (isPending) return false;
    if (mode === 'EVENT') {
      return Boolean(
        eventDetails.eventTitle.trim() &&
        eventDetails.startTime &&
        eventDetails.endTime &&
        new Date(eventDetails.endTime) > new Date(eventDetails.startTime)
      );
    }
    if (mode === 'BOOK') {
      return Boolean(bookDetails.title.trim() && bookFile && !bookFileError);
    }
    return content.trim().length > 0;
  })();

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.profilePictureUrl} />
            <AvatarFallback className={`${avatarColor} text-white text-sm font-medium`}>
              {initials ?? '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaInput}
              onFocus={() => setFocused(true)}
              placeholder={t('createPost.placeholder', { name: firstName })}
              rows={focused ? 3 : 1}
              className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none leading-relaxed"
            />

            {mode === 'EVENT' && (
              <EventFieldsForm
                value={eventDetails}
                onChange={setEventDetails}
                onCancel={() => setMode('REGULAR')}
              />
            )}

            {mode === 'BOOK' && (
              <BookFieldsForm
                value={bookDetails}
                onChange={setBookDetails}
                bookFile={bookFile}
                coverFile={coverFile}
                bookFileError={bookFileError}
                bookFileInputRef={bookFileInputRef}
                coverFileInputRef={coverFileInputRef}
                onBookFileChange={handleBookFileChange}
                onCoverFileChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
                onRemoveBookFile={handleRemoveBookFile}
                onRemoveCoverFile={handleRemoveCoverFile}
                onCancel={() => setMode('REGULAR')}
              />
            )}

            {(focused || content || location || mode !== 'REGULAR') && (
              <>
                <div className="border-t pt-2.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <VisibilityPicker value={visibility} onChange={setVisibility} />
                    <LocationPicker value={location} onChange={setLocation} />
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-full px-2 py-1 hover:bg-accent"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t('createPost.photo')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMode('EVENT')}
                      className={`inline-flex items-center gap-1.5 text-sm transition-colors cursor-pointer rounded-full px-2 py-1 hover:bg-accent ${mode === 'EVENT' ? 'text-primary bg-accent' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t('createPost.event.button')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleMode('BOOK')}
                      className={`inline-flex items-center gap-1.5 text-sm transition-colors cursor-pointer rounded-full px-2 py-1 hover:bg-accent ${mode === 'BOOK' ? 'text-primary bg-accent' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t('createPost.book.button')}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {mode === 'REGULAR' && (
                      <span
                        className={`text-xs tabular-nums ${content.length > 450 ? 'text-orange-500' : 'text-muted-foreground'}`}
                      >
                        {content.length}/500
                      </span>
                    )}
                    <Button
                      size="sm"
                      disabled={!canSubmit}
                      onClick={handleSubmit}
                      className="rounded-full px-5"
                    >
                      {isPending ? t('createPost.posting') : t('createPost.post')}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
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

function EventFieldsForm({
  value,
  onChange,
  onCancel,
}: {
  value: EventDetails;
  onChange: (value: EventDetails) => void;
  onCancel: () => void;
}) {
  const t = useT();

  const update = (patch: Partial<EventDetails>) => onChange({ ...value, ...patch });

  return (
    <div className="rounded-lg border p-3 space-y-2.5 bg-accent/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Calendar className="h-3.5 w-3.5" />
          {t('createPost.event.button')}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label={t('createPost.event.cancel')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <Input
        placeholder={t('createPost.event.title')}
        value={value.eventTitle}
        onChange={(e) => update({ eventTitle: e.target.value })}
      />
      <Input
        placeholder={t('createPost.event.description')}
        value={value.eventDescription ?? ''}
        onChange={(e) => update({ eventDescription: e.target.value })}
      />

      <EventDateTimeFields
        startTime={value.startTime}
        endTime={value.endTime}
        onChange={({ startTime, endTime }) => update({ startTime, endTime })}
      />

      <EventLocationInput
        value={value.location ?? ''}
        onChange={(location) => update({ location })}
      />
      <Input
        placeholder={t('createPost.event.onlineUrl')}
        value={value.onlineUrl ?? ''}
        onChange={(e) => update({ onlineUrl: e.target.value })}
      />
      <Input
        type="number"
        min={1}
        placeholder={t('createPost.event.maxAttendees')}
        value={value.maxAttendees ?? ''}
        onChange={(e) =>
          update({ maxAttendees: e.target.value ? Number(e.target.value) : undefined })
        }
      />
    </div>
  );
}

function BookFieldsForm({
  value,
  onChange,
  bookFile,
  coverFile,
  bookFileError,
  bookFileInputRef,
  coverFileInputRef,
  onBookFileChange,
  onCoverFileChange,
  onRemoveBookFile,
  onRemoveCoverFile,
  onCancel,
}: {
  value: CreateBookRequest;
  onChange: (value: CreateBookRequest) => void;
  bookFile: File | null;
  coverFile: File | null;
  bookFileError: string | null;
  bookFileInputRef: React.RefObject<HTMLInputElement | null>;
  coverFileInputRef: React.RefObject<HTMLInputElement | null>;
  onBookFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCoverFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveBookFile: () => void;
  onRemoveCoverFile: () => void;
  onCancel: () => void;
}) {
  const t = useT();

  const update = (patch: Partial<CreateBookRequest>) => onChange({ ...value, ...patch });

  return (
    <div className="rounded-lg border p-3 space-y-2.5 bg-accent/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <BookOpen className="h-3.5 w-3.5" />
          {t('createPost.book.button')}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label={t('createPost.book.cancel')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <Input
        placeholder={t('createPost.book.title')}
        value={value.title}
        onChange={(e) => update({ title: e.target.value })}
      />
      <Input
        placeholder={t('createPost.book.description')}
        value={value.description ?? ''}
        onChange={(e) => update({ description: e.target.value })}
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          min={0}
          placeholder={t('createPost.book.price')}
          value={value.price ?? ''}
          onChange={(e) => update({ price: e.target.value ? Number(e.target.value) : undefined })}
        />
        <Input
          type="number"
          min={1}
          placeholder={t('createPost.book.previewPages')}
          value={value.previewPages ?? ''}
          onChange={(e) =>
            update({ previewPages: e.target.value ? Number(e.target.value) : undefined })
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('createPost.book.file')}</Label>
        {bookFile ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1.5 min-w-0">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{bookFile.name}</span>
            </span>
            <button
              type="button"
              onClick={onRemoveBookFile}
              className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              aria-label={t('createPost.book.removeFile')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => bookFileInputRef.current?.click()}
          >
            {t('createPost.book.chooseFile')}
          </Button>
        )}
        <input
          ref={bookFileInputRef}
          type="file"
          accept=".pdf,.epub"
          onChange={onBookFileChange}
          className="hidden"
        />
        {bookFileError && <p className="text-xs text-destructive">{bookFileError}</p>}
        {bookFile && !bookFileError && getFileExtension(bookFile.name) === 'pdf' && (
          <PdfPreview file={bookFile} />
        )}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{t('createPost.book.cover')}</Label>
        {coverFile ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1.5 min-w-0">
              <ImageFileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{coverFile.name}</span>
            </span>
            <button
              type="button"
              onClick={onRemoveCoverFile}
              className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
              aria-label={t('createPost.book.removeFile')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => coverFileInputRef.current?.click()}
          >
            {t('createPost.book.chooseCover')}
          </Button>
        )}
        <input
          ref={coverFileInputRef}
          type="file"
          accept="image/*"
          onChange={onCoverFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
