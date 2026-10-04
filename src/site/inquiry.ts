/**
 * "I am interested in" options on the public contact form. Shared with the
 * server (api/_lib/inquiryValidation.ts), which rejects anything not listed here.
 * `key` is the ?interest= value other pages use to preselect an option.
 */
export const INQUIRY_INTERESTS = [
  { key: 'organization', label: 'HOP support for an organization' },
  { key: 'professional', label: 'HOP support as a professional' },
  { key: 'concierge', label: 'The Concierge by HOP' },
  { key: 'portal', label: 'HOP Portal access' },
  { key: 'other', label: 'Something else' },
] as const
