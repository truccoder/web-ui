'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, XCircle } from 'lucide-react';
import { useMagicLinkLogin } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function MagicLinkLoginContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { mutate: loginWithMagicLink, isPending, isError } = useMagicLinkLogin();

  useEffect(() => {
    if (token) loginWithMagicLink({ token });
  }, [token, loginWithMagicLink]);

  if (!token || isError) {
    return (
      <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2">
            <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Invalid link</CardTitle>
          <CardDescription>
            This magic link is invalid or has expired. Please request a new one.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/magic-link" className="w-full">
            <Button variant="outline" className="w-full">
              Request new link
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isPending ? 'Signing you in...' : 'Redirecting...'}
        </p>
      </CardContent>
    </Card>
  );
}

export default function MagicLinkLoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      }
    >
      <MagicLinkLoginContent />
    </Suspense>
  );
}
