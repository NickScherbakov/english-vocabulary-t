import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  opacity: number
  targetX: number
  targetY: number
  angle: number
  speed: number
}

interface ParticleTextProps {
  text: string
  isVisible: boolean
  color: string
  style: 'dust' | 'smoke' | 'water' | 'none'
  className?: string
}

export function ParticleText({ text, isVisible, color, style, className = '' }: ParticleTextProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationFrameRef = useRef<number>(0)
  const prevVisibleRef = useRef<boolean>(isVisible)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  useEffect(() => {
    if (style === 'none' || !text) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    if (isVisible && !prevVisibleRef.current) {
      ctx.font = 'bold 72px "Crimson Pro", serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const textWidth = ctx.measureText(text).width

      particlesRef.current = []

      const particleCount = style === 'dust' ? 300 : style === 'smoke' ? 200 : 250
      
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2
        const distance = 150 + Math.random() * 100
        const baseSpeed = style === 'dust' ? 3.5 : style === 'smoke' ? 2.5 : 4
        const speed = baseSpeed + Math.random() * 2
        
        const targetX = centerX + (Math.random() - 0.5) * textWidth * 0.8
        const targetY = centerY + (Math.random() - 0.5) * 50
        
        const startX = centerX + Math.cos(angle) * distance
        const startY = centerY + Math.sin(angle) * distance
        
        particlesRef.current.push({
          x: startX,
          y: startY,
          vx: (targetX - startX) * 0.015,
          vy: (targetY - startY) * 0.015,
          life: 0,
          maxLife: 80,
          size: style === 'dust' ? Math.random() * 3 + 1.5 : style === 'smoke' ? Math.random() * 10 + 6 : Math.random() * 5 + 2,
          opacity: 0,
          targetX,
          targetY,
          angle: Math.random() * Math.PI * 2,
          speed,
        })
      }
    }

    prevVisibleRef.current = isVisible

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height)

      if (!isVisible && particlesRef.current.length > 0) {
        particlesRef.current = particlesRef.current.filter(p => {
          p.life++

          const spreadFactor = style === 'dust' ? 1.5 : style === 'smoke' ? 1.2 : 1.8
          p.vx *= 1.05
          p.vy *= 1.05
          
          if (style === 'smoke') {
            p.vy -= 0.2
            p.vx += (Math.random() - 0.5) * 0.3
          } else if (style === 'water') {
            p.vy += 0.25
          }
          
          p.x += p.vx * spreadFactor
          p.y += p.vy * spreadFactor
          
          p.opacity = Math.max(0, 1 - (p.life / 40))

          if (style === 'smoke') {
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 1.5)
            gradient.addColorStop(0, color.replace(')', ` / ${p.opacity * 0.6})`))
            gradient.addColorStop(0.5, color.replace(')', ` / ${p.opacity * 0.3})`))
            gradient.addColorStop(1, color.replace(')', ' / 0)'))
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size * (1 + p.life * 0.02), 0, Math.PI * 2)
            ctx.fill()
          } else if (style === 'water') {
            ctx.fillStyle = color.replace(')', ` / ${p.opacity * 0.8})`)
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fill()
            
            ctx.strokeStyle = color.replace(')', ` / ${p.opacity * 0.4})`)
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size + 1.5, 0, Math.PI * 2)
            ctx.stroke()
          } else {
            ctx.save()
            ctx.translate(p.x, p.y)
            ctx.rotate(p.angle + p.life * 0.1)
            ctx.fillStyle = color.replace(')', ` / ${p.opacity})`)
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
            ctx.restore()
          }

          return p.life < 50
        })
      } else if (isVisible) {
        particlesRef.current.forEach(p => {
          p.life++

          const convergeFactor = 0.12
          p.x += (p.targetX - p.x) * convergeFactor
          p.y += (p.targetY - p.y) * convergeFactor
          
          if (style === 'smoke') {
            p.x += Math.sin(p.life * 0.1) * 0.5
          } else if (style === 'water') {
            p.y += Math.sin(p.life * 0.15) * 0.3
          }
          
          p.opacity = Math.min(1, p.life / 25)

          if (style === 'smoke') {
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
            gradient.addColorStop(0, color.replace(')', ` / ${p.opacity * 0.7})`))
            gradient.addColorStop(0.6, color.replace(')', ` / ${p.opacity * 0.4})`))
            gradient.addColorStop(1, color.replace(')', ' / 0)'))
            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fill()
          } else if (style === 'water') {
            ctx.fillStyle = color.replace(')', ` / ${p.opacity * 0.7})`)
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
            ctx.fill()
            
            ctx.strokeStyle = color.replace(')', ` / ${p.opacity * 0.3})`)
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size + 1, 0, Math.PI * 2)
            ctx.stroke()
          } else {
            ctx.save()
            ctx.translate(p.x, p.y)
            ctx.rotate(p.angle)
            ctx.fillStyle = color.replace(')', ` / ${p.opacity})`)
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
            ctx.restore()
          }
        })
      }

      if (particlesRef.current.length > 0 || isVisible) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animate()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [text, isVisible, color, style])

  if (style === 'none') {
    return null
  }

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
