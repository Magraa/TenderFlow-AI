'use client';

import { useEffect } from 'react';

/**
 * Custom hook to lock body scrolling when a modal or dialog is open.
 * Works seamlessly across PC and Mobile without layout shifting.
 */
export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock || typeof window === 'undefined') return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [lock]);
}
