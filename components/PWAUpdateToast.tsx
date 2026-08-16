'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PWAUpdateToast() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [showUpdateToast, setShowUpdateToast] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    // Register service worker if in production
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // If there's already a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting)
          setShowUpdateToast(true)
        }

        // Listen for new workers
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker)
              setShowUpdateToast(true)
            }
          })
        })
      })
      .catch((err) => {
        console.debug('ServiceWorker registration not active in dev/unsupported:', err)
      })

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true
        window.location.reload()
      }
    })
  }, [])

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
    setShowUpdateToast(false)
  }

  const handleDismiss = () => {
    setShowUpdateToast(false)
  }

  if (!showUpdateToast) return null

  return (
    <div className="fixed top-5 right-4 z-50 max-w-sm animate-in fade-in slide-in-from-top-5 duration-300">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white p-3.5 shadow-xl shadow-blue-900/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">Update Available</p>
            <p className="text-[11px] text-slate-500">A new version of Tender Panel is ready</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={handleUpdate}
            className="h-7 gap-1 bg-blue-600 px-2.5 text-xs text-white hover:bg-blue-700"
          >
            <RefreshCw className="h-3 w-3" />
            Update
          </Button>
          <button
            onClick={handleDismiss}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss update"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
