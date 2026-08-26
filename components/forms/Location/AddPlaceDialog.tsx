'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
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

import { CustomDropdown } from '@/components/ui/customDropdown';

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

  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

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
    setAiMessage('');
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

  const handleAIFill = async () => {
    if (!englishName.trim()) return;
    setAiLoading(true);
    setAiMessage('');
    try {
      const query = stateName.trim() ? `${englishName.trim()}, ${stateName.trim()}` : englishName.trim();
      const result = await locationService.fetchDistrict(query);
      if (result) {
        if (result.hindiName) setHindiName(result.hindiName);
        if (result.districtName) setDistrictName(result.districtName);
        if (result.districtHindiName) setDistrictHindiName(result.districtHindiName);
        if (result.stateName) setStateName(result.stateName);
        if (result.stateHindiName) setStateHindiName(result.stateHindiName);
        
        if (result.localBodyType || result.localBodyTypeHindi) {
          const matchingBodyType = bodyTypes.find(
            (bt) =>
              bt.englishName.toLowerCase() === result.localBodyType?.toLowerCase() ||
              bt.hindiName.toLowerCase() === result.localBodyTypeHindi?.toLowerCase()
          );
          if (matchingBodyType) {
            setSelectedBodyTypeId(matchingBodyType.id);
          } else {
            setSelectedBodyTypeId('other');
            setCustomLocalBodyType(result.localBodyType || '');
            setCustomLocalBodyTypeHindi(result.localBodyTypeHindi || '');
          }
        }
        setAiMessage(`Success (${Math.round((result.confidence || 0.8) * 100)}% conf)`);
      } else {
        setAiMessage('No details found for this place.');
      }
    } catch {
      setAiMessage('AI Autofill error.');
    } finally {
      setAiLoading(false);
    }
  };

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
      <DialogContent className="max-w-lg w-full max-h-[92vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl p-0 flex flex-col overflow-hidden animate-slide-up-mobile sm:animate-none">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-slate-400/40 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

        <DialogHeader className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <DialogTitle className="text-base sm:text-lg font-bold text-slate-900">{place ? 'Edit Place' : 'Add Place'}</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">Save a reusable place, district, and local body mapping.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5 p-4 sm:p-6 overflow-y-auto max-h-[60vh] text-xs">
          <div className="flex justify-between items-center bg-blue-50/70 p-3 rounded-xl border border-blue-200/70 gap-2">
            <div className="text-xs text-blue-900 font-medium">
              Enter Name & State, then let AI fill the rest.
              {aiMessage && <span className="block mt-0.5 text-blue-600 font-semibold text-[10px]">{aiMessage}</span>}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white hover:text-white border-0 font-semibold text-xs rounded-lg shadow-xs h-8 px-3 shrink-0"
              loading={aiLoading}
              onClick={handleAIFill}
              disabled={!englishName.trim() || aiLoading}
            >
              {!aiLoading && <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
              AI Autofill
            </Button>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="newPlaceEnglish" className="text-xs font-semibold text-slate-700">English Name *</Label>
            <Input id="newPlaceEnglish" value={englishName} onChange={(event) => setEnglishName(event.target.value)} className="h-9 text-xs" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="newPlaceHindi" className="text-xs font-semibold text-slate-700">Hindi Name</Label>
            <Input id="newPlaceHindi" value={hindiName} onChange={(event) => setHindiName(event.target.value)} className="h-9 text-xs" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="newLocalBodyType" className="text-xs font-semibold text-slate-700">Local Body Type</Label>
            <CustomDropdown
              value={selectedBodyTypeId}
              onChange={(val) => setSelectedBodyTypeId(val)}
              options={[
                ...bodyTypes.map((bt) => ({
                  value: bt.id,
                  label: bt.hindiName ? `${bt.hindiName} (${bt.englishName})` : bt.englishName,
                })),
                { value: 'other', label: 'Other (Custom)' },
              ]}
              placeholder="Select Local Body..."
              buttonClassName="h-9 text-xs"
            />
          </div>

          {selectedBodyTypeId === 'other' && (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="newCustomLocalBodyEnglish" className="text-xs font-semibold text-slate-700">Other English</Label>
                <Input
                  id="newCustomLocalBodyEnglish"
                  value={customLocalBodyType}
                  onChange={(event) => setCustomLocalBodyType(event.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="newCustomLocalBodyHindi" className="text-xs font-semibold text-slate-700">Other Hindi</Label>
                <Input
                  id="newCustomLocalBodyHindi"
                  value={customLocalBodyTypeHindi}
                  onChange={(event) => setCustomLocalBodyTypeHindi(event.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>
          )}

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="newDistrictEnglish" className="text-xs font-semibold text-slate-700">District *</Label>
              <Input
                id="newDistrictEnglish"
                value={districtName}
                onChange={(event) => setDistrictName(event.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="newDistrictHindi" className="text-xs font-semibold text-slate-700">District Hindi</Label>
              <Input
                id="newDistrictHindi"
                value={districtHindiName}
                onChange={(event) => setDistrictHindiName(event.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="newStateEnglish" className="text-xs font-semibold text-slate-700">State</Label>
              <Input id="newStateEnglish" value={stateName} onChange={(event) => setStateName(event.target.value)} className="h-9 text-xs" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="newStateHindi" className="text-xs font-semibold text-slate-700">State Hindi</Label>
              <Input
                id="newStateHindi"
                value={stateHindiName}
                onChange={(event) => setStateHindiName(event.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs px-3">
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={!englishName.trim() || !districtName.trim()} className="h-8 text-xs px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            {place ? 'Save Changes' : 'Save Place'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
