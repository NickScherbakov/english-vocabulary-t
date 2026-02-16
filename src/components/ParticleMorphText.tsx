import { useEffect, useRef } from 'react'

interface ParticleMorphTextProps {
  textA: string
  textB: string
  showB: boolean
  colorA: string
  colorB: string
  style: 'dust' | 'smoke' | 'water' | 'none'
  className?: string
}

const COUNTS: Record<string, number> = { dust: 900, smoke: 550, water: 750 }
const SCATTER_MS = 480
const CONVERGE_MS = 580
const FONT = '"Crimson Pro", Georgia, serif'

interface P {
  x: number; y: number
  ox: number; oy: number   // origin (captured at transition start)
  hx: number; hy: number   // home (target in current text)
  sx: number; sy: number   // scatter (cloud position)
  size: number
  angle: number
  rotSpeed: number
  wobblePhase: number
}

function easeOutCubic(t: number) { return 1 - (1 - t) ** 3 }
function easeInQuad(t: number) { return t * t }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function sampleText(
  text: string, w: number, h: number, count: number
): [number, number][] {
  if (!text || w < 10 || h < 10) return []

  const cw = Math.round(w)
  const ch = Math.round(h)
  const c = document.createElement('canvas')
  c.width = cw
  c.height = ch
  const ctx = c.getContext('2d')!

  let fs = Math.min(ch * 0.38, 80)
  ctx.font = `bold ${Math.round(fs)}px ${FONT}`
  const measured = ctx.measureText(text).width
  if (measured > cw * 0.85) fs *= (cw * 0.85) / measured
  fs = Math.max(14, fs)
  ctx.font = `bold ${Math.round(fs)}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(text, cw / 2, ch / 2)

  const id = ctx.getImageData(0, 0, cw, ch)
  const d = id.data
  const px: [number, number][] = []
  const step = Math.max(1, Math.round(Math.sqrt((cw * ch) / (count * 6))))

  for (let y = 0; y < ch; y += step) {
    for (let x = 0; x < cw; x += step) {
      if (d[(y * cw + x) * 4 + 3] > 80) px.push([x, y])
    }
  }

  if (!px.length) return []

  // Fisher-Yates shuffle for even distribution
  for (let i = px.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    ;[px[i], px[j]] = [px[j], px[i]]
  }

  const out: [number, number][] = []
  for (let i = 0; i < count; i++) {
    if (i < px.length) {
      out.push(px[i])
    } else {
      const s = px[i % px.length]
      out.push([s[0] + (Math.random() - 0.5) * 3, s[1] + (Math.random() - 0.5) * 3])
    }
  }
  return out
}

export function ParticleMorphText({
  textA, textB, showB, colorA, colorB, style, className = '',
}: ParticleMorphTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const propsRef = useRef({ textA, textB, showB, colorA, colorB, style })
  propsRef.current = { textA, textB, showB, colorA, colorB, style }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let frameId = 0
    let particles: P[] = []
    let targetsA: [number, number][] = []
    let targetsB: [number, number][] = []
    let prevTextA = ''
    let prevTextB = ''
    let prevShowB = propsRef.current.showB
    let transitioning = false
    let tStart = 0
    let transFromColor = ''
    let transToColor = ''
    let prevW = 0
    let prevH = 0

    function makeParticles(
      targets: [number, number][], w: number, h: number, st: string
    ) {
      const count = COUNTS[st] || 800
      const cx = w / 2
      const cy = h / 2
      const sizes: [number, number] =
        st === 'dust' ? [1.5, 3.5] : st === 'smoke' ? [4, 10] : [2, 5]

      particles = []
      for (let i = 0; i < count; i++) {
        const t = targets[i] || [cx, cy]
        const ang = Math.random() * Math.PI * 2
        const dist = 50 + Math.random() * 100
        const startX = cx + Math.cos(ang) * dist
        const startY = cy + Math.sin(ang) * dist

        particles.push({
          x: startX, y: startY,
          ox: startX, oy: startY,
          hx: t[0], hy: t[1],
          sx: startX, sy: startY,
          size: sizes[0] + Math.random() * (sizes[1] - sizes[0]),
          angle: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.04,
          wobblePhase: Math.random() * Math.PI * 2,
        })
      }
      // Skip scatter, start from converge
      transitioning = true
      tStart = performance.now() - SCATTER_MS
    }

    function startMorph(
      newShowB: boolean, w: number, h: number, st: string,
      fromCol: string, toCol: string
    ) {
      const newTargets = newShowB ? targetsB : targetsA
      if (newTargets.length === 0) return // translation not loaded

      const cx = w / 2
      const cy = h / 2
      const scatterDist = Math.min(w, h) * 0.35

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.ox = p.x
        p.oy = p.y
        const nt = newTargets[i] || [cx, cy]
        p.hx = nt[0]
        p.hy = nt[1]
        const ang = Math.random() * Math.PI * 2
        const dist = 30 + Math.random() * scatterDist
        p.sx = cx + Math.cos(ang) * dist
        p.sy = cy + Math.sin(ang) * dist

        if (st === 'smoke') {
          p.sy -= 40 + Math.random() * 60
          p.sx += (Math.random() - 0.5) * 100
        } else if (st === 'water') {
          p.sy += 20 + Math.random() * 50
        }
      }
      transFromColor = fromCol
      transToColor = toCol
      transitioning = true
      tStart = performance.now()
    }

    function animate() {
      const props = propsRef.current
      const cvs = canvasRef.current
      if (!cvs || props.style === 'none') {
        frameId = requestAnimationFrame(animate)
        return
      }

      const ctx = cvs.getContext('2d')
      if (!ctx) return

      const w = cvs.offsetWidth
      const h = cvs.offsetHeight
      if (w <= 0 || h <= 0) {
        frameId = requestAnimationFrame(animate)
        return
      }

      const dpr = window.devicePixelRatio || 1
      const dprW = Math.round(w * dpr)
      const dprH = Math.round(h * dpr)
      if (cvs.width !== dprW || cvs.height !== dprH) {
        cvs.width = dprW
        cvs.height = dprH
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const dimsChanged = prevW !== w || prevH !== h
      if (dimsChanged) { prevW = w; prevH = h }

      const count = COUNTS[props.style] || 800
      const textAChanged = props.textA !== prevTextA
      const textBChanged = props.textB !== prevTextB

      if (textAChanged || dimsChanged) {
        targetsA = sampleText(props.textA, w, h, count)
        prevTextA = props.textA
      }
      if (textBChanged || dimsChanged) {
        targetsB = sampleText(props.textB, w, h, count)
        prevTextB = props.textB
      }

      // Initialize on first valid frame
      if (particles.length === 0 && (targetsA.length > 0 || targetsB.length > 0)) {
        const initial = props.showB ? targetsB : targetsA
        makeParticles(initial, w, h, props.style)
        transFromColor = props.showB ? props.colorB : props.colorA
        transToColor = transFromColor
        prevShowB = props.showB
      }

      // New word arrived: re-scatter to new text
      if ((textAChanged || textBChanged) && particles.length > 0) {
        const targets = props.showB ? targetsB : targetsA
        const cx = w / 2
        const cy = h / 2
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          const t = targets[i] || [cx, cy]
          const ang = Math.random() * Math.PI * 2
          const dist = 40 + Math.random() * 80
          p.ox = cx + Math.cos(ang) * dist
          p.oy = cy + Math.sin(ang) * dist
          p.x = p.ox; p.y = p.oy
          p.hx = t[0]; p.hy = t[1]
          p.sx = p.ox; p.sy = p.oy
        }
        transitioning = true
        tStart = performance.now() - SCATTER_MS
        transFromColor = props.showB ? props.colorB : props.colorA
        transToColor = transFromColor
        prevShowB = props.showB
      }

      // Alternation toggle: full morph (scatter → converge)
      if (prevShowB !== props.showB && !textAChanged && !textBChanged) {
        const fromCol = prevShowB ? props.colorB : props.colorA
        const toCol = props.showB ? props.colorB : props.colorA
        startMorph(props.showB, w, h, props.style, fromCol, toCol)
        prevShowB = props.showB
      }

      // ---- Update positions ----
      const now = performance.now()

      if (transitioning) {
        const elapsed = now - tStart
        if (elapsed >= SCATTER_MS + CONVERGE_MS) {
          transitioning = false
          for (const p of particles) { p.x = p.hx; p.y = p.hy }
        } else if (elapsed < SCATTER_MS) {
          const t = easeInQuad(elapsed / SCATTER_MS)
          for (const p of particles) {
            p.x = lerp(p.ox, p.sx, t)
            p.y = lerp(p.oy, p.sy, t)
          }
        } else {
          const t = easeOutCubic((elapsed - SCATTER_MS) / CONVERGE_MS)
          for (const p of particles) {
            p.x = lerp(p.sx, p.hx, t)
            p.y = lerp(p.sy, p.hy, t)
          }
        }
      } else {
        const time = now * 0.001
        for (const p of particles) {
          p.x = p.hx + Math.sin(time * 0.8 + p.wobblePhase) * 1.2
          p.y = p.hy + Math.cos(time * 0.6 + p.wobblePhase * 1.3) * 1.0
        }
      }

      // ---- Determine color & opacity ----
      let color: string
      let baseOpacity = 1

      if (transitioning) {
        const elapsed = now - tStart
        if (elapsed < SCATTER_MS) {
          color = transFromColor
          baseOpacity = lerp(1, 0.35, easeInQuad(elapsed / SCATTER_MS))
        } else {
          color = transToColor
          baseOpacity = lerp(0.35, 1, easeOutCubic((elapsed - SCATTER_MS) / CONVERGE_MS))
        }
      } else {
        color = props.showB ? props.colorB : props.colorA
      }

      // ---- Render ----
      const st = props.style

      if (st === 'dust') {
        ctx.fillStyle = color
        for (const p of particles) {
          ctx.globalAlpha = baseOpacity
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(transitioning ? p.angle + now * p.rotSpeed * 0.01 : p.angle)
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
          ctx.restore()
        }
      } else if (st === 'smoke') {
        ctx.fillStyle = color
        for (const p of particles) {
          const elapsed = transitioning ? now - tStart : 0
          const growFactor = transitioning
            ? 1 + Math.sin(elapsed / (SCATTER_MS + CONVERGE_MS) * Math.PI) * 0.6
            : 1
          ctx.globalAlpha = baseOpacity * 0.7
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * growFactor, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        // water
        ctx.fillStyle = color
        for (const p of particles) {
          ctx.globalAlpha = baseOpacity * 0.85
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
          // highlight ring
          ctx.globalAlpha = baseOpacity * 0.25
          ctx.strokeStyle = color
          ctx.lineWidth = 0.7
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size + 1.2, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      ctx.globalAlpha = 1
      frameId = requestAnimationFrame(animate)
    }

    document.fonts.ready.then(() => {
      frameId = requestAnimationFrame(animate)
    })

    return () => { cancelAnimationFrame(frameId) }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        width: '100%',
        height: '100%',
        display: style === 'none' ? 'none' : 'block',
      }}
    />
  )
}
