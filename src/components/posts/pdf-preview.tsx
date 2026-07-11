'use client';

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n';

// CDN worker sidesteps bundler-specific worker config entirely (Turbopack/webpack worker
// loading for pdf.js has historically been finicky) — this module only ever loads client-side
// via next/dynamic(ssr:false) in create-post-form.tsx, so referencing it here is safe.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  // A local File (composer, before upload) or a presigned URL string (viewing an already-posted
  // book) — react-pdf's Document accepts either directly.
  file: File | string;
  width?: number;
}

export function PdfPreview({ file, width = 220 }: PdfPreviewProps) {
  const t = useT();
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState(false);

  if (error) {
    return <p className="text-xs text-destructive">{t('createPost.book.previewError')}</p>;
  }

  return (
    <div className="rounded-lg border overflow-hidden bg-muted/30 w-fit">
      <Document
        file={file}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={() => setError(true)}
        loading={
          <div className="flex items-center justify-center py-8" style={{ width }}>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <Page pageNumber={1} width={width} renderAnnotationLayer={false} renderTextLayer={false} />
      </Document>
      {numPages != null && (
        <p className="text-[11px] text-muted-foreground text-center py-1.5 border-t">
          {t('createPost.book.previewPageCount', { count: numPages })}
        </p>
      )}
    </div>
  );
}
