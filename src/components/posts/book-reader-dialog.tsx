'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import { useBookPreviewUrl } from '@/lib/hooks/use-books';
import { getErrorMessage } from '@/lib/api/error';

// CDN worker sidesteps bundler-specific worker config entirely — this module only ever loads
// client-side via next/dynamic(ssr:false) wherever it's used, so referencing it here is safe.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MAX_PAGE_WIDTH = 480;

interface BookReaderDialogProps {
  bookId: number;
  title: string;
  trigger: ReactElement;
}

export function BookReaderDialog({ bookId, title, trigger }: BookReaderDialogProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pageWidth, setPageWidth] = useState(MAX_PAGE_WIDTH);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    data: previewUrl,
    isLoading: urlLoading,
    isError: urlFailed,
    error: urlError,
  } = useBookPreviewUrl(bookId, open);

  // Keeps the rendered page from ever exceeding the dialog's own width — DialogContent clips
  // overflow, so on narrow viewports a fixed 480px page would get cut off at the sides.
  useEffect(() => {
    if (!open) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    const update = () => setPageWidth(Math.min(MAX_PAGE_WIDTH, el.clientWidth - 32));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // Reset reading position so the next open starts from page 1, not wherever they left off.
      setPageNumber(1);
      setNumPages(null);
      setLoadFailed(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="w-full max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-row items-center justify-between border-b px-4 py-3 pr-12">
          <DialogTitle className="truncate">{title}</DialogTitle>
        </DialogHeader>

        <div ref={scrollAreaRef} className="flex-1 min-h-0 overflow-y-auto bg-muted/30 px-4 py-6">
          {/* Centering an overflowing child with flex items-center inside a scroll container
              clips the part that overflows instead of leaving it scrollable — mx-auto on a
              block-level wrapper centers horizontally without breaking vertical scroll. */}
          {urlLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : urlFailed ? (
            <p className="text-sm text-destructive px-6 text-center">
              {getErrorMessage(urlError, t('post.book.previewUrlError'))}
            </p>
          ) : loadFailed ? (
            <p className="text-sm text-destructive px-6 text-center">
              {t('post.book.readerLoadError')}
            </p>
          ) : previewUrl ? (
            <div className="w-fit mx-auto">
              <Document
                file={previewUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                onLoadError={() => setLoadFailed(true)}
                loading={
                  <div className="flex justify-center" style={{ width: pageWidth }}>
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  width={pageWidth}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  loading={
                    <div className="flex justify-center" style={{ width: pageWidth }}>
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  }
                />
              </Document>
            </div>
          ) : null}
        </div>

        {numPages != null && (
          <div className="flex items-center justify-between border-t px-4 py-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('post.book.previousPage')}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t('post.book.pageIndicator', { current: pageNumber, total: numPages })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            >
              {t('post.book.nextPage')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
