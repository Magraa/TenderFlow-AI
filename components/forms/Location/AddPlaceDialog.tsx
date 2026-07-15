'use client';

import { useEffect, useState } from 'react';
import { LocalBodyType, PlaceMapping } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { locationService } from '@/services/locationService';

interface AddPlaceDialogProps {
  open: boolean;
  initialName: string;
  place?: PlaceMapping | null;
  onOpenChange: (open: boolean) => void;
  onCreated: (place: PlaceMapping) => void;
  onUpdated?: (place: PlaceMapping) => void;
}

export function AddPlaceDialog({ open, initialName, place, onOpenChange, onCreated, onUpdated }: AddPlaceDialogProps) {
  const [englishName, setEnglishName] = useState(initialName);
  const [hindiName, setHindiName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [districtHindiName, setDistrictHindiName] = useState('');
  const [stateName, setStateName] = useState('Madhya Pradesh');
  const [stateHindiName, setStateHindiName] = useState('मध्य प्रदेश');
  const [bodyTypes, setBodyTypes] = useState<LocalBodyType[]>([]);
  const [selectedBodyTypeId, setSelectedBodyTypeId] = useState('');
  const [customLocalBodyType, setCustomLocalBodyType] = useState('');
  const [customLocalBodyTypeHindi, setCustomLocalBodyTypeHindi] = useState('');

  useEffect(() => {
    if (!open) return;
    setEnglishName(place?.englishName || initialName);
    setHindiName(place?.hindiName || '');
    setDistrictName(place?.districtName || '');
    setDistrictHindiName(place?.districtHindiName || '');
    setStateName(place?.stateName || 'Madhya Pradesh');
    setStateHindiName(place?.stateHindiName || 'मध्य प्रदेश');
    setCustomLocalBodyType(place?.localBodyType || '');
    setCustomLocalBodyTypeHindi(place?.localBodyTypeHindi || '');
  }, [initialName, open, place]);

  useEffect(() => {
    if (!open) return;
    locationService.listLocalBodyTypes().then((loadedBodyTypes) => {
      setBodyTypes(loadedBodyTypes);
      const matchingBodyType = loadedBodyTypes.find(
        (bodyType) =>
          bodyType.englishName === place?.localBodyType || bodyType.hindiName === place?.localBodyTypeHindi
      );
      setSelectedBodyTypeId(matchingBodyType?.id || (place?.localBodyType || place?.localBodyTypeHindi ? 'other' : loadedBodyTypes[0]?.id || ''));
    });
  }, [open, place]);

  const handleSave = async () => {
    const selectedBodyType = bodyTypes.find((bodyType) => bodyType.id === selectedBodyTypeId);
    const placeData = {
      englishName: englishName.trim() || initialName.trim(),
      hindiName: hindiName.trim(),
      districtName: districtName.trim(),
      districtHindiName: districtHindiName.trim(),
      stateName: stateName.trim() || 'Madhya Pradesh',
      stateHindiName: stateHindiName.trim(),
      localBodyType: selectedBodyTypeId === 'other' ? customLocalBodyType.trim() : selectedBodyType?.englishName || '',
      localBodyTypeHindi:
        selectedBodyTypeId === 'other' ? customLocalBodyTypeHindi.trim() : selectedBodyType?.hindiName || '',
    };

    if (place) {
      const updatedPlace = await locationService.updatePlaceMapping(place.id, placeData);
      if (updatedPlace) onUpdated?.(updatedPlace);
    } else {
      const createdPlace = await locationService.createPlaceMapping(placeData);
      onCreated(createdPlace);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{place ? 'Edit Place' : 'Add Place'}</DialogTitle>
          <DialogDescription>Save a reusable place, district, and local body mapping.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 p-6">
          <div className="grid gap-2">
            <Label htmlFor="newPlaceEnglish">English Name *</Label>
            <Input id="newPlaceEnglish" value={englishName} onChange={(event) => setEnglishName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newPlaceHindi">Hindi Name</Label>
            <Input id="newPlaceHindi" value={hindiName} onChange={(event) => setHindiName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newLocalBodyType">Local Body Type</Label>
            <select
              id="newLocalBodyType"
              className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={selectedBodyTypeId}
              onChange={(event) => setSelectedBodyTypeId(event.target.value)}
            >
              {bodyTypes.map((bodyType) => (
                <option key={bodyType.id} value={bodyType.id}>
                  {bodyType.hindiName ? `${bodyType.hindiName} (${bodyType.englishName})` : bodyType.englishName}
                </option>
              ))}
              <option value="other">Other</option>
            </select>
          </div>
          {selectedBodyTypeId === 'other' && (
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="newCustomLocalBodyEnglish">Other English</Label>
                <Input
                  id="newCustomLocalBodyEnglish"
                  value={customLocalBodyType}
                  onChange={(event) => setCustomLocalBodyType(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newCustomLocalBodyHindi">Other Hindi</Label>
                <Input
                  id="newCustomLocalBodyHindi"
                  value={customLocalBodyTypeHindi}
                  onChange={(event) => setCustomLocalBodyTypeHindi(event.target.value)}
                />
              </div>
            </div>
          )}
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="newDistrictEnglish">District *</Label>
              <Input
                id="newDistrictEnglish"
                value={districtName}
                onChange={(event) => setDistrictName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newDistrictHindi">District Hindi</Label>
              <Input
                id="newDistrictHindi"
                value={districtHindiName}
                onChange={(event) => setDistrictHindiName(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="newStateEnglish">State</Label>
              <Input id="newStateEnglish" value={stateName} onChange={(event) => setStateName(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newStateHindi">State Hindi</Label>
              <Input
                id="newStateHindi"
                value={stateHindiName}
                onChange={(event) => setStateHindiName(event.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={!englishName.trim() || !districtName.trim()}>
            {place ? 'Save Changes' : 'Save Place'}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
