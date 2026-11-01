import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'

/**
 * Five-slide homepage carousel (2026-10, owner directive "HOP Website Carousel").
 * Slides are real HTML text over individual photos — never the flattened concept
 * image. Accessible per the WAI-ARIA APG carousel pattern: labelled slides,
 * prev/next and dot buttons, a pause control for autoplay, autoplay that stops
 * for good once someone navigates, and no autoplay or animation under
 * prefers-reduced-motion. Every slide sits in the same grid cell, so the
 * section's height is fixed by the tallest slide and nothing shifts on change.
 */

const AUTOPLAY_MS = 7000

type Photo = { src: string; alt: string; position: string }

type Slide = {
  id: string
  /** Short name used by the dots and the slide's accessible label. */
  label: string
  /** Omitted on the intro slide, where the logo's own tagline says it. */
  eyebrow?: string
  headline: string
  message?: string
  benefits?: readonly string[]
  cta: { label: string; to: string; hash?: boolean }
  photo: Photo
  /** Brand intro: logo above the headline and two inset photos over the art. */
  intro?: boolean
  /** Promise slide: the three audience photos side by side. */
  triptych?: boolean
}

const PHOTOS = {
  healthcare: {
    src: '/carousel/healthcare.webp',
    alt: 'A smiling nurse with colleagues on a hospital floor',
    position: '30% 30%',
  },
  organizations: {
    src: '/carousel/organizations.webp',
    alt: 'Three colleagues smiling together around a laptop',
    position: '55% 30%',
  },
  individuals: {
    src: '/carousel/individuals.webp',
    alt: 'A woman enjoying a quiet cup of coffee at home',
    position: '55% 25%',
  },
} satisfies Record<string, Photo>

const SLIDES: readonly Slide[] = [
  {
    id: 'intro',
    label: 'Radical Hospitality',
    headline: 'Radical Hospitality',
    message: 'For a more supported, productive, and fulfilling tomorrow.',
    cta: { label: 'Explore Our Services', to: '#services', hash: true },
    photo: { ...PHOTOS.healthcare, position: '34% 22%' },
    intro: true,
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    eyebrow: 'Healthcare',
    headline: 'Empower your staff. Elevate patient care. Become the hospital of choice.',
    benefits: [
      'Support staff and reduce everyday distractions',
      'Improve work-life balance and staff satisfaction',
      'Strengthen the employee experience',
      'Use actionable insights to support proactive leadership',
    ],
    cta: { label: 'Explore Healthcare Solutions', to: '/healthcare' },
    photo: PHOTOS.healthcare,
  },
  {
    id: 'organizations',
    label: 'Organizations',
    eyebrow: 'Organizations',
    headline: 'Empower your people. Maximize productivity. Strengthen your bottom line.',
    benefits: [
      'Personalized workplace concierge support',
      'Reduce distractions and improve efficiency',
      'Support employee satisfaction',
      'Actionable metrics for proactive decision-making',
    ],
    cta: { label: 'Explore Organizational Solutions', to: '/organizations' },
    photo: PHOTOS.organizations,
  },
  {
    id: 'individuals',
    label: 'Busy Individuals',
    eyebrow: 'Busy Individuals',
    headline: 'Radical Hospitality that gives you time back.',
    benefits: [
      'Personalized concierge support',
      'More time for family and priorities',
      'Less everyday stress',
      'Greater convenience and peace of mind',
    ],
    cta: { label: 'Explore Personal Concierge Services', to: '/concierge' },
    photo: PHOTOS.individuals,
  },
  {
    id: 'promise',
    label: 'The HOP Promise',
    eyebrow: 'The HOP Promise',
    headline: 'A more supported, productive, and fulfilling tomorrow.',
    message:
      'Whether you’re caring for others, leading a team, or managing a busy life, HOP helps you focus on what matters most.',
    cta: { label: 'Discover HOP', to: '/how-it-works' },
    // TODO(owner): a family photo from the approved concept replaces this triptych.
    photo: PHOTOS.individuals,
    triptych: true,
  },
]

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  )
}

function Img({ photo, eager, className }: { photo: Photo; eager: boolean; className: string }) {
  return (
    <img
      className={className}
      src={photo.src}
      alt={photo.alt}
      width={511}
      height={874}
      style={{ objectPosition: photo.position }}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : 'auto'}
      decoding="async"
    />
  )
}

