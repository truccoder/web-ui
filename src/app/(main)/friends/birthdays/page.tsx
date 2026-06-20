'use client';

import { Gift, PartyPopper, CalendarDays } from 'lucide-react';
import { useFriends } from '@/lib/hooks/use-friendship';
import { useT } from '@/lib/i18n';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Profile } from '@/lib/types';

function getBirthday(person: Profile): { month: number; day: number } {
  let hash = 0;
  for (let i = 0; i < (person.id + person.fullname).length; i++) {
    hash = ((hash << 5) - hash + (person.id + person.fullname).charCodeAt(i)) | 0;
  }
  const month = (Math.abs(hash) % 12) + 1;
  const maxDay = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  const day = (Math.abs(hash >> 4) % maxDay) + 1;
  return { month, day };
}

function formatBirthday(month: number, day: number): string {
  const date = new Date(2000, month - 1, day);
  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' });
}

function getDaysUntil(month: number, day: number): number {
  const today = new Date();
  const thisYear = today.getFullYear();
  let next = new Date(thisYear, month - 1, day);
  if (next < today) next = new Date(thisYear + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

export default function BirthdaysPage() {
  const { data: friends, isLoading } = useFriends();
  const t = useT();

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const enriched = (friends ?? []).map((f) => {
    const { month, day } = getBirthday(f);
    const daysUntil = getDaysUntil(month, day);
    return { ...f, month, day, daysUntil };
  });

  const todayBirthdays = enriched.filter((f) => f.month === todayMonth && f.day === todayDay);
  const thisWeek = enriched.filter((f) => f.daysUntil > 0 && f.daysUntil <= 7);
  const upcoming = enriched.filter((f) => f.daysUntil > 7);

  const upcomingByMonth = upcoming.reduce<Record<number, typeof upcoming>>((acc, f) => {
    if (!acc[f.month]) acc[f.month] = [];
    acc[f.month].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('friends.birthdays.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('friends.birthdays.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Today's birthdays */}
          {todayBirthdays.length > 0 && (
            <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PartyPopper className="h-5 w-5 text-yellow-500" />
                  {t('friends.birthdays.today')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayBirthdays.map((person) => (
                  <div key={person.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={person.profilePictureUrl} />
                        <AvatarFallback className="font-semibold">
                          {person.fullname?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm">{person.fullname}</p>
                        <p className="text-xs text-muted-foreground">
                          🎂 {t('friends.birthdays.todayMsg')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="border-yellow-300">
                      <Gift className="h-3.5 w-3.5 mr-1.5" />
                      {t('friends.birthdays.wishHappy')}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* This week */}
          {thisWeek.length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-500" />
                {t('friends.birthdays.thisWeek')}
              </h2>
              <div className="space-y-2">
                {thisWeek
                  .sort((a, b) => a.daysUntil - b.daysUntil)
                  .map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={person.profilePictureUrl} />
                          <AvatarFallback className="font-semibold">
                            {person.fullname?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{person.fullname}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatBirthday(person.month, person.day)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {person.daysUntil === 1
                            ? t('friends.birthdays.tomorrow')
                            : t('friends.birthdays.daysAway', { days: person.daysUntil })}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Gift className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Upcoming by month */}
          {Object.keys(upcomingByMonth).length > 0 && (
            <div>
              <h2 className="text-base font-semibold mb-3">{t('friends.birthdays.upcoming')}</h2>
              <div className="space-y-6">
                {Object.entries(upcomingByMonth)
                  .sort(([a], [b]) => {
                    const aMonth = parseInt(a);
                    const bMonth = parseInt(b);
                    const curr = todayMonth;
                    const aDist = aMonth >= curr ? aMonth - curr : 12 - curr + aMonth;
                    const bDist = bMonth >= curr ? bMonth - curr : 12 - curr + bMonth;
                    return aDist - bDist;
                  })
                  .map(([month, people]) => (
                    <div key={month}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        {MONTH_NAMES[parseInt(month) - 1]}
                      </h3>
                      <div className="space-y-1.5">
                        {people
                          .sort((a, b) => a.day - b.day)
                          .map((person) => (
                            <div
                              key={person.id}
                              className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={person.profilePictureUrl} />
                                  <AvatarFallback className="text-sm font-semibold">
                                    {person.fullname?.[0]?.toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{person.fullname}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatBirthday(person.month, person.day)}
                                  </p>
                                </div>
                              </div>
                              <Button size="sm" variant="ghost">
                                <Gift className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* No friends */}
          {enriched.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Gift className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">{t('friends.birthdays.noFriends.title')}</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                {t('friends.birthdays.noFriends.desc')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
