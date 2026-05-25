'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { MapPin, Navigation, X, Search } from 'lucide-react';
import type { PostLocation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LocationPickerProps {
  value?: PostLocation;
  onChange: (location: PostLocation | undefined) => void;
}

let mapsLoaded = false;

async function loadMapsPlaces() {
  if (!mapsLoaded) {
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
      v: 'weekly',
    });
  }
  await importLibrary('places');
  mapsLoaded = true;
}

type PickerTab = 'search' | 'coordinate';

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PickerTab>('search');
  const [searchValue, setSearchValue] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(mapsLoaded);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const placesAttrRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mapsLoaded) return;
    loadMapsPlaces()
      .then(() => setMapsReady(true))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!mapsReady || !open) return;
    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    }
    if (!placesServiceRef.current && placesAttrRef.current) {
      placesServiceRef.current = new google.maps.places.PlacesService(placesAttrRef.current);
    }
  }, [mapsReady, open]);

  const fetchSuggestions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || input.length < 2) {
      setSuggestions([]);
      return;
    }
    setSuggestLoading(true);
    autocompleteServiceRef.current.getPlacePredictions({ input }, (results, status) => {
      setSuggestLoading(false);
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    });
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['place_id', 'name', 'geometry', 'address_components', 'formatted_address'],
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;

        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();

        let city: string | undefined;
        let country: string | undefined;
        place.address_components?.forEach((comp) => {
          if (
            comp.types.includes('locality') ||
            comp.types.includes('administrative_area_level_1')
          ) {
            if (!city) city = comp.long_name;
          }
          if (comp.types.includes('country')) {
            country = comp.long_name;
          }
        });

        const location: PostLocation = {
          googlePlaceId: place.place_id,
          locationType: 'PLACE',
          displayName: place.name,
          latitude: lat,
          longitude: lng,
          city,
          country,
        };

        onChange(location);
        setOpen(false);
        setSearchValue('');
        setSuggestions([]);
      }
    );
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
        setOpen(false);
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
    <div className="relative">
      {/* Hidden div for PlacesService attribution */}
      <div ref={placesAttrRef} className="hidden" />

      {/* Trigger */}
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

      {/* Picker panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false);
              setSuggestions([]);
              setSearchValue('');
            }}
          />
          <div className="absolute bottom-full mb-2 left-0 z-50 w-80 bg-card border rounded-xl shadow-xl overflow-hidden">
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
                  {!mapsReady ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Đang tải Google Maps...
                    </p>
                  ) : (
                    <>
                      <Input
                        autoFocus
                        placeholder="Tìm tên địa điểm..."
                        value={searchValue}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="h-8 text-sm"
                      />
                      {suggestLoading && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Đang tìm...
                        </p>
                      )}
                      {suggestions.length > 0 && (
                        <div className="space-y-0.5 max-h-48 overflow-y-auto">
                          {suggestions.map((s) => (
                            <button
                              key={s.place_id}
                              type="button"
                              onClick={() => handleSelectPrediction(s)}
                              className="w-full text-left px-2 py-2 rounded-lg hover:bg-accent transition-colors text-xs cursor-pointer"
                            >
                              <div className="flex items-start gap-2">
                                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                                <div>
                                  <p className="font-medium leading-tight">
                                    {s.structured_formatting.main_text}
                                  </p>
                                  <p className="text-muted-foreground mt-0.5">
                                    {s.structured_formatting.secondary_text}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
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
          </div>
        </>
      )}
    </div>
  );
}
