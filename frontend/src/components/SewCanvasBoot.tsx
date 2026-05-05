import { memo, useEffect, useRef } from 'react'

import { drawInfiniteCut, drawInfiniteSew, SEW_BOOT_CANVAS_CSS_H, SEW_BOOT_CANVAS_CSS_W } from './sewBootAnimator'
import { getSewTheme } from './sewCanvasTheme'

type Props = {
  mode: 'cut' | 'sew'
  lowMotion?: boolean
}

export const SewCanvasBoot = memo(function SewCanvasBoot({ mode, lowMotion = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const theme = getSewTheme()
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = Math.floor(SEW_BOOT_CANVAS_CSS_W * dpr)
    canvas.height = Math.floor(SEW_BOOT_CANVAS_CSS_H * dpr)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    let raf = 0
    let start: number | null = null
    let lastDraw = 0
    const throttleMs = lowMotion ? 100 : 0

    const frame = (t: number) => {
      if (start === null) start = t
      if (throttleMs > 0 && t - lastDraw < throttleMs) {
        raf = requestAnimationFrame(frame)
        return
      }
      lastDraw = t
      try {
        if (mode === 'cut') {
          drawInfiniteCut(ctx, theme, t - start)
        } else {
          drawInfiniteSew(ctx, theme, t - start)
        }
      } catch {
        /* ignore single-frame draw errors */
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [mode, lowMotion])

  return (
    <canvas
      ref={ref}
      className="ts-boot__sew-canvas"
      width={SEW_BOOT_CANVAS_CSS_W}
      height={SEW_BOOT_CANVAS_CSS_H}
      role="img"
      aria-label="Tailor Studio loading animation"
    />
  )
})
