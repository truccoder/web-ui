'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Users as UsersIcon, FileText, BookOpen, Star, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useSearch } from '@/lib/hooks/use-search';
import { useT } from '@/lib/i18n';
import { getNeutralAvatarColor } from '@/lib/avatar-color';
import { getErrorMessage } from '@/lib/api/error';
import { useFriends, useSentRequests, useSendFriendRequest } from '@/lib/hooks/use-friendship';
import { useProfile } from '@/lib/hooks/use-user';
import type { SearchBook } from '@/lib/types';

function initials(name: string): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function InlineBookResult({ book }: { book: SearchBook }) {
  const t = useT();
  return (
    <div className="flex items-center gap-2 mt-2 rounded-md border px-2 py-1.5">
      {book.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={book.coverImageUrl}
          alt=""
          className="h-10 w-7 rounded object-cover shrink-0 border"
        />
      ) : (
        <div className="h-10 w-7 rounded bg-muted flex items-center justify-center shrink-0">
          <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{book.title}</p>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Star className="h-2.5 w-2.5 fill-current text-amber-500" />
            {book.avgRating.toFixed(1)}
          </span>
          <span>·</span>
          <span>{book.isFree ? t('post.book.free') : book.price.toLocaleString('vi-VN')}</span>
        </div>
      </div>
    </div>
  );
}

function SearchContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();

  const { data, isLoading, isError, error } = useSearch(query, 20, query.length >= 2);

  const { data: profile } = useProfile();
  const { data: friendsData } = useFriends();
  const { data: sentRequests } = useSentRequests();
  const { mutate: sendRequest, isPending: isSending } = useSendFriendRequest();

  const friendIds = new Set(friendsData?.friends.map((f) => String(f.id)) ?? []);
  const sentIds = new Set(sentRequests?.map((r) => String(r.addresseeId)) ?? []);

  const hasResults = Boolean(data && (data.users.length > 0 || data.posts.length > 0));

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('search.title')}</h1>
        {query && (
          <p className="text-muted-foreground text-sm mt-0.5">
            {t('search.resultsFor', { query })}
          </p>
        )}
      </div>

      {query.length < 2 ? (
        <p className="text-sm text-muted-foreground text-center py-12">{t('search.prompt')}</p>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive text-center py-12">
          {getErrorMessage(error, t('search.error'))}
        </p>
      ) : !hasResults ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          {t('search.empty', { query })}
        </p>
      ) : (
        <div className="space-y-6">
          {data!.users.length > 0 && (
            <div>
              <p className="px-1 py-1 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <UsersIcon className="h-4 w-4" />
                {t('search.usersSection', { count: data!.users.length })}
              </p>
              <div className="rounded-lg border divide-y overflow-hidden">
                {data!.users.map((u) => {
                  const color = getNeutralAvatarColor(String(u.id));
                  const isSelf = String(u.id) === String(profile?.userId);
                  const isFriend = friendIds.has(String(u.id));
                  const isSent = sentIds.has(String(u.id));

                  return (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={u.profilePictureUrl} />
                        <AvatarFallback className={`${color} text-white text-sm font-medium`}>
                          {initials(u.fullName) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                      </div>
                      {!isSelf && !isFriend && (
                        <Button
                          size="sm"
                          variant={isSent ? 'secondary' : 'default'}
                          disabled={isSent || isSending}
                          onClick={() => sendRequest({ addresseeId: u.id })}
                          className="shrink-0"
                        >
                          <UserPlus className="h-4 w-4 mr-1.5" />
                          {isSent
                            ? t('friends.suggestions.requestSent')
                            : t('friends.suggestions.addFriend')}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data!.posts.length > 0 && (
            <div>
              <p className="px-1 py-1 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                {t('search.postsSection', { count: data!.posts.length })}
              </p>
              <div className="rounded-lg border divide-y overflow-hidden">
                {data!.posts.map((p) => {
                  const color = getNeutralAvatarColor(String(p.authorId));
                  return (
                    <div key={p.id} className="flex gap-3 px-3 py-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={p.authorProfilePictureUrl} />
                        <AvatarFallback className={`${color} text-white text-sm font-medium`}>
                          {initials(p.authorFullName) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{p.authorFullName}</p>
                        {p.eventName && (
                          <p className="text-xs text-muted-foreground mt-0.5">{p.eventName}</p>
                        )}
                        {p.content && (
                          <p className="text-sm text-muted-foreground line-clamp-3 mt-0.5">
                            {p.content}
                          </p>
                        )}
                        {p.book && <InlineBookResult book={p.book} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
