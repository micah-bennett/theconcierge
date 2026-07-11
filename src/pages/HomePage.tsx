import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { About } from '../components/marketing/About'
import { Hero } from '../components/marketing/Hero'
import { HopTeaser } from '../components/marketing/HopTeaser'
import { HowItWorks } from '../components/marketing/HowItWorks'
import { ProblemStats } from '../components/marketing/ProblemStats'
import { RequestSection } from '../components/marketing/RequestSection'
import { Services } from '../components/marketing/Services'

export function HomePage() {
  const location = useLocation()

  useEffect(() => {
    if (!location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  return (
    <div>
      <Hero />
      <ProblemStats />
      <HowItWorks />
      <Services />
      <HopTeaser />
      <About />
      <RequestSection />
    </div>
  )
}
