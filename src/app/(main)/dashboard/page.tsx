'use client';

import { Users, UserPlus, UserCheck, Clock } from 'lucide-react';
import { useProfile } from '@/lib/hooks/use-user';
import {
  useFriends,
  useFriendSuggestions,
  usePendingRequests,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useRejectFriendRequest,
} from '@/lib/hooks/use-friendship';
import { useFollowers, useFollowing } from '@/lib/hooks/use-social';
import { useT } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value ?? '—'}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const t = useT();
  const { data: profile } = useProfile();
  const { data: friends } = useFriends();
  const { data: suggestions } = useFriendSuggestions();
  const { data: pendingRequests } = usePendingRequests();
  const { data: followers } = useFollowers();
  const { data: following } = useFollowing();

  const { mutate: sendRequest, isPending: isSending } = useSendFriendRequest();
  const { mutate: acceptRequest } = useAcceptFriendRequest();
  const { mutate: rejectRequest } = useRejectFriendRequest();

  const firstName = profile?.fullName?.split(' ')[0];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {firstName
            ? t('dashboard.welcomeName', { name: firstName })
            : t('dashboard.welcome')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('dashboard.stats.friends')}
          value={friends?.length}
          icon={Users}
          description={t('dashboard.stats.friendsDesc')}
        />
        <StatCard
          title={t('dashboard.stats.followers')}
          value={followers?.totalElements}
          icon={UserCheck}
          description={t('dashboard.stats.followersDesc')}
        />
        <StatCard
          title={t('dashboard.stats.following')}
          value={following?.totalElements}
          icon={UserPlus}
          description={t('dashboard.stats.followingDesc')}
        />
        <StatCard
          title={t('dashboard.stats.pending')}
          value={pendingRequests?.length}
          icon={Clock}
          description={t('dashboard.stats.pendingDesc')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending friend requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('dashboard.requests.title')}
              {pendingRequests && pendingRequests.length > 0 && (
                <Badge variant="secondary">{pendingRequests.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>{t('dashboard.requests.desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingRequests || pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t('dashboard.requests.empty')}
              </p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={req.requesterProfilePictureUrl} />
                        <AvatarFallback>{req.requesterFullName?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{req.requesterFullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => acceptRequest(req.id)}>
                        {t('dashboard.requests.accept')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rejectRequest(req.id)}
                      >
                        {t('dashboard.requests.reject')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggested friends */}
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.suggestions.title')}</CardTitle>
            <CardDescription>{t('dashboard.suggestions.desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {!suggestions || suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t('dashboard.suggestions.empty')}
              </p>
            ) : (
              <div className="space-y-3">
                {suggestions.slice(0, 5).map((person) => (
                  <div key={person.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={person.profilePictureUrl} />
                        <AvatarFallback>{person.fullName?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium">{person.fullName}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSending}
                      onClick={() => sendRequest({ addresseeId: person.id })}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      {t('dashboard.suggestions.add')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
