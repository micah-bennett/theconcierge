import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * Home page hero carousel. Photos live in public/carousel (1600px and 900px
 * WebP). Styles: .hs-carousel in src/styles/hopSite.css.
 * Auto advances every 7s; pauses on hover, keyboard focus, hidden tab, and
 * for visitors who prefer reduced motion.
 */

type Slide = {
  id: string
  image: string
  alt: string
  eyebrow: string
  title: string
  lead: string
  primary: { to: string; label: string }
  secondary?: { to: string; label: string }
}

const SLIDES: ReadonlyArray<Slide> = [
  {
    id: 'on-site',
    image: 'on-site',
    alt: 'A HOP concierge in a navy vest hands a cup of coffee to a smiling nurse in a hospital hallway',
    eyebrow: 'Hospitality On-Site Professionals',
    title: 'Hospitality that helps people and workplaces thrive.',
    lead: 'HOP brings responsive, human-centered support to professionals and organizations, right where they work.',
    primary: { to: '/organizations', label: 'Explore HOP for Organizations' },
    secondary: { to: '/professionals', label: 'Explore HOP for Professionals' },
  },
  {
    id: 'professionals',
    image: 'professionals',
    alt: 'A healthcare worker relaxes on her couch at home in the evening, smiling at her phone',
    eyebrow: 'HOP for Professionals',
    title: 'Protect your time and energy.',
    lead: 'Personalized requests, trusted resources, and practical support so the details are handled and your off hours stay yours.',
    primary: { to: '/professionals', label: 'Explore professional support' },
  },
  {
    id: 'concierge',
    image: 'concierge',
    alt: 'A HOP concierge holds car keys and a golden retriever on a leash beside a freshly serviced car',
    eyebrow: 'The Concierge by HOP',
    title: 'Life’s everyday details, handled.',
    lead: 'Appointments, errands, local vendors, and special requests coordinated by a trusted team while you focus on your shift.',
    primary: { to: '/concierge', label: 'Explore The Concierge' },
  },
  {
    id: 'portal',
    image: 'portal',
    alt: 'A nurse in blue scrubs smiles at her phone in a calm hospital break room',
    eyebrow: 'The HOP Portal',
    title: 'Ask for help from anywhere.',
    lead: 'Log in to submit requests, browse resources, and follow your support. No download required.',
    primary: { to: '/portal', label: 'Log in to the HOP Portal' },
  },
  {
    id: 'organizations',
    image: 'organizations',
    alt: 'A hospital manager shares a tablet with two smiling nurses in a bright meeting room',
    eyebrow: 'HOP for Organizations',
    title: 'A stronger workplace experience.',
    lead: 'Adaptive hospitality programs that strengthen employee experience, connection, and day to day support.',
    primary: { to: '/organizations', label: 'Explore organization support' },
    secondary: { to: '/contact', label: 'Start a Conversation' },
  },
]

const INTERVAL_MS = 7000

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function HeroCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced] = useState(prefersReducedMotion)
  const touchStartX = useRef<number | null>(null)
  const count = SLIDES.length

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count])

  useEffect(() => {
    if (paused || reduced) return
    const id = window.setTimeout(() => go(index + 1), INTERVAL_MS)
    return () => window.clearTimeout(id)
  }, [index, paused, reduced, go])

  useEffect(() => {
    const onVis = () => setPaused(document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  return (
    <section
      className="hs-carousel"
      aria-roledescription="carousel"
      aria-label="Welcome to HOP"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1)
        if (e.key === 'ArrowLeft') go(index - 1)
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1))
        touchStartX.current = null
      }}
    >
      <div className="hs-carousel__track" aria-live={paused || reduced ? 'polite' : 'off'}>
        {SLIDES.map((slide, i) => {
          const active = i === index
          const Heading = i === 0 ? 'h1' : 'h2'
          return (
            <div
              key={slide.id}
              className={`hs-carousel__slide${active ? ' is-active' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              inert={!active}
            >
              <img
                className="hs-carousel__img"
                src={`/carousel/${slide.image}-1600.webp`}
                srcSet={`/carousel/${slide.image}-900.webp 900w, /carousel/${slide.image}-1600.webp 1600w`}
                sizes="100vw"
                width={1600}
                height={900}
                alt={slide.alt}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
              />
              <div className="hs-carousel__shade" aria-hidden="true" />
              <div className="hs-container hs-carousel__content">
                <p className="hs-eyebrow hs-eyebrow--on-dark">{slide.eyebrow}</p>
                <Heading className="hs-carousel__title">{slide.title}</Heading>
                <p className="hs-carousel__lead">{slide.lead}</p>
                <div className="hs-button-row">
                  <Link className="hs-btn hs-btn--primary" to={slide.primary.to}>
                    {slide.primary.label}
                  </Link>
                  {slide.secondary ? (
                    <Link className="hs-btn hs-btn--ghost" to={slide.secondary.to}>
                      {slide.secondary.label}
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hs-container hs-carousel__controls">
        <button type="button" className="hs-carousel__arrow" aria-label="Previous slide" onClick={() => go(index - 1)}>
          <span aria-hidden="true">‹</span>
        </button>
        <div className="hs-carousel__dots">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              className={`hs-carousel__dot${i === index ? ' is-active' : ''}`}
              aria-label={`Show slide ${i + 1}: ${slide.eyebrow}`}
              aria-current={i === index}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <button type="button" className="hs-carousel__arrow" aria-label="Next slide" onClick={() => go(index + 1)}>
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </section>
  )
}
