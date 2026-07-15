'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AILocationResult, locationService } from '@/services/locationService';

interface AILocationHelperProps {
  placeName: string;
  onAIFill: (data: AILocationResult) => void;
}

export function AILocationHelper({ placeName, onAIFill }: AILocationHelperProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAutofill = async () => {
    setMessage('');
    setLoading(true);
    const result = await locationService.fetchDistrict(placeName);
    setLoading(false);

    if (!result) {
      setMessage('No confident match found.');
      return;
    }

    onAIFill(result);
    setMessage(`${Math.round(result.confidence * 100)}% confidence`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={loading}
        onClick={handleAutofill}
        disabled={!placeName.trim() || loading}
      >
        {!loading && <Sparkles className="mr-2 h-4 w-4" />}
        Auto-fill
      </Button>
      {message && <span className="text-xs text-slate-500">{message}</span>}
    </div>
  );
}
