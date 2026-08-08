'use client';

import { useEffect, useState } from 'react';
import { pdfDownloadFolder } from '@/services/pdfDownloadFolder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PdfDownloadFolderCard() {
  const [supported, setSupported] = useState(true);
  const [folderName, setFolderName] = useState<string | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    const isSupported = pdfDownloadFolder.isSupported();
    setSupported(isSupported);
    if (!isSupported) return;

    const stored = await pdfDownloadFolder.getStoredHandle();
    if (!stored) {
      setFolderName(null);
      setNeedsReconnect(false);
      return;
    }
    setFolderName(stored.name);
    const active = await pdfDownloadFolder.getActiveFolder();
    setNeedsReconnect(!active);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleChoose = async () => {
    setBusy(true);
    setError('');
    try {
      const handle = await pdfDownloadFolder.chooseFolder();
      if (handle) {
        setFolderName(handle.name);
        setNeedsReconnect(false);
      }
    } catch (err) {
      // User cancelled the picker — not an error worth surfacing.
      if (err instanceof Error && err.name !== 'AbortError') {
        setError('Could not access that folder.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReconnect = async () => {
    setBusy(true);
    setError('');
    try {
      const handle = await pdfDownloadFolder.requestFolderPermission();
      setNeedsReconnect(!handle);
      if (!handle) setError('Access was not granted. Choose the folder again to re-enable it.');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      await pdfDownloadFolder.clearFolder();
      setFolderName(null);
      setNeedsReconnect(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>PDF Downloads</CardTitle>
        <CardDescription>Where &quot;Download PDF&quot; saves generated files on this device.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!supported ? (
          <p className="text-sm text-slate-500">
            This browser doesn&apos;t support choosing a save folder. PDFs will go to your browser&apos;s default
            Downloads folder instead. This feature works in Chrome or Edge.
          </p>
        ) : (
          <>
            <div className="rounded-md border border-slate-200 p-3 text-sm">
              {folderName ? (
                <>
                  <p className="font-medium text-slate-800">Saving to: {folderName}</p>
                  {needsReconnect && (
                    <p className="mt-1 text-amber-600">
                      Access to this folder was lost (e.g. after closing the browser). Reconnect to keep using it.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-slate-500">
                  Not set — PDFs will go to your browser&apos;s default Downloads folder.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleChoose} loading={busy} disabled={busy}>
                {folderName ? 'Change Folder' : 'Choose Folder'}
              </Button>
              {needsReconnect && (
                <Button type="button" size="sm" variant="outline" onClick={handleReconnect} disabled={busy}>
                  Reconnect Access
                </Button>
              )}
              {folderName && (
                <Button type="button" size="sm" variant="outline" onClick={handleClear} disabled={busy}>
                  Use Browser Default Instead
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
