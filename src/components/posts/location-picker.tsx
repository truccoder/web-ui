'use client';

import { useRef, useState } from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { MapPin, Navigation, X, Search, Loader2 } from 'lucide-react';
import type { PostLocation, LocationResolutionResponse } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useResolveLocation } from '@/lib/hooks/use-location';
import { getErrorMessage } from '@/lib/api/error';

interface LocationPickerProps {
  value?: PostLocation;
  onChange: (location: PostLocation | undefined) => void;
}

type PickerTab = 'search' | 'coordinate';

function toPostLocation(candidate: LocationResolutionResponse): PostLocation {
  return {
    googlePlaceId: candidate.googlePlaceId,
    locationType: candidate.locationType,
    displayName: candidate.locationDetails.display_name,
    latitude: candidate.locationDetails.latitude,
    longitude: candidate.locationDetails.longitude,
    city: candidate.locationDetails.city,
    country: candidate.locationDetails.country,
  };
}

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PickerTab>('search');
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<LocationResolutionResponse[]>([]);
  const [gpsLoading, setGpsLoading] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const {
    mutate: resolveLocation,
    isPending: resolving,
    error: resolveError,
  } = useResolveLocation();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery('');
      setCandidates([]);
    }
  };

  const handleSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setCandidates([]);
    resolveLocation(trimmed, {
      onSuccess: (data) => setCandidates(data),
    });
  };

  const handleSelectCandidate = (candidate: LocationResolutionResponse) => {
    onChange(toPostLocation(candidate));
    handleOpenChange(false);
  };

  const handleUseGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const location: PostLocation = {
          locationType: 'COORDINATE',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        onChange(location);
        setGpsLoading(false);
        handleOpenChange(false);
      },
      () => {
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
  };

  const getValueLabel = () => {
    if (!value) return null;
    if (value.locationType === 'COORDINATE') return 'Vị trí hiện tại';
    if (value.locationType === 'PLACE') return value.displayName ?? 'Địa điểm';
    return value.city ?? value.displayName ?? 'Khu vực';
  };

  const valueLabel = getValueLabel();

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      {/* Trigger wrapper. NOTE: must NOT be `display: contents` — an element with no box
          geometry returns a zero-size rect at (0,0) from getBoundingClientRect(), which is
          exactly why the popup was anchoring to the page's top-left corner before this. */}
      <div ref={triggerRef}>
        {valueLabel ? (
          <div className="inline-flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="font-medium max-w-48 truncate">{valueLabel}</span>
            <button
              type="button"
              onClick={handleClear}
              className="ml-0.5 hover:text-blue-800 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-full px-3 py-1.5 hover:border-foreground/40 transition-colors cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5" />
            Thêm địa điểm
          </button>
        )}
      </div>

      {/* Picker panel — portaled to document.body so it can never be clipped by an
          ancestor's overflow-hidden (e.g. the composer Card). */}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          anchor={triggerRef}
          side="bottom"
          align="start"
          sideOffset={8}
          className="z-50 outline-none"
        >
          <PopoverPrimitive.Popup className="w-80 bg-card border rounded-xl shadow-xl overflow-hidden outline-none">
            {/* Tabs */}
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => setTab('search')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors cursor-pointer',
                  tab === 'search'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Search className="h-3.5 w-3.5" />
                Tìm địa điểm
              </button>
              <button
                type="button"
                onClick={() => setTab('coordinate')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors cursor-pointer',
                  tab === 'coordinate'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Navigation className="h-3.5 w-3.5" />
                Vị trí của tôi
              </button>
            </div>

            <div className="p-3">
              {tab === 'search' ? (
                <div className="space-y-2">
                  <div className="flex gap-1.5">
                    <Input
                      autoFocus
                      placeholder="Mô tả địa điểm..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSearch();
                        }
                      }}
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-3 shrink-0"
                      disabled={resolving || !query.trim()}
                      onClick={handleSearch}
                    >
                      {resolving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Search className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Nhập tên địa điểm, địa chỉ, hoặc khu vực rồi nhấn Enter
                  </p>
                  {resolveError && (
                    <p className="text-xs text-destructive">
                      {getErrorMessage(resolveError, 'Không thể xác định địa điểm này')}
                    </p>
                  )}
                  {candidates.length > 0 && (
                    <div className="space-y-0.5 max-h-48 overflow-y-auto">
                      {candidates.map((candidate) => (
                        <button
                          key={candidate.googlePlaceId}
                          type="button"
                          onClick={() => handleSelectCandidate(candidate)}
                          className="w-full text-left px-2 py-2 rounded-lg hover:bg-accent transition-colors text-xs cursor-pointer"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="font-medium leading-tight">
                                {candidate.locationDetails.display_name ??
                                  candidate.locationDetails.city ??
                                  'Địa điểm'}
                              </p>
                              {(candidate.locationDetails.city ||
                                candidate.locationDetails.country) && (
                                <p className="text-muted-foreground mt-0.5">
                                  {[
                                    candidate.locationDetails.city,
                                    candidate.locationDetails.country,
                                  ]
                                    .filter(Boolean)
                                    .join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    disabled={gpsLoading}
                    onClick={handleUseGPS}
                  >
                    <Navigation className="h-4 w-4" />
                    {gpsLoading ? 'Đang lấy vị trí...' : 'Dùng vị trí hiện tại'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Trình duyệt sẽ yêu cầu quyền truy cập vị trí
                  </p>
                </div>
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
