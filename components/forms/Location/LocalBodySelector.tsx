'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { LocalBodyType } from '@/types';
import { Button } from '@/components/ui/button';
import { locationService } from '@/services/locationService';
import { AddLocalBodyDialog } from './AddLocalBodyDialog';

interface LocalBodySelectorProps {
  id: string;
  value: string;
  onChange: (bodyType: LocalBodyType | null) => void;
}

export function LocalBodySelector({ id, value, onChange }: LocalBodySelectorProps) {
  const [bodyTypes, setBodyTypes] = useState<LocalBodyType[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    locationService.listLocalBodyTypes().then(setBodyTypes);
  }, []);

  const handleSelect = async (idValue: string) => {
    const selected = bodyTypes.find((bodyType) => bodyType.id === idValue) || null;
    onChange(selected);
    if (selected) await locationService.markLocalBodyTypeUsed(selected);
  };

  return (
    <>
      <div className="flex gap-2">
        <select
          id={id}
          className="h-10 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={value}
          onChange={(event) => handleSelect(event.target.value)}
        >
          <option value="">Select local body type</option>
          {bodyTypes.map((bodyType) => (
            <option key={bodyType.id} value={bodyType.id}>
              {bodyType.hindiName ? `${bodyType.hindiName} (${bodyType.englishName})` : bodyType.englishName}
            </option>
          ))}
        </select>
        <Button type="button" variant="outline" className="h-10 w-10 px-0" onClick={() => setAddOpen(true)} title="Add local body type">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <AddLocalBodyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(bodyType) => {
          setBodyTypes((current) => [bodyType, ...current]);
          onChange(bodyType);
        }}
      />
    </>
  );
}
