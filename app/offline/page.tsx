'use client'

import Link from 'next/link'
import { WifiOff, RefreshCw, Home, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md border-slate-200 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <WifiOff className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-900">
            You Are Currently Offline
          </CardTitle>
          <CardDescription className="text-sm text-slate-600">
            This page hasn&apos;t been cached yet. However, your saved tenders and bills are stored locally on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600 border border-slate-200">
            <p className="font-semibold text-slate-800 mb-1">Local-First Ready</p>
            <p>
              You can continue viewing and creating tenders or bills offline. Your changes will automatically sync to the cloud once your connection is restored.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleReload}
              variant="default"
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Connection
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
              >
                <Home className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <Link
                href="/tenders"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-slate-700 shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
              >
                <FileText className="h-3.5 w-3.5" />
                Tenders
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
