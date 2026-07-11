'use client';

import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useResolveLocation } from '@/lib/hooks/use-location';
import { getErrorMessage } from '@/lib/api/error';
import { useT } from '@/lib/i18n';
import type { LocationResolutionResponse } from '@/lib/types';

interface EventLocationInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function EventLocationInput({ value, onChange }: EventLocationInputProps) {
  const t = useT();
  const [candidates, setCandidates] = useState<LocationResolutionResponse[]>([]);
  const [open, setOpen] = useState(false);
  const { mutate: resolveLocation, isPending, error } = useResolveLocation();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2) return;

    setCandidates([]);
    resolveLocation(trimmed, {
      onSuccess: (data) => {
        setCandidates(data);
        setOpen(true);
      },
    });
  };

  const handleSelect = (candidate: LocationResolutionResponse) => {
    onChange(candidate.locationDetails.display_name ?? candidate.locationDetails.city ?? value);
    setOpen(false);
    setCandidates([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          placeholder={t('createPost.event.location')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pr-7"
        />
        {isPending && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && (
        <p className="text-xs text-destructive mt-1">
          {getErrorMessage(error, t('createPost.event.locationError'))}
        </p>
      )}

      {open && candidates.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-card border rounded-lg shadow-xl overflow-hidden max-h-48 overflow-y-auto">
            {candidates.map((c) => (
              <button
                key={c.googlePlaceId}
                type="button"
                onClick={() => handleSelect(c)}
                className="w-full text-left px-2.5 py-2 text-xs hover:bg-accent transition-colors cursor-pointer flex items-start gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium leading-tight">
                    {c.locationDetails.display_name ?? c.locationDetails.city ?? '—'}
                  </p>
                  {(c.locationDetails.city || c.locationDetails.country) && (
                    <p className="text-muted-foreground mt-0.5">
                      {[c.locationDetails.city, c.locationDetails.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
