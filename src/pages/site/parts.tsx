import type { ReactNode } from 'react'

/** Building blocks repeated across the public HOP pages. Styles: src/styles/hopSite.css. */

export type Step = { num: string; title: string; desc: string }

export function Steps({ steps }: { steps: ReadonlyArray<Step> }) {
  return (
    <div className="hs-steps">
      {steps.map((step) => (
        <article key={step.num} className="hs-step">
          <div className="hs-step__num">{step.num}</div>
          <h3>{step.title}</h3>
          <p>{step.desc}</p>
        </article>
      ))}
    </div>
  )
}

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string
  title: string
  lead: string
  children?: ReactNode
}) {
  return (
    <section className="hs-page-hero">
      <div className="hs-container">
        <p className="hs-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="hs-lead">{lead}</p>
        {children}
      </div>
    </section>
  )
}

export function InfoPanel({
  title,
  heading = 'h3',
  intro,
  items,
}: {
  title: string
  heading?: 'h2' | 'h3'
  intro?: string
  items: ReadonlyArray<string>
}) {
  const Heading = heading
  return (
    <div className="hs-info-panel">
      <Heading>{title}</Heading>
      {intro ? <p>{intro}</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export function Quote({ text, attribution }: { text: string; attribution: string }) {
  return (
    <aside className="hs-quote">
      <p>{text}</p>
      <strong>{attribution}</strong>
    </aside>
  )
}
