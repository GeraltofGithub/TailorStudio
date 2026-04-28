import { useMemo } from 'react'

import { useToast } from '../context/ToastContext'

export function useAppToast() {
  const { showToast } = useToast()

  return useMemo(
    () => ({
      showToast,
      success: (message: string) => showToast('success', message),
      error: (message: string) => showToast('error', message),
    }),
    [showToast],
  )
}

