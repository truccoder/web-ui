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
  const { data: profile } = useProfile();
  const { data: friends } = useFriends();
  const { data: suggestions } = useFriendSuggestions();
  const { data: pendingRequests } = usePendingRequests();
  const { data: followers } = useFollowers();
  const { data: following } = useFollowing();

  const { mutate: sendRequest, isPending: isSending } = useSendFriendRequest();
  const { mutate: acceptRequest } = useAcceptFriendRequest();
  const { mutate: rejectRequest } = useRejectFriendRequest();

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back
          {profile?.fullName ? `, ${profile.fullName.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening on your network
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Friends"
          value={friends?.length}
          icon={Users}
          description="Total connections"
        />
        <StatCard
          title="Followers"
          value={followers?.totalElements}
          icon={UserCheck}
          description="People following you"
        />
        <StatCard
          title="Following"
          value={following?.totalElements}
          icon={UserPlus}
          description="People you follow"
        />
        <StatCard
          title="Pending"
          value={pendingRequests?.length}
          icon={Clock}
          description="Friend requests"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending friend requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Friend Requests
              {pendingRequests && pendingRequests.length > 0 && (
                <Badge variant="secondary">{pendingRequests.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>People who want to connect</CardDescription>
          </CardHeader>
          <CardContent>
            {!pendingRequests || pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No pending requests</p>
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
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => rejectRequest(req.id)}>
                        Reject
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
            <CardTitle>People You May Know</CardTitle>
            <CardDescription>Expand your network</CardDescription>
          </CardHeader>
          <CardContent>
            {!suggestions || suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No suggestions right now
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
                      Add
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
