import { memo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

export const LegacyRedirect = memo(function LegacyRedirect({ to }: { to: string }) {
  const loc = useLocation()
  return <Navigate to={`${to}${loc.search || ''}`} replace />
})

