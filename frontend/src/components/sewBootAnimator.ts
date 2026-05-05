import type { SewTheme } from './sewCanvasTheme'

export const SEW_BOOT_TOTAL_MS = 6000

const W = 680
const H = 420

const phases = [
  { name: 'shirt' as const, start: 0, end: 1500 },
  { name: 'cut' as const, start: 1500, end: 3000 },
  { name: 'sew' as const, start: 3000, end: 5000 },
  { name: 'done' as const, start: 5000, end: 6000 },
]

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}
function easeIn(t: number): number {
  return t * t * t
}
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

function phaseT(name: (typeof phases)[number]['name'], ms: number): number {
  const p = phases.find((x) => x.name === name)!
  return clamp01((ms - p.start) / (p.end - p.start))
}

function installRoundRectPolyfill() {
  if (typeof CanvasRenderingContext2D === 'undefined') return
  const P = CanvasRenderingContext2D.prototype as unknown as {
    roundRect?: (x: number, y: number, w: number, h: number, r: number) => void
  }
  if (typeof P.roundRect === 'function') return
  P.roundRect = function (this: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const rr = Math.min(Math.max(0, r), w / 2, h / 2)
    this.beginPath()
    this.moveTo(x + rr, y)
    this.arcTo(x + w, y, x + w, y + h, rr)
    this.arcTo(x + w, y + h, x, y + h, rr)
    this.arcTo(x, y + h, x, y, rr)
    this.arcTo(x, y, x + w, y, rr)
    this.closePath()
  }
}

installRoundRectPolyfill()

function drawSparkles(ctx: CanvasRenderingContext2D, t: number, cx: number, cy: number, count: number, color: string) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + t * 3
    const r = 30 + Math.sin(t * 6 + i) * 10
    const x = cx + Math.cos(a) * r
    const y = cy + Math.sin(a) * r
    const s = 2 + Math.sin(t * 8 + i) * 1.5
    ctx.beginPath()
    ctx.arc(x, y, s, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.globalAlpha = 0.6 + Math.sin(t * 5 + i) * 0.4
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

function drawShirtPhase(ctx: CanvasRenderingContext2D, theme: SewTheme, t: number) {
  const reveal = easeOut(clamp01(t * 1.5))
  const cx = 340
  const cy = 210

  ctx.save()
  ctx.globalAlpha = reveal

  const scale = 0.6 + 0.4 * reveal
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)
  ctx.translate(-cx, -cy)

  ctx.beginPath()
  ctx.moveTo(cx - 70, cy - 80)
  ctx.lineTo(cx - 90, cy - 60)
  ctx.lineTo(cx - 80, cy + 80)
  ctx.lineTo(cx + 80, cy + 80)
  ctx.lineTo(cx + 90, cy - 60)
  ctx.lineTo(cx + 70, cy - 80)
  ctx.lineTo(cx + 30, cy - 80)
  ctx.quadraticCurveTo(cx, cy - 50, cx - 30, cy - 80)
  ctx.closePath()
  ctx.fillStyle = theme.fabric
  ctx.fill()
  ctx.strokeStyle = theme.fabricStroke
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx - 70, cy - 80)
  ctx.lineTo(cx - 120, cy - 40)
  ctx.lineTo(cx - 100, cy + 10)
  ctx.lineTo(cx - 80, cy - 20)
  ctx.closePath()
  ctx.fillStyle = theme.fabricMid
  ctx.fill()
  ctx.strokeStyle = theme.fabricStroke
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx + 70, cy - 80)
  ctx.lineTo(cx + 120, cy - 40)
  ctx.lineTo(cx + 100, cy + 10)
  ctx.lineTo(cx + 80, cy - 20)
  ctx.closePath()
  ctx.fillStyle = theme.fabricMid
  ctx.fill()
  ctx.strokeStyle = theme.fabricStroke
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx - 30, cy - 80)
  ctx.quadraticCurveTo(cx, cy - 50, cx + 30, cy - 80)
  ctx.strokeStyle = '#f9fbfc'
  ctx.lineWidth = 2
  ctx.stroke()

  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.arc(cx, cy - 30 + i * 28, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#f9fbfc'
    ctx.fill()
  }

  ctx.restore()

  if (t > 0.3) {
    const dt = (t - 0.3) / 0.7
    drawSparkles(ctx, dt, cx, cy, 8, theme.sparkle)
  }

  if (t > 0.5) {
    ctx.save()
    ctx.globalAlpha = easeOut((t - 0.5) * 2)
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.fillStyle = theme.fabricStroke
    ctx.textAlign = 'center'
    ctx.fillText('fabric ready', cx, cy + 130)
    ctx.restore()
  }
}

