import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../site'

export const COMPANY_CONTACT = {
  phoneDisplay: OFFICE_PHONE_DISPLAY,
  phoneTel: OFFICE_PHONE_TEL,
} as const

export type SocialPlatform = 'facebook' | 'linkedin' | 'instagram'

export type SocialLink = {
  id: SocialPlatform
  label: string
  handle: string
  href: string
  blurb: string
}

/** Official HVCS channels — aligned with hvconcierge.com */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    handle: '@hvconcierge',
    href: 'https://www.facebook.com/hvconcierge',
    blurb: 'Updates, community, and service highlights',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    handle: 'Hudson Valley Concierge Service',
    href: 'https://www.linkedin.com/company/hudson-valley-concierge-service/',
    blurb: 'Company news and professional concierge insights',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    handle: '@hvconcierge',
    href: 'https://www.instagram.com/hvconcierge/',
    blurb: 'Photos, stories, and behind-the-scenes from the team',
  },
] as const
