import { memo, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { appService } from '../../services/appService'

export default memo(function PhonePeReturnPage() {
  const [sp] = useSearchParams()
  const orderId = sp.get('orderId') || ''
  const [msg, setMsg] = useState('Syncing payment…')

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!orderId) {
        if (alive) setMsg('Missing order id.')
        return
      }
      try {
        if (!alive) return
        await appService.orders.phonePeSync(Number(orderId))
        if (!alive) return
        setMsg('Payment synced. You can close this tab.')
      } catch {
        if (alive) setMsg('Could not sync payment. Please go back and try again.')
      }
    })()
    return () => {
      alive = false
    }
  }, [orderId])

  return (
    <div className="auth-page" style={{ minHeight: '40vh' }}>
      <p style={{ color: 'var(--text, #e8ecf4)', margin: 0 }}>{msg}</p>
    </div>
  )
})

