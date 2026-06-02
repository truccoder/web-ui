'use client';

import { UserPlus, Users } from 'lucide-react';
import {
  useFriendSuggestions,
  useSendFriendRequest,
  useSentRequests,
} from '@/lib/hooks/use-friendship';
import { useT } from '@/lib/i18n';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function SuggestionCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-24 w-full" />
      <CardContent className="pt-10 pb-4 px-4 relative">
        <Skeleton className="absolute -top-8 left-4 h-16 w-16 rounded-full" />
        <Skeleton className="h-4 w-32 mb-1" />
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export default function FriendSuggestionsPage() {
  const { data: suggestions, isLoading } = useFriendSuggestions();
  const { data: sentRequests } = useSentRequests();
  const { mutate: sendRequest, isPending: isSending } = useSendFriendRequest();
  const t = useT();

  const sentIds = new Set(sentRequests?.map((r) => r.addresseeId) ?? []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('friends.suggestions.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('friends.suggestions.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SuggestionCardSkeleton key={i} />
          ))}
        </div>
      ) : !suggestions || suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">{t('friends.suggestions.empty.title')}</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs">
            {t('friends.suggestions.empty.desc')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {suggestions.map((person) => {
            const alreadySent = sentIds.has(person.id);
            return (
              <Card key={person.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-24 bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-400" />
                <CardContent className="pt-0 pb-4 px-4 relative">
                  <div className="absolute -top-8 left-4">
                    <Avatar className="h-16 w-16 ring-4 ring-card">
                      <AvatarImage src={person.profilePictureUrl} />
                      <AvatarFallback className="text-xl font-semibold bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {person.fullName?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="pt-10">
                    <p className="font-semibold text-sm leading-tight">{person.fullName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('friends.suggestions.suggestedForYou')}
                    </p>

                    <div className="mt-3 space-y-2">
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={isSending || alreadySent}
                        onClick={() => sendRequest({ addresseeId: person.id })}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        {alreadySent
                          ? t('friends.suggestions.requestSent')
                          : t('friends.suggestions.addFriend')}
                      </Button>
                      <Button size="sm" variant="secondary" className="w-full">
                        {t('friends.suggestions.ignore')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
