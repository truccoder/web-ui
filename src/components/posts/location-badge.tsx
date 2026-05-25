'use client';

import { MapPin } from 'lucide-react';
import { useState } from 'react';
import type { PostLocation } from '@/lib/types';
import { cn } from '@/lib/utils';

interface LocationBadgeProps {
  location: PostLocation;
  className?: string;
}

function buildGoogleMapsUrl(location: PostLocation): string {
  const { locationType, latitude, longitude, googlePlaceId, displayName, city, country } = location;

  if (locationType === 'COORDINATE' && latitude !== undefined && longitude !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  if (locationType === 'PLACE') {
    const query = [displayName, city, country].filter(Boolean).join(', ');
    const base = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    return googlePlaceId ? `${base}&query_place_id=${googlePlaceId}` : base;
  }

  if (locationType === 'REGION') {
    const query = [city, country].filter(Boolean).join(', ') || displayName || '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  return 'https://maps.google.com';
}

function getLocationLabel(location: PostLocation): { primary: string; secondary?: string } {
  const { locationType, displayName, city, country } = location;

  if (locationType === 'COORDINATE') {
    return { primary: 'Vị trí' };
  }

  if (locationType === 'PLACE') {
    return {
      primary: displayName ?? 'Địa điểm',
      secondary: city ?? country,
    };
  }

  if (locationType === 'REGION') {
    return { primary: city ?? displayName ?? country ?? 'Khu vực' };
  }

  return { primary: 'Vị trí' };
}

export function LocationBadge({ location, className }: LocationBadgeProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const { primary, secondary } = getLocationLabel(location);
  const mapsUrl = buildGoogleMapsUrl(location);

  const handleRedirect = () => {
    const { latitude, longitude, googlePlaceId, locationType } = location;

    let nativeUrl: string | null = null;
    if (locationType === 'COORDINATE' && latitude !== undefined && longitude !== undefined) {
      nativeUrl = `comgooglemaps://?q=${latitude},${longitude}&zoom=15`;
    } else if (locationType === 'PLACE' && googlePlaceId) {
      nativeUrl = `comgooglemaps://?q=${encodeURIComponent(primary)}&zoom=15`;
    } else if (locationType === 'REGION') {
      nativeUrl = `comgooglemaps://?q=${encodeURIComponent(primary)}&zoom=12`;
    }

    if (nativeUrl) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = nativeUrl;
      document.body.appendChild(iframe);
      setTimeout(() => {
        document.body.removeChild(iframe);
        window.open(mapsUrl, '_blank');
      }, 800);
    } else {
      window.open(mapsUrl, '_blank');
    }

    setShowConfirm(false);
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className={cn(
          'inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition-colors group cursor-pointer',
          className
        )}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 group-hover:scale-110 transition-transform" />
        <span className="font-medium">{primary}</span>
        {secondary && <span className="text-muted-foreground font-normal">{secondary}</span>}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border rounded-2xl shadow-xl p-6 mx-4 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Mở Google Maps?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {primary}
                  {secondary ? `, ${secondary}` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 text-sm rounded-lg border hover:bg-accent transition-colors cursor-pointer"
              >
                Huỷ
              </button>
              <button
                onClick={handleRedirect}
                className="flex-1 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer font-medium"
              >
                Mở Maps
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
