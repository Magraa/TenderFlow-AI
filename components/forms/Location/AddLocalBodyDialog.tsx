'use client';

import { useState } from 'react';
import { LocalBodyType } from '@/types';
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

interface AddLocalBodyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (bodyType: LocalBodyType) => void;
}

export function AddLocalBodyDialog({ open, onOpenChange, onCreated }: AddLocalBodyDialogProps) {
  const [englishName, setEnglishName] = useState('');
  const [hindiName, setHindiName] = useState('');

  const handleSave = async () => {
    const bodyType = await locationService.createLocalBodyType({
      englishName: englishName.trim(),
      hindiName: hindiName.trim(),
    });
    onCreated(bodyType);
    setEnglishName('');
    setHindiName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Local Body Type</DialogTitle>
          <DialogDescription>Save a reusable local body label.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 p-6">
          <div className="grid gap-2">
            <Label htmlFor="localBodyEnglish">English Name *</Label>
            <Input id="localBodyEnglish" value={englishName} onChange={(event) => setEnglishName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="localBodyHindi">Hindi Name</Label>
            <Input id="localBodyHindi" value={hindiName} onChange={(event) => setHindiName(event.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={!englishName.trim()}>
            Save Type
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
