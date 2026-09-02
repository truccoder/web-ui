import type { Metadata } from 'next';
import { getMessages, pageMetadata } from '@/core/i18n/server';

/**
 * `page.tsx` is a client component and cannot export `metadata`, so this layout carries it —
 * the pattern is written out once in `core/i18n/server.ts`.
 *
 * IT ALSO CARRIES THE LINK-UNFURL CARD. An ARTICLE's cover image, title and summary are no
 * longer drawn inside the post (see `article-body.tsx` — a full-width picture on every card was
 * noise). Their remaining job is the Open Graph / Twitter tags here: paste a `/posts/{id}` link
 * into Slack, Facebook or a chat and the unfurl shows the cover, the headline and the teaser,
 * while the in-app card stays text.
 *
 * THE FETCH IS ANONYMOUS AND BEST-EFFORT. `GET /v1/api/posts/{id}` is on the backend's
 * guest-readable surface (see `core/api/axios.ts`), so a plain server-side `fetch` with no token
 * works. A private post answers 404 and a crawler was never going to see it anyway; any failure
 * — network, 404, a missing `NEXT_PUBLIC_API_URL` — falls back to the plain tab title. A short
 * `revalidate` keeps a burst of unfurls from hammering the backend.
 */

interface PostOgData {
  postType?: string;
  content?: string;
  articleDetails?: { title?: string; summary?: string; coverImage?: string } | null;
  images?: string[] | null;
}

async function fetchPostForOg(id: string): Promise<PostOgData | null> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base || !/^\d+$/.test(id)) return null;
  try {
    const res = await fetch(`${base}/v1/api/posts/${id}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return (await res.json()) as PostOgData;
  } catch {
    return null;
  }
}

/** First ~200 chars of the body, cut on a word boundary, for a post with no article summary. */
function excerpt(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= 200) return trimmed;
  const slice = trimmed.slice(0, 200);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 120 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const [{ id }, messages, fallback] = await Promise.all([
    params,
    getMessages(),
    pageMetadata((m) => m.meta.post),
  ]);

  const post = await fetchPostForOg(id);
  if (!post) return fallback;

  const article = post.articleDetails ?? undefined;
  const heading = article?.title?.trim() || messages.meta.post;
  const description = article?.summary?.trim() || excerpt(post.content);
  const image = article?.coverImage?.trim() || post.images?.find((url) => url?.trim())?.trim();

  return {
    ...fallback,
    // A real headline in the tab beats the generic "Post ·" label when we have one.
    title: article?.title?.trim() ? `${heading} · ${messages.app.name}` : fallback.title,
    openGraph: {
      type: post.postType === 'ARTICLE' ? 'article' : 'website',
      title: heading,
      description,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: heading,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default function PostDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
