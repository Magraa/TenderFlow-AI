'use client'

import React, { FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { dataService } from '@/services/dataService'
import {
  createPasswordAuthSettings,
  hasSitePassword,
  SITE_PASSWORD_SESSION_KEY,
  validateNewPassword,
  verifySitePassword,
} from '@/services/passwordAuthService'
import { Settings } from '@/types'
import type { SyncedCollectionName } from '@/services/localDb/indexedDb'
import { SyncStatusPill } from '@/components/SyncStatusPill'

export function Providers({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const loadedSettings = await dataService.settings.get()
        if (cancelled) return

        setSettings(loadedSettings)
        if (!hasSitePassword(loadedSettings)) {
          setUnlocked(false)
        } else if (sessionStorage.getItem(SITE_PASSWORD_SESSION_KEY) === loadedSettings.passwordAuth?.passwordHash) {
          setUnlocked(true)
        }
      } catch (err) {
        console.error('Unable to load password settings:', err)
        if (!cancelled) setError('Unable to load security settings.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!unlocked) return
    const enabled = (process.env.NEXT_PUBLIC_SYNC_COLLECTIONS || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean) as SyncedCollectionName[]
    if (enabled.length === 0) return
    import('@/services/sync/collectionSync').then(({ startAllSyncedCollections }) =>
      startAllSyncedCollections(enabled)
    )
  }, [unlocked])

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    if (!settings?.passwordAuth) return

    setSubmitting(true)
    setError('')
    try {
      const isValid = await verifySitePassword(password, settings.passwordAuth)
      if (!isValid) {
        setError('Incorrect password.')
        return
      }

      sessionStorage.setItem(SITE_PASSWORD_SESSION_KEY, settings.passwordAuth.passwordHash)
      setUnlocked(true)
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInitialSetup = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const validationError = validateNewPassword(newPassword)
      if (validationError) {
        setError(validationError)
        return
      }
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match.')
        return
      }

      const passwordAuth = await createPasswordAuthSettings(newPassword)
      const updated = await dataService.settings.update({ passwordAuth })
      sessionStorage.setItem(SITE_PASSWORD_SESSION_KEY, passwordAuth.passwordHash)
      setSettings(updated)
      setUnlocked(true)
      setNewPassword('')
      setConfirmPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="text-sm font-medium text-slate-600">Checking access...</p>
      </div>
    )
  }

  if (!unlocked) {
    const needsSetup = !hasSitePassword(settings)

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{needsSetup ? 'Set Website Password' : 'Private Website'}</CardTitle>
            <CardDescription>
              {needsSetup
                ? 'Create the password that will protect this panel.'
                : 'Enter the password to continue.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={needsSetup ? handleInitialSetup : handleLogin}>
              {needsSetup ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="initialPassword">New Password</Label>
                    <Input
                      id="initialPassword"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmInitialPassword">Confirm Password</Label>
                    <Input
                      id="confirmInitialPassword"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="sitePassword">Password</Label>
                  <Input
                    id="sitePassword"
                    type="password"
                    autoComplete="current-password"
                    autoFocus
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
              )}

              {error && <p className="text-sm font-medium text-red-600">{error}</p>}

              <Button type="submit" className="w-full" loading={submitting} disabled={submitting}>
                {needsSetup ? 'Save Password' : 'Unlock'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      {children}
      <SyncStatusPill />
    </>
  )
}
