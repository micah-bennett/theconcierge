import { useEffect } from 'react'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function initScrollReveal() {
  const hidden = document.querySelectorAll<HTMLElement>('.motion-reveal:not(.motion-reveal--visible)')

  if (prefersReducedMotion()) {
    hidden.forEach((el) => el.classList.add('motion-reveal--visible'))
    return () => {}
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('motion-reveal--visible')
        observer.unobserve(entry.target)
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  )

  hidden.forEach((el) => observer.observe(el))

  return () => observer.disconnect()
}

function initHeroParallax() {
  if (prefersReducedMotion()) return () => {}

  const image = document.querySelector<HTMLElement>('.home-hero__img')
  const media = document.querySelector<HTMLElement>('.home-hero__media')
  if (!image || !media) return () => {}

  let frame = 0

  const update = () => {
    frame = 0
    const rect = media.getBoundingClientRect()
    const viewHeight = window.innerHeight

    if (rect.bottom < 0 || rect.top > viewHeight) return

    const progress = (viewHeight - rect.top) / (viewHeight + rect.height)
    const shift = (progress - 0.5) * 28
    image.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0) scale(1.04)`
  }

  const onScroll = () => {
    if (frame) return
    frame = window.requestAnimationFrame(update)
  }

  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })

  return () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    window.cancelAnimationFrame(frame)
    image.style.transform = ''
  }
}

export function useSiteMotion(routeKey: string) {
  useEffect(() => {
    const cleanupReveal = initScrollReveal()
    const cleanupParallax = routeKey === '/' ? initHeroParallax() : () => {}

    return () => {
      cleanupReveal()
      cleanupParallax()
    }
  }, [routeKey])
}