function SlideArt({ slide, eager }: { slide: Slide; eager: boolean }) {
  if (slide.triptych) {
    return (
      <div className="hs-slide__art">
        <div className="hs-slide__photo hs-slide__photo--triptych">
          <Img photo={PHOTOS.healthcare} eager={eager} className="hs-slide__img" />
          <Img photo={PHOTOS.organizations} eager={eager} className="hs-slide__img" />
          <Img photo={PHOTOS.individuals} eager={eager} className="hs-slide__img" />
        </div>
      </div>
    )
  }
  return (
    <div className="hs-slide__art">
      <div className="hs-slide__photo">
        <Img photo={slide.photo} eager={eager} className="hs-slide__img" />
      </div>
      {slide.intro && (
        <div className="hs-slide__insets" aria-hidden="true">
          <img src="/carousel/organizations-inset.webp" alt="" width={320} height={320} loading="lazy" decoding="async" />
          <img src="/carousel/individuals-inset.webp" alt="" width={320} height={320} loading="lazy" decoding="async" />
        </div>
      )}
    </div>
  )
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

export function HomeCarousel() {
  const reducedMotion = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  // null = the visitor hasn't chosen; follow the motion preference.
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null)
  const [hoverOrFocus, setHoverOrFocus] = useState(false)
  const playing = userPlaying ?? !reducedMotion
  const swipeStart = useRef<number | null>(null)
  const trackId = useId()
  const count = SLIDES.length

  const goTo = useCallback(
    (next: number, fromUser: boolean) => {
      setIndex(((next % count) + count) % count)
      // Any manual navigation stops autoplay for good; the play button resumes it.
      if (fromUser) setUserPlaying(false)
    },
    [count],
  )

  useEffect(() => {
    if (!playing || hoverOrFocus) return
    const t = window.setTimeout(() => goTo(index + 1, false), AUTOPLAY_MS)
    return () => window.clearTimeout(t)
  }, [playing, hoverOrFocus, index, goTo])

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      goTo(index + 1, true)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goTo(index - 1, true)
    }
  }

  function onPointerDown(e: PointerEvent<HTMLElement>) {
    if (e.pointerType !== 'mouse') swipeStart.current = e.clientX
  }

  function onPointerUp(e: PointerEvent<HTMLElement>) {
    if (swipeStart.current === null) return
    const dx = e.clientX - swipeStart.current
    swipeStart.current = null
    if (Math.abs(dx) > 50) goTo(index + (dx < 0 ? 1 : -1), true)
  }

  return (
    <section
      className="hs-carousel"
      aria-roledescription="carousel"
      aria-label="Introducing HOP"
      onKeyDown={onKeyDown}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHoverOrFocus(true)}
      onPointerLeave={() => setHoverOrFocus(false)}
      onFocus={() => setHoverOrFocus(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHoverOrFocus(false)
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipeStart.current = null)}
    >
      <div className="hs-carousel__track" id={trackId} aria-live={playing ? 'off' : 'polite'}>
        {SLIDES.map((slide, i) => {
          const active = i === index
          const Heading = i === 0 ? 'h1' : 'h2'
          return (
            <div
              key={slide.id}
              className={`hs-slide hs-slide--${slide.id}`}
              data-active={active}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${slide.label}`}
              inert={!active}
            >
              <SlideArt slide={slide} eager={i === 0} />
              <div className="hs-container hs-slide__inner">
                <div className="hs-slide__content">
                  {slide.intro && (
                    <img
                      className="hs-slide__logo"
                      src="/brand/hop-logo-white.png"
                      alt="HOP — Hospitality On-Site Professionals"
                      width={600}
                      height={176}
                      decoding="async"
                    />
                  )}
                  {slide.eyebrow && <p className="hs-slide__eyebrow">{slide.eyebrow}</p>}
                  <Heading className="hs-slide__headline">{slide.headline}</Heading>
                  {slide.message && <p className="hs-slide__message">{slide.message}</p>}
                  {slide.benefits && (
                    <ul className="hs-slide__benefits">
                      {slide.benefits.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {slide.cta.hash ? (
                    <a className="hs-slide__cta" href={slide.cta.to}>
                      {slide.cta.label}
                      <Icon>
                        <path d="M5 12h14" />
                        <path d="M13 6l6 6-6 6" />
                      </Icon>
                    </a>
                  ) : (
                    <Link className="hs-slide__cta" to={slide.cta.to}>
                      {slide.cta.label}
                      <Icon>
                        <path d="M5 12h14" />
                        <path d="M13 6l6 6-6 6" />
                      </Icon>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hs-container hs-carousel__controls">
        <button type="button" className="hs-carousel__btn" aria-controls={trackId} aria-label="Previous slide" onClick={() => goTo(index - 1, true)}>
          <Icon>
            <path d="M15 6l-6 6 6 6" />
          </Icon>
        </button>
        <div className="hs-carousel__dots">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              className="hs-carousel__dot"
              aria-controls={trackId}
              aria-label={`Slide ${i + 1}: ${slide.label}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => goTo(i, true)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <button type="button" className="hs-carousel__btn" aria-controls={trackId} aria-label="Next slide" onClick={() => goTo(index + 1, true)}>
          <Icon>
            <path d="M9 6l6 6-6 6" />
          </Icon>
        </button>
        <button
          type="button"
          className="hs-carousel__btn hs-carousel__btn--pause"
          aria-label={playing ? 'Pause automatic slide show' : 'Play automatic slide show'}
          onClick={() => setUserPlaying(!playing)}
        >
          {playing ? (
            <Icon>
              <path d="M9 5v14" />
              <path d="M15 5v14" />
            </Icon>
          ) : (
            <Icon>
              <path d="M8 5l11 7-11 7z" />
            </Icon>
          )}
        </button>
      </div>
    </section>
  )
}
