'use client';

import * as React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Dialog, EmptyState, Skeleton } from '@/shared/components';
import { useT } from '@/core/i18n';
import { useBookPreviewUrl } from '../hooks';

/**
 * In-app paged reader for a book's PDF sample.
 *
 * THE WORKER IS SELF-HOSTED, AND THAT IS THE POINT OF REBUILDING THIS FILE. The legacy version set
 * `workerSrc` to `https://unpkg.com/pdfjs-dist@<version>/build/pdf.worker.min.mjs` — a third-party
 * CDN on the critical path of an app that otherwise only talks to its own backend. That was one of
 * the three reasons `pdf-preview.tsx` was cut at P2.4c-4, and the note there deferred the call on
 * this reader to "the bookstore domain", which is now. `new URL(..., import.meta.url)` makes the
 * bundler resolve the worker out of `node_modules` and emit it as an asset of this app, so the
 * behaviour is unchanged and the outbound request is gone.
 *
 * Only PDFs reach this component. EPUB has no in-app renderer, and `BookActions` sends that format
 * to the presigned URL instead rather than pretending otherwise.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/** Cap so a page never renders wider than the dialog can show. */
const MAX_PAGE_WIDTH = 480;

export interface BookReaderDialogProps {
  bookId: number;
  title: string;
  open: boolean;
  onClose: () => void;
}

export function BookReaderDialog({ bookId, title, open, onClose }: BookReaderDialogProps) {
  const t = useT();
  const [pageNumber, setPageNumber] = React.useState(1);
  const [numPages, setNumPages] = React.useState<number | null>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [pageWidth, setPageWidth] = React.useState(MAX_PAGE_WIDTH);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  // `open` gates the query so nothing is presigned until the reader is actually opened — the
  // endpoint is free of side effects, but signing a URL for a dialog nobody opened is still waste.
  const { data: previewUrl, isPending, isError } = useBookPreviewUrl(bookId, open);

  // Keeps the rendered page inside the dialog's own width. The panel clips overflow, so a fixed
  // 480px page would be cut off on narrow viewports.
  React.useEffect(() => {
    if (!open) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    const update = () => setPageWidth(Math.min(MAX_PAGE_WIDTH, el.clientWidth - 32));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  // Reading position is DERIVED from which book is open rather than reset inside an effect:
  // `react-hooks/set-state-in-effect` forbids the "clear state at the top of an effect" shape, and
  // the fix is to make the value a function of its identity. Tagging the state with the book id and
  // ignoring anything tagged with a different one gives a fresh reader per book without an effect.
  const [readerFor, setReaderFor] = React.useState(bookId);
  if (readerFor !== bookId) {
    setReaderFor(bookId);
    setPageNumber(1);
    setNumPages(null);
    setLoadFailed(false);
  }

  const handleClose = () => {
    // Next open starts at page 1 rather than wherever the last reader left off.
    setPageNumber(1);
    setNumPages(null);
    setLoadFailed(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={<span className="block truncate">{title}</span>}
      width={672}
      maxHeight="90vh"
      bodyBleed
      footer={
        numPages != null ? (
          <div className="flex w-full items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronLeft className="h-4 w-4" />}
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            >
              {t('post.book.previousPage')}
            </Button>
            <span className="text-nx-caption text-nx-text-muted">
              {t('post.book.pageIndicator', { current: pageNumber, total: numPages })}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            >
              {t('post.book.nextPage')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : undefined
      }
    >
      <div ref={scrollAreaRef} className="h-full overflow-y-auto bg-nx-surface-sunken px-4 py-5">
        {isPending ? (
          <Skeleton
            className="mx-auto"
            width={pageWidth}
            height={600}
            radius="var(--radius-nx-md)"
          />
        ) : isError ? (
          // A failure here is usually the book's storage object, not the network — the backend
          // answers 503 "Failed to generate download URL" when it cannot presign. Saying "no
          // preview available" would read as "this book has none", which is a different fact.
          <EmptyState
            title={t('post.book.previewUrlError')}
            description={t('post.book.previewUnavailableHint')}
          />
        ) : loadFailed ? (
          <EmptyState title={t('post.book.readerLoadError')} />
        ) : previewUrl ? (
          // Centring an overflowing child with `items-center` inside a scroll container clips the
          // overflow instead of leaving it scrollable; `mx-auto` on a block wrapper centres
          // horizontally without breaking vertical scroll.
          <div className="mx-auto w-fit">
            <Document
              file={previewUrl}
              onLoadSuccess={({ numPages: total }) => setNumPages(total)}
              onLoadError={() => setLoadFailed(true)}
              loading={<Skeleton width={pageWidth} height={600} radius="var(--radius-nx-md)" />}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading={<Skeleton width={pageWidth} height={600} radius="var(--radius-nx-md)" />}
              />
            </Document>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
