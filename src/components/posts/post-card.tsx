'use client';

import { useState } from 'react';
import {
  MoreHorizontal,
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useT } from '@/lib/i18n';
import { useProfile } from '@/lib/hooks/use-user';
import {
  useUpsertReaction,
  useRemoveReaction,
  useMyReaction,
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
  useUpdatePost,
  useDeletePost,
} from '@/lib/hooks/use-posts';
import { getNeutralAvatarColor } from '@/lib/avatar-color';
import { cn } from '@/lib/utils';
import { EventPostDetails } from './event-post-details';
import { BookPostSummary } from './book-post-summary';
import { ExplainDialog } from './explain-dialog';
import type { CommentResponse, FeedPostData } from '@/lib/types';

interface PostCardProps {
  post: FeedPostData;
}

function nameInitials(name: string): string {
  return (name ?? '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getLocationLabel(post: FeedPostData): string | null {
  const { locationType, locationDetails } = post;
  if (!locationType) return null;

  if (locationType === 'COORDINATE') {
    if (locationDetails?.latitude != null && locationDetails?.longitude != null) {
      return `${locationDetails.latitude.toFixed(4)}, ${locationDetails.longitude.toFixed(4)}`;
    }
    return 'Vị trí đã chia sẻ';
  }

  if (locationType === 'REGION') {
    return locationDetails?.city ?? locationDetails?.display_name ?? 'Khu vực';
  }

  return locationDetails?.display_name ?? 'Địa điểm';
}

function CommentRow({
  comment,
  isOwn,
  onDelete,
  onUpdate,
  isUpdating,
}: {
  comment: CommentResponse;
  isOwn: boolean;
  onDelete: () => void;
  onUpdate: (content: string, onSuccess: () => void) => void;
  isUpdating: boolean;
}) {
  const t = useT();
  const authorName = comment.authorFullName ?? '?';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);

  const startEdit = () => {
    setDraft(comment.content);
    setEditing(true);
  };

  const saveEdit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === comment.content) {
      setEditing(false);
      return;
    }
    onUpdate(trimmed, () => setEditing(false));
  };

  return (
    <div className="group flex items-start gap-2">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={comment.authorProfilePictureUrl ?? undefined} />
        <AvatarFallback
          className={`${getNeutralAvatarColor(authorName)} text-white text-[10px] font-medium`}
        >
          {nameInitials(authorName) || '?'}
        </AvatarFallback>
      </Avatar>

      {editing ? (
        <div className="flex-1 space-y-1.5">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveEdit();
              }
              if (e.key === 'Escape') setEditing(false);
            }}
            autoFocus
            className="w-full bg-muted rounded-full px-3 py-1.5 text-xs focus:outline-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={isUpdating}
              className="text-[11px] font-medium text-primary hover:underline cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : t('post.saveComment')}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
            >
              {t('post.cancelEditComment')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-muted rounded-2xl px-3 py-1.5 text-xs max-w-[85%]">
            <p className="font-medium leading-tight">{authorName}</p>
            <p className="mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
          </div>
          {isOwn && (
            <span className="mt-1.5 hidden group-hover:flex items-center gap-1.5">
              <button
                type="button"
                onClick={startEdit}
                aria-label={t('post.editComment')}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label={t('post.deleteComment')}
                className="text-muted-foreground hover:text-destructive cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function PostCard({ post }: PostCardProps) {
  const t = useT();
  const {
    postId,
    authorId,
    authorFullName,
    authorProfilePictureUrl,
    authorJobTitle,
    content,
    createdAt,
    shareCount,
  } = post;
  const locationLabel = getLocationLabel(post);
  const initials = nameInitials(authorFullName);

  const { data: profile } = useProfile();
  const isOwnPost = profile?.userId === authorId;

  const { mutate: upsertReaction, isPending: isReacting } = useUpsertReaction(postId);
  const { mutate: removeReaction } = useRemoveReaction(postId);
  const { mutate: createComment, isPending: isCommenting } = useCreateComment(postId);
  const { mutate: deleteComment } = useDeleteComment(postId);
  const { mutate: updateComment, isPending: isUpdatingComment } = useUpdateComment(postId);
  const { mutate: updatePost, isPending: isUpdatingPost } = useUpdatePost();
  const { mutate: deletePost, isPending: isDeletingPost } = useDeletePost();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [explainOpen, setExplainOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(content);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Server state for the viewer's reaction; fall back to it unless the user toggled locally.
  const { data: myReaction } = useMyReaction(postId);
  const [likedOverride, setLikedOverride] = useState<boolean | null>(null);
  const liked = likedOverride ?? myReaction?.reactionType != null;
  const [likeDelta, setLikeDelta] = useState(0);
  const likeCount = post.likeCount + likeDelta;

  // Only fetch the comment list once the section is opened.
  const {
    data: comments,
    isLoading: isLoadingComments,
    isError: commentsError,
  } = useComments(postId, commentsOpen);
  const commentCount = comments?.length ?? post.commentCount;

  const handleToggleLike = () => {
    if (isReacting) return;
    if (liked) {
      setLikedOverride(false);
      setLikeDelta((d) => d - 1);
      removeReaction();
    } else {
      setLikedOverride(true);
      setLikeDelta((d) => d + 1);
      upsertReaction('LIKE');
    }
  };

  const handleSubmitComment = () => {
    const trimmed = commentDraft.trim();
    if (!trimmed) return;
    createComment({ content: trimmed }, { onSuccess: () => setCommentDraft('') });
  };

  const handleSaveEdit = () => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    updatePost({ postId, payload: { content: trimmed } }, { onSuccess: () => setEditOpen(false) });
  };

  function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return t('post.justNow');
    if (diffMin < 60) return t('post.minutesAgo', { minutes: diffMin });
    if (diffHr < 24) return t('post.hoursAgo', { hours: diffHr });
    if (diffDay < 7) return t('post.daysAgo', { days: diffDay });

    return date.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'short',
      year: diffDay > 365 ? 'numeric' : undefined,
    });
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={authorProfilePictureUrl} />
              <AvatarFallback className="text-sm font-medium">{initials ?? '?'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold leading-tight">{authorFullName}</p>
              {authorJobTitle && (
                <p className="text-xs text-muted-foreground leading-tight">{authorJobTitle}</p>
              )}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(createdAt)}
                </span>
                {locationLabel && (
                  <>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{locationLabel}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {isOwnPost && (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={t('post.menu.edit')}
                className="p-1 rounded-full hover:bg-accent transition-colors cursor-pointer text-muted-foreground shrink-0 outline-none"
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditDraft(content);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  {t('post.menu.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" />
                  {t('post.menu.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        {content.trim() && (
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</p>
        )}

        {post.postType === 'EVENT' && post.eventDetails && (
          <EventPostDetails postId={postId} event={post.eventDetails} />
        )}

        {post.postType === 'BOOK' && post.book && <BookPostSummary book={post.book} />}

        {/* Actions */}
        <div className="mt-3 pt-3 border-t flex items-center gap-1">
          <button
            type="button"
            onClick={handleToggleLike}
            disabled={isReacting}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer',
              liked
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Heart className={cn('h-4 w-4', liked && 'fill-current')} />
            {likeCount > 0 && <span>{likeCount}</span>}
            {t('post.like')}
          </button>
          <button
            type="button"
            onClick={() => setCommentsOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <MessageCircle className="h-4 w-4" />
            {commentCount > 0 && <span>{commentCount}</span>}
            {t('post.comment')}
          </button>
          <button
            type="button"
            onClick={() => setExplainOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            {t('knowledge.explain.button')}
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer ml-auto"
          >
            <Share2 className="h-4 w-4" />
            {shareCount > 0 && <span>{shareCount}</span>}
            {t('post.share')}
          </button>
        </div>

        {/* Comments */}
        {commentsOpen && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {isLoadingComments && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {commentsError && (
              <p className="text-xs text-muted-foreground">{t('post.commentsError')}</p>
            )}

            {!isLoadingComments && !commentsError && (comments?.length ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground">{t('post.noComments')}</p>
            )}

            {comments?.map((c) => (
              <CommentRow
                key={c.id}
                comment={c}
                isOwn={profile?.userId === c.authorId}
                onDelete={() => deleteComment(c.id)}
                onUpdate={(content, onSuccess) =>
                  updateComment({ commentId: c.id, payload: { content } }, { onSuccess })
                }
                isUpdating={isUpdatingComment}
              />
            ))}

            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={profile?.profilePictureUrl} />
                <AvatarFallback
                  className={`${getNeutralAvatarColor(profile?.id ?? 'default')} text-white text-[10px] font-medium`}
                >
                  {nameInitials(profile?.fullname ?? '') || '?'}
                </AvatarFallback>
              </Avatar>
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
                placeholder={t('post.commentPlaceholder')}
                className="flex-1 bg-muted rounded-full px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none"
              />
              <Button
                size="sm"
                className="h-7 px-3 text-xs"
                disabled={isCommenting || !commentDraft.trim()}
                onClick={handleSubmitComment}
              >
                {isCommenting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('post.send')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* AI explanation */}
      <ExplainDialog postId={postId} open={explainOpen} onOpenChange={setExplainOpen} />

      {/* Edit own post */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('post.menu.editTitle')}</DialogTitle>
          </DialogHeader>
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              {t('post.menu.cancel')}
            </Button>
            <Button
              size="sm"
              disabled={isUpdatingPost || !editDraft.trim()}
              onClick={handleSaveEdit}
            >
              {isUpdatingPost && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isUpdatingPost ? t('post.menu.saving') : t('post.menu.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete own post */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('post.menu.confirmDeleteTitle')}</DialogTitle>
            <DialogDescription>{t('post.menu.confirmDeleteDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
              {t('post.menu.cancel')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeletingPost}
              onClick={() => deletePost(postId, { onSuccess: () => setDeleteOpen(false) })}
            >
              {isDeletingPost && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('post.menu.confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
