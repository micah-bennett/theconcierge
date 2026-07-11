import { useEffect, useRef, useState } from 'react'

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

type Props = {
  target: number
  suffix: string
  duration?: number
}

export function StatCounter({ target, suffix, duration = 1600 }: Props) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const animated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || animated.current) return
          animated.current = true
          const start = performance.now()
          function tick(now: number) {
            const progress = Math.min((now - start) / duration, 1)
            setValue(Math.round(easeOutQuart(progress) * target))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
          observer.unobserve(el)
        })
      },
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return (
    <span className="mkt-stat-card__num" ref={ref}>
      {value}
      <span>{suffix}</span>
    </span>
  )
}
