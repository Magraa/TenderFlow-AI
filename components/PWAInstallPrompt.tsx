'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Download, X, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    setIsStandalone(isStandaloneMode)
    if (isStandaloneMode) return

    // Check if user dismissed prompt recently (in the last 7 days)
    const lastDismissed = localStorage.getItem('pwa_prompt_dismissed')
    if (lastDismissed && Date.now() - parseInt(lastDismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
      return
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    setIsIOS(isIosDevice)

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // On iOS, if not standalone, we can optionally show the install hint
    if (isIosDevice && !isStandaloneMode) {
      setShowPrompt(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true)
      return
    }

    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-5 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 md:left-auto md:right-6">
      <div className="flex flex-col rounded-xl border border-blue-200 bg-white p-4 shadow-xl shadow-blue-900/10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-200/80 p-1 shadow-sm">
              <Image
                src="/icons/icon-192x192.png"
                alt="TenderFlow AI"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Install TenderFlow AI</h4>
              <p className="text-xs text-slate-500">
                Install as an app for fast offline access &amp; smoother experience
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showIOSInstructions ? (
          <div className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 border border-slate-200">
            <p className="flex items-center gap-1.5 font-medium text-slate-800">
              Tap <Share className="inline h-3.5 w-3.5 text-blue-600" /> Share, then tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>
            </p>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Not now
            </Button>
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="gap-1.5 bg-blue-600 text-xs font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" />
              Install App
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
