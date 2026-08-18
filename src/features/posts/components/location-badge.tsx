import { MapPin, X } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import type { LocationResolution } from '../types/location';

/**
 * A resolved location, shown as a chip: place name, an optional link out to Google Maps and
 * an optional clear button.
 *
 * The Maps URL comes straight from the backend's `googleMapsUrl`. The legacy component
 * rebuilt that link in the browser from `locationType` + city/country + placeId; that logic
 * is deleted rather than ported, because the backend already owns it
 * (`GoogleMapsUrlBuilder`) and two implementations of one URL scheme drift. It is nullable —
 * a place resolved by name may have no coordinates — so the name renders as plain text when
 * there is no link.
 */
export interface LocationBadgeProps {
  location: LocationResolution;
  /** Renders a clear button when provided. */
  onClear?: () => void;
  /** Label for the clear button (i18n lives with the caller). */
  clearLabel?: string;
  /** Tooltip/label for the Maps link. */
  mapsLabel?: string;
  className?: string;
}

/**
 * `display_name` is the fullest label Gemini returns; city/country are the fallbacks, and a
 * pure coordinate fix may have none of them.
 */
export function locationLabel(location: LocationResolution): string {
  const { display_name: displayName, city, country } = location.locationDetails;
  // `display_name` wins; otherwise city/country, and a coordinate-only fix has neither, so
  // fall back to the resolution type rather than rendering an empty chip.
  return displayName ?? ([city, country].filter(Boolean).join(', ') || location.locationType);
}

export function LocationBadge({
  location,
  onClear,
  clearLabel,
  mapsLabel,
  className,
}: LocationBadgeProps) {
  const label = locationLabel(location);

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-nx-full',
        'bg-nx-surface-sunken px-2.5 py-1 text-nx-body-sm text-nx-text-secondary',
        className
      )}
    >
      <MapPin className="size-3.5 shrink-0 text-nx-text-muted" aria-hidden />

      {location.googleMapsUrl ? (
        <a
          href={location.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={mapsLabel}
          className="truncate text-nx-text-link hover:text-nx-text-link-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
        >
          {label}
        </a>
      ) : (
        <span className="truncate">{label}</span>
      )}

      {onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={clearLabel}
          className="shrink-0 rounded-nx-full text-nx-text-muted transition-colors duration-[var(--nx-duration-fast)] hover:text-nx-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-focus-ring"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}
