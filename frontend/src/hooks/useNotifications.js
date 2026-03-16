import { useEffect, useCallback } from 'react'

export function useNotifications() {
  // Request permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const notify = useCallback((title, body, options = {}) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return
    // Only notify when tab is not focused
    if (document.visibilityState === 'visible') return
    new Notification(title, { body, icon: '/icon.png', ...options })
  }, [])

  return { notify }
}
