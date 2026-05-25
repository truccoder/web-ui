'use client';

import { useState, useRef } from 'react';
import { ImageIcon, Smile } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LocationPicker } from './location-picker';
import { useCreatePost } from '@/lib/hooks/use-posts';
import { useProfile } from '@/lib/hooks/use-user';
import type { PostLocation } from '@/lib/types';

export function CreatePostForm() {
  const [content, setContent] = useState('');
  const [location, setLocation] = useState<PostLocation | undefined>();
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: profile } = useProfile();
  const { mutate: createPost, isPending } = useCreatePost();

  const initials = profile?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const handleSubmit = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    createPost(
      { content: trimmed, location },
      {
        onSuccess: () => {
          setContent('');
          setLocation(undefined);
          setFocused(false);
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
          }
        },
      }
    );
  };

  const canSubmit = content.trim().length > 0 && !isPending;

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.profilePictureUrl} />
            <AvatarFallback className="text-sm font-medium">{initials ?? '?'}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaInput}
              onFocus={() => setFocused(true)}
              placeholder={`${profile?.fullName?.split(' ')[0] ?? 'Bạn'} đang nghĩ gì vậy?`}
              rows={focused ? 3 : 1}
              className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none leading-relaxed"
            />

            {(focused || content || location) && (
              <>
                <div className="border-t pt-2.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <LocationPicker value={location} onChange={setLocation} />
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-full px-2 py-1 hover:bg-accent"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Ảnh</span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-full px-2 py-1 hover:bg-accent"
                    >
                      <Smile className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Cảm xúc</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs tabular-nums ${content.length > 450 ? 'text-orange-500' : 'text-muted-foreground'}`}
                    >
                      {content.length}/500
                    </span>
                    <Button
                      size="sm"
                      disabled={!canSubmit}
                      onClick={handleSubmit}
                      className="rounded-full px-5"
                    >
                      {isPending ? 'Đang đăng...' : 'Đăng'}
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
