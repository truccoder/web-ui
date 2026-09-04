import { pdfjs } from 'react-pdf';

/**
 * THE ONE PLACE THAT POINTS pdf.js AT ITS WORKER. Two dialogs render `react-pdf` — the bookstore's
 * sample reader and matchmaking's job-description viewer — and setting `GlobalWorkerOptions.workerSrc`
 * inside each one invites a silent version mismatch the day the pinned `pdfjs-dist` moves. Import
 * this module for its side effect once, before any `<Document>` mounts.
 *
 * SELF-HOSTED, NOT A CDN. `new URL(..., import.meta.url)` makes the bundler resolve the worker out
 * of `node_modules` and emit it as this app's own asset. The app otherwise only talks to its own
 * backend; the legacy `https://unpkg.com/pdfjs-dist@…` worker src was one of the three reasons the
 * first PDF preview component was cut.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
