import { memo } from 'react'
import { SewCanvasBoot } from './SewCanvasBoot'

import tailorLogo from '../assets/tailor-logo.png'
import './BootSplash.css'

export type BootWakePhase = 'starting' | 'health' | 'welcome'

type Props = {
  sewLowMotion?: boolean
  message?: string | null
  tagline?: string | null
  wakePhase: BootWakePhase
  exiting: boolean
}

function statusForPhase(phase: BootWakePhase, hasWelcomeCopy: boolean): string {
  if (phase === 'starting') return 'Reaching your studio…'
  if (phase === 'health') return 'First stitch…'
  if (hasWelcomeCopy) return 'Opening the workshop…'
  return 'Fetching your welcome…'
}

export const BootSplash = memo(function BootSplash({
  sewLowMotion = false,
  message,
  tagline,
  wakePhase,
  exiting,
}: Props) {
  const hasWelcomeCopy = !!(message || tagline)

  return (
    <div
      className={`ts-boot${exiting ? ' ts-boot--exit' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
    >
      <div className="ts-boot__grain" aria-hidden />
      <div className="ts-boot__bg-sheen" aria-hidden />

      {wakePhase === 'starting' && (
        <div className="ts-boot__canvas-wrap">
          <SewCanvasBoot mode="cut" lowMotion={sewLowMotion} />
        </div>
      )}
      {wakePhase === 'health' && (
        <div className="ts-boot__canvas-wrap">
          <SewCanvasBoot mode="sew" lowMotion={sewLowMotion} />
        </div>
      )}
      {wakePhase === 'welcome' && (
        <div className="ts-boot__logo-shell" aria-hidden>
            <span className="ts-boot__orbit" />
            <span className="ts-boot__orbit ts-boot__orbit--slow" />
            <div className="ts-boot__logo-wrap">
              <img src={tailorLogo} alt="" className="ts-boot__logo" width={88} height={88} decoding="async" />
              <div className="ts-boot__needle" />
              <svg className="ts-boot__thread" viewBox="0 0 128 40">
                <path d="M8 28 Q32 8 64 28 T120 28" />
              </svg>
              <svg className="ts-boot__thread ts-boot__thread--ghost" viewBox="0 0 128 40">
                <path d="M4 32 Q40 4 72 32 T124 20" />
              </svg>
            </div>
          </div>
      )}

          <div className="ts-boot__text">
            <h1 className="ts-boot__title" key={message || 'default'}>
              {message || 'Tailor Studio'}
            </h1>
            <p className={`ts-boot__tagline${hasWelcomeCopy ? ' ts-boot__tagline--visible' : ''}`}>
              {tagline || 'Your measurements, orders, and team — in one place.'}
            </p>
            <p className="ts-boot__status">{statusForPhase(wakePhase, hasWelcomeCopy)}</p>
            <div className="ts-boot__dots" aria-hidden>
              <span />
              <span />
              <span />
            </div>
          </div>
    </div>
  )
})
