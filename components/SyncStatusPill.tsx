'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SyncStatusSnapshot } from '@/services/sync/collectionSync';

const COLLECTION_LABELS: Record<string, string> = {
  tenders: 'Tenders',
  firms: 'Firms',
  documents: 'Documents',
  departmentProfiles: 'Department Profiles',
  customTemplates: 'Custom Templates',
  bills: 'Bills',
};

function describeStatus(online: boolean, totalPending: number): { label: string; dotClass: string } {
  if (!online) {
    return { label: totalPending > 0 ? `Offline · ${totalPending} queued` : 'Offline', dotClass: 'bg-gray-400' };
  }
  if (totalPending > 0) {
    return { label: `Syncing… ${totalPending}`, dotClass: 'bg-amber-500 animate-pulse' };
  }
  return { label: 'Synced', dotClass: 'bg-green-500' };
}

export function SyncStatusPill() {
  const enabled = Boolean((process.env.NEXT_PUBLIC_SYNC_COLLECTIONS || '').trim());
  const [status, setStatus] = useState<SyncStatusSnapshot | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let unsubStatus: (() => void) | undefined;
    let unsubOnline: (() => void) | undefined;

    (async () => {
      const collectionSync = await import('@/services/sync/collectionSync');
      const onlineStatus = await import('@/services/sync/onlineStatus');
      if (cancelled) return;

      const refresh = async () => {
        const snapshot = await collectionSync.getSyncStatus();
        if (!cancelled) setStatus(snapshot);
      };

      refresh();
      unsubStatus = collectionSync.onSyncStatusChange(refresh);
      unsubOnline = onlineStatus.onOnlineStatusChange(refresh);
    })();

    return () => {
      cancelled = true;
      unsubStatus?.();
      unsubOnline?.();
    };
  }, [enabled]);

  if (!enabled || !status) return null;

  const { online, totalPending, pendingByCollection } = status;
  const { label, dotClass } = describeStatus(online, totalPending);
  const collectionEntries = Object.entries(pendingByCollection).filter(([, count]) => (count || 0) > 0);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-md transition-shadow hover:shadow-lg"
      >
        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
        {label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync status</DialogTitle>
            <DialogDescription>
              Data is read from and written to this device first, then synced with Firestore in the background.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 p-6 pt-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Connection</span>
              <span className={`font-medium ${online ? 'text-green-600' : 'text-amber-600'}`}>
                {online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Pending changes</span>
              <span className="font-medium">{totalPending}</span>
            </div>
            {collectionEntries.length > 0 && (
              <div className="space-y-1.5 border-t border-gray-100 pt-3">
                {collectionEntries.map(([collectionName, count]) => (
                  <div key={collectionName} className="flex items-center justify-between text-xs text-gray-500">
                    <span>{COLLECTION_LABELS[collectionName] || collectionName}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
