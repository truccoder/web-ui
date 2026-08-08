'use client';

import { useRef, type ReactNode } from 'react';
import { FileText, ImageIcon, X } from 'lucide-react';
import { Button, Input } from '@/shared/components';
import { useT } from '@/core/i18n';
import type { CreateBookRequest } from '../types/post';

/**
 * `BOOK` payload — the `bookDetails` part of `POST /v1/api/posts/books`, plus the two file
 * parts that ride along with it.
 *
 * THIS IS THE ONE KIND THE BACKEND REALLY VALIDATES, so unlike the five kinds in P2.4c-3 the
 * gates below are not frontend-only manners. Measured from Java:
 * - `PostService.validateBookDetails` — `bookDetails` required, `title` required and non-blank.
 * - `BookService.validateFile` — the book file is required and must be **.pdf or .epub**,
 *   judged by the *filename extension*, not the MIME type. `accept=` on the input is a hint the
 *   OS file dialog may ignore, so the extension is re-checked here.
 * - `BookService.buildAndSaveBook` — `isFree = price == null || price <= 0`. A **paid** book
 *   must carry `previewPages > 0` or the call is a 400; a free one has both forced to 0 by the
 *   server, so this form hides the field entirely rather than collecting a value that is thrown
 *   away.
 * - Spring's `spring.servlet.multipart` caps the file at **20MB** and the whole request at 25MB
 *   (`application.yml`). That limit lives in config, not in the service, and it rejects the
 *   upload at the container before any handler runs — so it is checked here, where the user can
 *   still do something about it, instead of after a pointless upload.
 *
 * ONE RULE IS DELIBERATELY *NOT* MIRRORED: `previewPages` must also be **strictly less than the
 * book's total pages** (PDF) or chapters (EPUB) — `BookService.generatePreview` throws
 * otherwise. Knowing that total means parsing the file in the browser, which is what the legacy
 * form did with `react-pdf` and a worker fetched from `unpkg.com` at runtime. That preview is
 * NOT PORTED; see the note in `post-composer.tsx` and the ledger. The backend's own message
 * names the real total ("must be less than the book's total (N)"), so the error is one edit away
 * from recovery, and it surfaces through the composer's error banner verbatim.
 */
export interface BookPostFieldsProps {
  value: CreateBookRequest;
  onChange: (value: CreateBookRequest) => void;
  bookFile?: File;
  coverFile?: File;
  onBookFileChange: (file?: File) => void;
  onCoverFileChange: (file?: File) => void;
  /** Extension/size complaint about the chosen book file, owned by the composer. */
  fileError?: string;
}

/** `BookService.ALLOWED_FORMATS`. Extension-based, exactly as the server decides it. */
export const BOOK_FILE_EXTENSIONS = ['pdf', 'epub'] as const;

/** `spring.servlet.multipart.max-file-size` in `application.yml`. */
export const BOOK_FILE_MAX_BYTES = 20 * 1024 * 1024;

/** The server's own test: last dot in the name, lowercased. */
export function bookFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

export function BookPostFields({
  value,
  onChange,
  bookFile,
  coverFile,
  onBookFileChange,
  onCoverFileChange,
  fileError,
}: BookPostFieldsProps) {
  const t = useT();

  // `price` is a `Long` of VND. Empty means free, and free is also what any non-positive number
  // means to the server — so the field is left empty rather than pre-filled with 0.
  const isPaid = (value.price ?? 0) > 0;

  return (
    <div className="flex flex-col gap-3">
      <Input
        label={t('createPost.book.title')}
        value={value.title ?? ''}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
      />

      <Input
        label={t('createPost.book.description')}
        value={value.description ?? ''}
        onChange={(event) => onChange({ ...value, description: event.target.value })}
      />

      {/* A grid rather than a flex row: `Input`'s own root is `w-full` and its `className` lands
          on the inner field wrapper, so `w-auto` cannot shrink it — the columns have to come
          from the parent. */}
      <div className="grid items-start gap-3 sm:grid-cols-2">
        <Input
          size="sm"
          type="number"
          min={0}
          label={t('createPost.book.price')}
          value={value.price ?? ''}
          onChange={(event) =>
            onChange({
              ...value,
              price: event.target.value ? Number(event.target.value) : undefined,
              // Dropping back to free clears the preview count too: the server forces it to 0
              // for free books, so keeping a stale number would only misreport what was sent.
              ...(Number(event.target.value) > 0 ? {} : { previewPages: undefined }),
            })
          }
        />

        {isPaid && (
          <Input
            size="sm"
            type="number"
            min={1}
            label={t('createPost.book.previewPages')}
            hint={t('createPost.book.previewPagesHint')}
            value={value.previewPages ?? ''}
            onChange={(event) =>
              onChange({
                ...value,
                previewPages: event.target.value ? Number(event.target.value) : undefined,
              })
            }
          />
        )}
      </div>

      <FileField
        label={t('createPost.book.file')}
        accept=".pdf,.epub"
        icon={<FileText />}
        file={bookFile}
        error={fileError}
        chooseLabel={t('createPost.book.chooseFile')}
        removeLabel={t('createPost.book.removeFile')}
        onSelect={onBookFileChange}
      />

      <FileField
        label={t('createPost.book.cover')}
        accept="image/*"
        icon={<ImageIcon />}
        file={coverFile}
        chooseLabel={t('createPost.book.chooseCover')}
        removeLabel={t('createPost.book.removeFile')}
        onSelect={onCoverFileChange}
      />
    </div>
  );
}

/**
 * Local, not a shared primitive: the design system specifies no file input, and `Input` cannot
 * host one — a native `type="file"` renders an OS-drawn button that no token reaches. So the
 * real input is hidden and a `Button` drives it, which is composition from existing primitives
 * rather than a new one. It stays in this file because the book form is the only place in the
 * app with a file to pick; if a second caller appears, that is the moment to promote it.
 */
function FileField({
  label,
  accept,
  icon,
  file,
  error,
  chooseLabel,
  removeLabel,
  onSelect,
}: {
  label: string;
  accept: string;
  icon: ReactNode;
  file?: File;
  error?: string;
  chooseLabel: string;
  removeLabel: string;
  onSelect: (file?: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    onSelect(undefined);
    // Without this the same file cannot be re-picked after removal: the input keeps its value
    // and fires no `change` event for an identical selection.
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-nx-body-sm font-medium text-nx-text-primary">{label}</span>

      {file ? (
        <div className="flex items-center justify-between gap-2 rounded-nx-sm border border-nx-border-default bg-nx-surface-card px-2.5 py-1.5">
          <span className="flex min-w-0 items-center gap-2 text-nx-body-sm text-nx-text-primary">
            <span className="shrink-0 text-nx-text-muted [&>svg]:size-4" aria-hidden>
              {icon}
            </span>
            <span className="truncate">{file.name}</span>
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0"
            icon={<X />}
            onClick={clear}
            aria-label={removeLabel}
          />
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          className="self-start"
          onClick={() => inputRef.current?.click()}
        >
          {chooseLabel}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onSelect(event.target.files?.[0] ?? undefined)}
      />

      {error && (
        <p role="alert" className="text-nx-caption text-nx-status-danger-fg">
          {error}
        </p>
      )}
    </div>
  );
}