function drawScissors(ctx: CanvasRenderingContext2D, theme: SewTheme, x: number, y: number, angle: number, open: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  const o = open * 0.35

  ctx.save()
  ctx.rotate(-o)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(55, -6)
  ctx.lineTo(55, 6)
  ctx.closePath()
  ctx.fillStyle = theme.metal
  ctx.fill()
  ctx.strokeStyle = theme.metalStroke
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(-14, 0, 12, 0, Math.PI * 2)
  ctx.strokeStyle = theme.metalStroke
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.restore()

  ctx.save()
  ctx.rotate(o)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(55, -6)
  ctx.lineTo(55, 6)
  ctx.closePath()
  ctx.fillStyle = mix(theme.metal, '#ffffff', 0.08)
  ctx.fill()
  ctx.strokeStyle = theme.metalStroke
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(-14, 0, 12, 0, Math.PI * 2)
  ctx.strokeStyle = theme.metalStroke
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.restore()

  ctx.beginPath()
  ctx.arc(0, 0, 5, 0, Math.PI * 2)
  ctx.fillStyle = theme.machineBody
  ctx.fill()

  ctx.restore()
}

function mix(a: string, b: string, t: number): string {
  const pa = a.match(/^#?([0-9a-f]{6})$/i)
  const pb = b.match(/^#?([0-9a-f]{6})$/i)
  if (!pa || !pb) return a
  const A = pa[1]
  const B = pb[1]
  const ri = (s: string, o: number) => parseInt(s.slice(o, o + 2), 16)
  const r = ri(A, 0) + (ri(B, 0) - ri(A, 0)) * t
  const g = ri(A, 2) + (ri(B, 2) - ri(A, 2)) * t
  const bl = ri(A, 4) + (ri(B, 4) - ri(A, 4)) * t
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(bl)}`
}

function drawCutPhase(ctx: CanvasRenderingContext2D, theme: SewTheme, ms: number, t: number) {
  const inT = easeOut(clamp01(t * 2))
  const cx = 340
  const cy = 210

  ctx.save()
  ctx.globalAlpha = 0.25 * inT
  drawShirtPhase(ctx, theme, 1)
  ctx.restore()

  const lineProgress = easeInOut(clamp01((t - 0.1) / 0.8))
  const lineX1 = cx - 100
  const lineX2 = cx + 100
  const lineY = cy

  ctx.save()
  ctx.globalAlpha = inT * 0.8
  ctx.beginPath()
  ctx.moveTo(lineX1, lineY)
  ctx.lineTo(lerp(lineX1, lineX2, lineProgress), lineY)
  ctx.strokeStyle = theme.cut
  ctx.lineWidth = 2.5
  ctx.setLineDash([8, 4])
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  const scissorX = lerp(lineX1 - 20, lineX2 + 20, easeInOut(clamp01((t - 0.05) / 0.85)))
  const scissorY = lineY
  const open = 0.5 + 0.5 * Math.sin(ms / 150)

  ctx.save()
  ctx.globalAlpha = inT
  drawScissors(ctx, theme, scissorX, scissorY, 0, open)
  ctx.restore()

  if (t > 0.5) {
    const sep = easeOut((t - 0.5) * 2) * 35
    ctx.save()
    ctx.globalAlpha = 0.7 * inT

    ctx.beginPath()
    ctx.rect(lineX1, lineY - 80 - sep, 200, 80)
    ctx.fillStyle = theme.fabricSoft
    ctx.fill()
    ctx.strokeStyle = theme.fabricMid
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.beginPath()
    ctx.rect(lineX1, lineY + sep, 200, 50)
    ctx.fillStyle = theme.fabricSoft
    ctx.fill()
    ctx.strokeStyle = theme.fabricMid
    ctx.lineWidth = 1.5
    ctx.stroke()

    ctx.restore()
  }

  if (t > 0.7) {
    ctx.save()
    ctx.globalAlpha = easeOut((t - 0.7) / 0.3)
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.fillStyle = theme.cutStroke
    ctx.textAlign = 'center'
    ctx.fillText('cutting...', cx, cy + 130)
    ctx.restore()
  }
}

function drawMachine(ctx: CanvasRenderingContext2D, theme: SewTheme, cx: number, cy: number, ms: number, needleY: number) {
  ctx.beginPath()
  ctx.ellipse(cx + 10, cy + 95, 120, 14, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.fill()

  ctx.beginPath()
  ctx.roundRect(cx - 140, cy + 55, 280, 42, 8)
  ctx.fillStyle = theme.machineBase
  ctx.fill()
  ctx.strokeStyle = theme.machineStroke
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.beginPath()
  ctx.roundRect(cx - 120, cy - 50, 60, 110, 10)
  ctx.fillStyle = theme.machineBody
  ctx.fill()
  ctx.strokeStyle = theme.machineStroke
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.beginPath()
  ctx.roundRect(cx - 120, cy - 80, 220, 38, 10)
  ctx.fillStyle = mix(theme.machineBody, theme.machineBase, 0.35)
  ctx.fill()
  ctx.strokeStyle = theme.machineStroke
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.beginPath()
  ctx.roundRect(cx - 125, cy - 100, 80, 28, 8)
  ctx.fillStyle = mix(theme.machineBody, theme.fabricStroke, 0.2)
  ctx.fill()
  ctx.strokeStyle = theme.machineStroke
  ctx.lineWidth = 1
  ctx.stroke()

  const wheelCx = cx + 100
  const wheelCy = cy + 20
  ctx.beginPath()
  ctx.arc(wheelCx, wheelCy, 36, 0, Math.PI * 2)
  ctx.fillStyle = theme.wheel
  ctx.fill()
  ctx.strokeStyle = theme.machineStroke
  ctx.lineWidth = 2
  ctx.stroke()
  const wAngle = ms / 300
  for (let i = 0; i < 4; i++) {
    const a = wAngle + (i * Math.PI) / 2
    ctx.beginPath()
    ctx.moveTo(wheelCx + Math.cos(a) * 28, wheelCy + Math.sin(a) * 28)
    ctx.lineTo(wheelCx - Math.cos(a) * 28, wheelCy - Math.sin(a) * 28)
    ctx.strokeStyle = theme.wheelSpoke
    ctx.lineWidth = 3
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(wheelCx, wheelCy, 9, 0, Math.PI * 2)
  ctx.fillStyle = theme.needle
  ctx.fill()
  ctx.beginPath()
  ctx.arc(wheelCx + Math.cos(wAngle) * 25, wheelCy + Math.sin(wAngle) * 25, 4, 0, Math.PI * 2)
  ctx.fillStyle = theme.threadGold
  ctx.fill()

  const ny = needleY
  ctx.beginPath()
  ctx.rect(cx - 95, cy - 45 + ny, 7, 55)
  ctx.fillStyle = theme.needle
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx - 95, cy + 10 + ny)
  ctx.lineTo(cx - 92, cy + 30 + ny)
  ctx.lineTo(cx - 89, cy + 10 + ny)
  ctx.closePath()
  ctx.fillStyle = mix(theme.needle, '#ffffff', 0.12)
  ctx.fill()

  ctx.beginPath()
  ctx.roundRect(cx - 106, cy + 14 + ny, 28, 7, 3)
  ctx.fillStyle = mix(theme.needle, theme.metalStroke, 0.25)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cx - 92, cy + 28 + ny)
  ctx.lineTo(cx - 92, cy + 57)
  ctx.strokeStyle = theme.threadGold
  ctx.lineWidth = 1.5
  ctx.globalAlpha = 0.7
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.ellipse(cx - 95, cy - 10, 8, 5, 0, 0, Math.PI * 2)
  ctx.fillStyle = theme.worklight
  ctx.fill()
  ctx.restore()

  ctx.beginPath()
  ctx.roundRect(cx - 115, cy + 52, 70, 8, 3)
  ctx.fillStyle = theme.machineStroke
  ctx.fill()
}

function drawSewPhase(ctx: CanvasRenderingContext2D, theme: SewTheme, ms: number, t: number) {
  const inT = easeOut(clamp01(t * 2))
  const cx = 340
  const cy = 200

  ctx.save()
  ctx.globalAlpha = inT
  ctx.beginPath()
  ctx.roundRect(cx - 200, cy + 52, 320, 16, 4)
  ctx.fillStyle = theme.fabric
  ctx.fill()
  for (let i = 0; i < 8; i++) {
    ctx.beginPath()
    ctx.moveTo(cx - 200 + i * 40, cy + 52)
    ctx.lineTo(cx - 200 + i * 40, cy + 68)
    ctx.strokeStyle = theme.fabricMid
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.restore()

  const stitchProgress = clamp01((t - 0.2) / 0.7)
  const stitchStart = cx - 180
  const stitchEnd = cx + 80
  ctx.save()
  ctx.globalAlpha = inT * 0.9
  for (let i = 0; i < 30; i++) {
    const sx = lerp(stitchStart, stitchEnd, i / 30)
    if (sx > lerp(stitchStart, stitchEnd, stitchProgress)) break
    if (i % 2 === 0) {
      ctx.beginPath()
      ctx.moveTo(sx, cy + 60)
      ctx.lineTo(sx + 12, cy + 60)
      ctx.strokeStyle = '#f9fbfc'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
  ctx.restore()

  const nBob = Math.sin(ms / 250) * 18
  const needleY = nBob > 0 ? nBob : 0

  ctx.save()
  ctx.globalAlpha = inT
  drawMachine(ctx, theme, cx, cy, ms, needleY)
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = inT
  ctx.beginPath()
  ctx.rect(cx + 75, cy - 110, 22, 38)
  ctx.fillStyle = theme.threadGold
  ctx.fill()
  ctx.beginPath()
  ctx.rect(cx + 70, cy - 114, 32, 8)
  ctx.fillStyle = mix(theme.threadGold, '#ffffff', 0.15)
  ctx.fill()
  ctx.beginPath()
  ctx.rect(cx + 70, cy - 76, 32, 8)
  ctx.fillStyle = mix(theme.threadGold, '#ffffff', 0.15)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + 86, cy - 106)
  ctx.quadraticCurveTo(cx + 20, cy - 120, cx - 60, cy - 80)
  ctx.quadraticCurveTo(cx - 80, cy - 65, cx - 92, cy - 45)
  ctx.strokeStyle = theme.threadGoldSoft
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 3])
  const dashOff = (-(ms / 100)) % 16
  ctx.lineDashOffset = dashOff
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  if (t > 0.6) {
    ctx.save()
    ctx.globalAlpha = easeOut((t - 0.6) / 0.4)
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.fillStyle = theme.title
    ctx.textAlign = 'center'
    ctx.fillText('sewing...', cx, cy + 130)
    ctx.restore()
  }
}

function drawDonePhase(ctx: CanvasRenderingContext2D, theme: SewTheme, t: number) {
  const cx = 340
  const cy = 200
  const popT = easeOut(clamp01(t * 2))

  ctx.save()
  ctx.globalAlpha = popT
  ctx.translate(cx, cy)

  const pulse = 1 + Math.sin(t * 8) * 0.02
  ctx.scale(pulse, pulse)
  ctx.translate(-cx, -cy)

  ctx.beginPath()
  ctx.arc(cx, cy, 110, 0, Math.PI * 2)
  ctx.fillStyle = theme.fabricSoft
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(cx - 75, cy - 90)
  ctx.lineTo(cx - 95, cy - 65)
  ctx.lineTo(cx - 85, cy + 85)
  ctx.lineTo(cx + 85, cy + 85)
  ctx.lineTo(cx + 95, cy - 65)
  ctx.lineTo(cx + 75, cy - 90)
  ctx.lineTo(cx + 35, cy - 90)
  ctx.quadraticCurveTo(cx, cy - 58, cx - 35, cy - 90)
  ctx.closePath()
  ctx.fillStyle = theme.fabricMid
  ctx.fill()
  ctx.strokeStyle = theme.fabricStroke
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx - 75, cy - 90)
  ctx.lineTo(cx - 130, cy - 45)
  ctx.lineTo(cx - 108, cy + 15)
  ctx.lineTo(cx - 85, cy - 15)
  ctx.closePath()
  ctx.fillStyle = theme.fabric
  ctx.fill()
  ctx.strokeStyle = theme.fabricStroke
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(cx + 75, cy - 90)
  ctx.lineTo(cx + 130, cy - 45)
  ctx.lineTo(cx + 108, cy + 15)
  ctx.lineTo(cx + 85, cy - 15)
  ctx.closePath()
  ctx.fillStyle = theme.fabric
  ctx.fill()
  ctx.strokeStyle = theme.fabricStroke
  ctx.lineWidth = 2
  ctx.stroke()

  for (let i = 0; i < 5; i++) {
    ctx.beginPath()
    ctx.moveTo(cx - 60 + i * 24, cy - 10)
    ctx.lineTo(cx - 50 + i * 24, cy - 10)
    ctx.strokeStyle = 'rgba(249,251,252,0.55)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.moveTo(cx - 35, cy - 90)
  ctx.quadraticCurveTo(cx, cy - 58, cx + 35, cy - 90)
  ctx.strokeStyle = '#f9fbfc'
  ctx.lineWidth = 2.5
  ctx.stroke()

  for (let i = 0; i < 4; i++) {
    ctx.beginPath()
    ctx.arc(cx, cy - 30 + i * 28, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#f9fbfc'
    ctx.fill()
    ctx.strokeStyle = theme.sparkle
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.restore()

  drawSparkles(ctx, t, cx - 100, cy - 80, 6, theme.threadGold)
  drawSparkles(ctx, t + 0.3, cx + 100, cy - 70, 6, theme.pinkSpark)
  drawSparkles(ctx, t + 0.6, cx, cy - 100, 5, theme.cyanSpark)

  if (t > 0.5) {
    const bt = easeOut((t - 0.5) * 2)
    ctx.save()
    ctx.globalAlpha = bt
    ctx.translate(cx + 90, cy - 90)
    ctx.scale(bt, bt)
    ctx.beginPath()
    ctx.arc(0, 0, 22, 0, Math.PI * 2)
    ctx.fillStyle = theme.check
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-10, 0)
    ctx.lineTo(-3, 8)
    ctx.lineTo(12, -8)
    ctx.strokeStyle = '#f9fbfc'
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.restore()
  }

  if (t > 0.55) {
    ctx.save()
    ctx.globalAlpha = easeOut((t - 0.55) / 0.45)
    ctx.font = 'bold 26px system-ui, sans-serif'
    ctx.fillStyle = theme.title
    ctx.textAlign = 'center'
    ctx.fillText('shirt complete!', cx, cy + 130)
    ctx.restore()
  }
}

function drawProgressDots(ctx: CanvasRenderingContext2D, theme: SewTheme, ms: number) {
  const total = ms % SEW_BOOT_TOTAL_MS
  const phase = phases.find((p) => total >= p.start && total < p.end) || phases[3]
  const colors = [theme.fabric, theme.cut, theme.sewAccent, theme.success]
  const cx = 340
  for (let i = 0; i < 4; i++) {
    const x = cx - 60 + i * 40
    const y = 20
    const active = phases[i].name === phase.name
    ctx.beginPath()
    ctx.arc(x, y, active ? 7 : 5, 0, Math.PI * 2)
    ctx.fillStyle = active ? colors[i] : theme.dotInactive
    ctx.fill()
    if (i < 3) {
      ctx.beginPath()
      ctx.moveTo(x + 7, y)
      ctx.lineTo(x + 33, y)
      ctx.strokeStyle = theme.dotLine
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }
}

/** Draw one frame of the boot sewing story (0 … SEW_BOOT_TOTAL_MS loop). */
export function drawSewBootFrame(ctx: CanvasRenderingContext2D, theme: SewTheme, ms: number) {
  ctx.clearRect(0, 0, W, H)

  const p1t = phaseT('shirt', ms)
  const p2t = phaseT('cut', ms)
  const p3t = phaseT('sew', ms)
  const p4t = phaseT('done', ms)

  if (ms < 1500) {
    drawShirtPhase(ctx, theme, p1t)
  } else if (ms < 3000) {
    const blend = clamp01((ms - 1500) / 300)
    if (blend < 1) {
      ctx.save()
      ctx.globalAlpha = 1 - easeIn(blend)
      drawShirtPhase(ctx, theme, 1)
      ctx.restore()
    }
    drawCutPhase(ctx, theme, ms, p2t)
  } else if (ms < 5000) {
    const blend = clamp01((ms - 3000) / 300)
    if (blend < 1) {
      ctx.save()
      ctx.globalAlpha = 1 - easeIn(blend)
      drawCutPhase(ctx, theme, ms, 1)
      ctx.restore()
    }
    drawSewPhase(ctx, theme, ms, p3t)
  } else {
    const blend = clamp01((ms - 5000) / 200)
    if (blend < 1) {
      ctx.save()
      ctx.globalAlpha = 1 - easeIn(blend)
      drawSewPhase(ctx, theme, ms, 1)
      ctx.restore()
    }
    drawDonePhase(ctx, theme, p4t)
  }

  drawProgressDots(ctx, theme, ms)
}

export function drawInfiniteCut(ctx: CanvasRenderingContext2D, theme: SewTheme, ms: number) {
  ctx.clearRect(0, 0, W, H)
  const cx = 340
  const cy = 210

  const lineX1 = cx - 100
  const lineX2 = cx + 100
  const lineY = cy

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(lineX1, lineY)
  ctx.lineTo(lineX2, lineY)
  ctx.strokeStyle = theme.cut
  ctx.lineWidth = 2.5
  ctx.setLineDash([8, 4])
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  const scissorX = lerp(lineX1 - 20, lineX2 + 20, 0.5 + 0.5 * Math.sin(ms / 600))
  const scissorY = lineY
  const open = 0.5 + 0.5 * Math.sin(ms / 120)

  ctx.save()
  drawScissors(ctx, theme, scissorX, scissorY, 0, open)
  ctx.restore()
}

export function drawInfiniteSew(ctx: CanvasRenderingContext2D, theme: SewTheme, ms: number) {
  ctx.clearRect(0, 0, W, H)
  const cx = 340
  const cy = 200

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(cx - 200, cy + 52, 320, 16, 4)
  ctx.fillStyle = theme.fabric
  ctx.fill()
  for (let i = 0; i < 8; i++) {
    ctx.beginPath()
    ctx.moveTo(cx - 200 + i * 40, cy + 52)
    ctx.lineTo(cx - 200 + i * 40, cy + 68)
    ctx.strokeStyle = theme.fabricMid
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.restore()

  const stitchProgress = 0.5 + 0.5 * Math.sin(ms / 800)
  const stitchStart = cx - 180
  const stitchEnd = cx + 80
  ctx.save()
  for (let i = 0; i < 30; i++) {
    const sx = lerp(stitchStart, stitchEnd, i / 30)
    if (sx > lerp(stitchStart, stitchEnd, stitchProgress)) break
    if (i % 2 === 0) {
      ctx.beginPath()
      ctx.moveTo(sx, cy + 60)
      ctx.lineTo(sx + 12, cy + 60)
      ctx.strokeStyle = '#f9fbfc'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }
  ctx.restore()

  const nBob = Math.sin(ms / 150) * 18
  const needleY = nBob > 0 ? nBob : 0

  ctx.save()
  drawMachine(ctx, theme, cx, cy, ms, needleY)
  ctx.restore()

  ctx.save()
  ctx.beginPath()
  ctx.rect(cx + 75, cy - 110, 22, 38)
  ctx.fillStyle = theme.threadGold
  ctx.fill()
  ctx.beginPath()
  ctx.rect(cx + 70, cy - 114, 32, 8)
  ctx.fillStyle = mix(theme.threadGold, '#ffffff', 0.15)
  ctx.fill()
  ctx.beginPath()
  ctx.rect(cx + 70, cy - 76, 32, 8)
  ctx.fillStyle = mix(theme.threadGold, '#ffffff', 0.15)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + 86, cy - 106)
  ctx.quadraticCurveTo(cx + 20, cy - 120, cx - 60, cy - 80)
  ctx.quadraticCurveTo(cx - 80, cy - 65, cx - 92, cy - 45)
  ctx.strokeStyle = theme.threadGoldSoft
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 3])
  const dashOff = (-(ms / 100)) % 16
  ctx.lineDashOffset = dashOff
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

export const SEW_BOOT_CANVAS_CSS_W = W
export const SEW_BOOT_CANVAS_CSS_H = H
