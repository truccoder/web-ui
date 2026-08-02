'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { Button, EmptyState, Input } from '@/shared/components';
import { getErrorMessage } from '@/shared/lib/api-error';
import { useT } from '@/core/i18n';
import { useResolveLocation } from '../hooks/use-location';
import type { LocationResolution, LocationResolutionRequest } from '../types/location';
import { LocationBadge, locationLabel } from './location-badge';

/**
 * Attach a place to a post: search by name, or resolve the browser's current coordinates.
 *
 * INLINE PANEL, NOT A POPOVER — deliberate. The design system specifies Dialog, Menu, Tooltip
 * and Toast, but **no popover/floating-panel primitive**, and the legacy picker had to fight
 * its own anchoring bug (a `display: contents` trigger measuring as a zero-size rect at the
 * page origin). Rather than invent an unspecified floating-layer primitive, the panel expands
 * in place: nothing to anchor, nothing to portal, nothing to clip.
 *
 * Debouncing lives here, not in the hook — `useResolveLocation` fires for whatever request
 * object it is handed, and resolution is a slow Gemini call, so the component decides when a
 * query is worth sending.
 */
export interface LocationPickerProps {
  value?: LocationResolution;
  onChange: (location: LocationResolution | undefined) => void;
}

const DEBOUNCE_MS = 500;
const MIN_QUERY = 3;

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [request, setRequest] = useState<LocationResolutionRequest | undefined>();
  const [gpsPending, setGpsPending] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const { data: candidates, isFetching, isError, error } = useResolveLocation(request);

  // Debounce the typed query into the request the hook actually fires on.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY) return;

    const timer = setTimeout(() => setRequest({ query: trimmed }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setRequest(undefined);
    setGpsError(null);
  };

  const select = (candidate: LocationResolution) => {
    onChange(candidate);
    close();
  };

  const useMyLocation = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError(t('createPost.location.gpsUnavailable'));
      return;
    }
    setGpsPending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsPending(false);
        setQuery('');
        // Hand the coordinates to the same endpoint rather than building a location object
        // locally: only the server can fill in display_name / city / country, and the legacy
        // picker's local shortcut is why GPS posts had no readable place name.
        setRequest({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setGpsPending(false);
        setGpsError(t('createPost.location.gpsDenied'));
      },
      { timeout: 10_000 }
    );
  };

  if (value) {
    return (
      <LocationBadge
        location={value}
        onClear={() => onChange(undefined)}
        clearLabel={t('createPost.location.clear')}
        mapsLabel={t('createPost.location.openInMaps')}
      />
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-nx-full border border-dashed border-nx-border-strong px-2.5 py-1 text-nx-body-sm text-nx-text-muted transition-colors duration-[var(--nx-duration-fast)] hover:border-nx-text-muted hover:text-nx-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
      >
        <MapPin className="size-3.5" aria-hidden />
        {t('createPost.location.add')}
      </button>
    );
  }

  // "No results" is only meaningful once a request has actually resolved. Note the common
  // failure is the error branch, not this one: an unplaceable query comes back 400 (measured),
  // while an empty 200 array only happens if every candidate failed to parse server-side.
  const resolved = candidates !== undefined && !isFetching;
  const noResults = resolved && candidates.length === 0;

  return (
    <div className="flex flex-col gap-2 rounded-nx-sm border border-nx-border-default bg-nx-surface-sunken p-3">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          size="sm"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('createPost.location.placeholder')}
          prefix={<Search />}
          aria-label={t('createPost.location.add')}
        />
        <Button
          size="sm"
          variant="secondary"
          className="shrink-0 whitespace-nowrap"
          icon={<Navigation />}
          loading={gpsPending}
          onClick={useMyLocation}
        >
          {t('createPost.location.myLocation')}
        </Button>
      </div>

      {isFetching && (
        <p className="flex items-center gap-2 py-2 text-nx-body-sm text-nx-text-muted">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {t('createPost.location.searching')}
        </p>
      )}

      {gpsError && (
        <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
          {gpsError}
        </p>
      )}

      {isError && (
        <p role="alert" className="text-nx-body-sm text-nx-status-danger-fg">
          {getErrorMessage(error)}
        </p>
      )}

      {noResults && (
        <EmptyState
          compact
          icon={null}
          title={t('createPost.location.notFoundTitle')}
          description={t('createPost.location.notFoundDesc')}
        />
      )}

      {resolved && candidates.length > 0 && (
        <ul className="flex flex-col">
          {candidates.map((candidate) => (
            <li key={candidate.googlePlaceId}>
              <button
                type="button"
                onClick={() => select(candidate)}
                className="flex w-full items-center gap-2 rounded-nx-sm px-2 py-2 text-left transition-colors duration-[var(--nx-duration-fast)] hover:bg-nx-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
              >
                <MapPin className="size-4 shrink-0 text-nx-text-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-nx-ui text-nx-text-primary">
                    {locationLabel(candidate)}
                  </span>
                  <span className="block text-nx-caption text-nx-text-muted">
                    {candidate.locationType}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={close}>
          {t('createPost.location.cancel')}
        </Button>
      </div>
    </div>
  );
}
