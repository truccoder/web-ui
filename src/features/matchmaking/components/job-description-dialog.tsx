'use client';

import * as React from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button, Dialog, EmptyState, Skeleton } from '@/shared/components';
import '@/shared/pdf/worker';
import { useT } from '@/core/i18n';
import { useJobDescriptionUrl } from '../hooks/use-matchmaking';

/**
 * The generated job-description PDF for one role, read in a paged viewer — the same shape as the
 * bookstore's `BookReaderDialog` (`react-pdf`, page nav, skeleton, explicit error state), pointed
 * at `useJobDescriptionUrl` instead of the book preview.
 *
 * `open` GATES THE QUERY so nothing is signed — and no PDF is built server-side — until the dialog
 * is actually opened. The FIRST open of a role is slow (~1s): the backend renders the PDF before
 * signing the URL, so the skeleton has to sit through that. A reopen is instant from cache.
 *
 * "Tải PDF" opens the signed URL in a new tab — a JD exists to be sent on to someone else.
 */
export interface JobDescriptionDialogProps {
  positionId: number;
  positionTitle: string;
  open: boolean;
  onClose: () => void;
}

const MAX_PAGE_WIDTH = 560;

export function JobDescriptionDialog({
  positionId,
  positionTitle,
  open,
  onClose,
}: JobDescriptionDialogProps) {
  const t = useT();
  const [pageNumber, setPageNumber] = React.useState(1);
  const [numPages, setNumPages] = React.useState<number | null>(null);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [pageWidth, setPageWidth] = React.useState(MAX_PAGE_WIDTH);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const { data, isPending, isError } = useJobDescriptionUrl(positionId, open);
  const url = data?.url;

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

  // Reading position is derived from which role is open rather than reset in an effect — the same
  // pattern `BookReaderDialog` uses and for the same lint reason.
  const [viewerFor, setViewerFor] = React.useState(positionId);
  if (viewerFor !== positionId) {
    setViewerFor(positionId);
    setPageNumber(1);
    setNumPages(null);
    setLoadFailed(false);
  }

  const handleClose = () => {
    setPageNumber(1);
    setNumPages(null);
    setLoadFailed(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={
        <span className="block truncate">
          {t('projects.jd.dialogTitle', { title: positionTitle })}
        </span>
      }
      width={720}
      maxHeight="90vh"
      bodyBleed
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            disabled={!url}
            onClick={() => url && window.open(url, '_blank', 'noopener,noreferrer')}
          >
            {t('projects.jd.download')}
          </Button>

          {numPages != null && (
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={<ChevronLeft className="h-4 w-4" />}
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              >
                {t('projects.jd.prevPage')}
              </Button>
              <span className="text-nx-caption text-nx-text-muted">
                {t('projects.jd.page', { current: pageNumber, total: numPages })}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              >
                {t('projects.jd.nextPage')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      }
    >
      <div ref={scrollAreaRef} className="h-full overflow-y-auto bg-nx-surface-sunken px-4 py-5">
        {isPending ? (
          <Skeleton
            className="mx-auto"
            width={pageWidth}
            height={620}
            radius="var(--radius-nx-md)"
          />
        ) : isError ? (
          <EmptyState
            title={t('projects.jd.loadError')}
            description={t('projects.jd.loadErrorHint')}
          />
        ) : loadFailed ? (
          <EmptyState title={t('projects.jd.loadError')} />
        ) : url ? (
          <div className="mx-auto w-fit">
            <Document
              file={url}
              onLoadSuccess={({ numPages: total }) => setNumPages(total)}
              onLoadError={() => setLoadFailed(true)}
              loading={<Skeleton width={pageWidth} height={620} radius="var(--radius-nx-md)" />}
            >
              <Page
                pageNumber={pageNumber}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
                loading={<Skeleton width={pageWidth} height={620} radius="var(--radius-nx-md)" />}
              />
            </Document>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
