'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { PlaceMapping } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { locationService, LocationSuggestion } from '@/services/locationService';
import { AddPlaceDialog } from './AddPlaceDialog';

interface LocationSearchInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (place: PlaceMapping) => void;
}

export function LocationSearchInput({ id, value, onChange, onSelect }: LocationSearchInputProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    locationService.searchPlaces(value).then((results) => {
      if (!cancelled) setSuggestions(results);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const showMenu = useMemo(() => focused && value.trim().length > 0, [focused, value]);

  const handleSelect = async (place: PlaceMapping) => {
    onChange(place.hindiName || place.englishName);
    onSelect(place);
    setFocused(false);
    await locationService.markPlaceUsed(place);
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search place in English or Hindi"
          autoComplete="off"
          required
        />
        <Button type="button" variant="outline" className="h-10 w-10 px-0" onClick={() => setAddOpen(true)} title="Add place">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showMenu && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {suggestions.length > 0 ? (
            suggestions.map(({ place }) => (
              <button
                key={place.id}
                type="button"
                className="flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(place)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900">
                    {place.hindiName || place.englishName}
                    {place.englishName && place.hindiName ? ` (${place.englishName})` : ''}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {place.districtHindiName || place.districtName}
                    {place.districtName ? `, ${place.stateName}` : ''}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {`Add "${value.trim()}"`}
            </button>


          )}
        </div>
      )}

      <AddPlaceDialog
        open={addOpen}
        initialName={value}
        onOpenChange={setAddOpen}
        onCreated={(place) => {
          onChange(place.hindiName || place.englishName);
          onSelect(place);
        }}
      />
    </div>
  );
}
