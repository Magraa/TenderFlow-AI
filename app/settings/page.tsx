'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Firm, Settings } from '@/types';
import { dataService } from '@/services/dataService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedSettings, loadedFirms] = await Promise.all([
        dataService.settings.get(),
        dataService.firms.list(),
      ]);
      if (cancelled) return;
      setSettings(loadedSettings);
      setFirms(loadedFirms);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const updated = await dataService.settings.update({
      organizationName: settings.organizationName,
      departmentAddress: settings.departmentAddress,
      contactPerson: settings.contactPerson,
      email: settings.email,
      phone: settings.phone,
      defaultLanguage: settings.defaultLanguage,
      headerSafeZonePx: settings.headerSafeZonePx,
      tenderNumberPrefix: settings.tenderNumberPrefix,
    });
    setSettings(updated);
    setSaving(false);
    setSuccess('Settings saved.');
    setTimeout(() => setSuccess(''), 2500);
  };

  if (loading || !settings) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        {success && (
          <Alert variant="success">
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>General offline panel defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  value={settings.organizationName}
                  onChange={(event) => setSettings({ ...settings, organizationName: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="departmentAddress">Address</Label>
                <textarea
                  id="departmentAddress"
                  className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={settings.departmentAddress}
                  onChange={(event) => setSettings({ ...settings, departmentAddress: event.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person</Label>
                  <Input
                    id="contactPerson"
                    value={settings.contactPerson}
                    onChange={(event) => setSettings({ ...settings, contactPerson: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(event) => setSettings({ ...settings, phone: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(event) => setSettings({ ...settings, email: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenderNumberPrefix">Tender Prefix</Label>
                  <Input
                    id="tenderNumberPrefix"
                    value={settings.tenderNumberPrefix}
                    onChange={(event) => setSettings({ ...settings, tenderNumberPrefix: event.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleSave} loading={saving} disabled={saving}>
                Save Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Firms</CardTitle>
              <CardDescription>Letterhead-only firm profiles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/manage-firms">
                <Button>Open Manage Firms</Button>
              </Link>
              <div className="space-y-2">
                {firms.length === 0 ? (
                  <p className="text-sm text-slate-500">No firms configured.</p>
                ) : (
                  firms.map((firm) => (
                    <div key={firm.id} className="rounded border border-slate-200 p-3 text-sm">
                      <p className="font-medium">{firm.name}</p>
                      <p className="text-slate-500">
                        Header: {firm.headerSpacing}px, Footer: {firm.footerSpacing}px, Margins: {firm.pageMargin}px
                      </p>
                      <p className="text-slate-500">
                        fitMode: {firm.fitLetterheadMode}, style: {firm.firmStyleProfile}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
