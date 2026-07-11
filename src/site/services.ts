export type ServiceItem = {
  id: string
  anchor: string
  icon: string
  tag: string
  title: string
  desc: string
  megaBlurb: string
  features: readonly string[]
  featured?: boolean
}

export const SERVICES: readonly ServiceItem[] = [
  {
    id: 'hospital',
    anchor: 'svc-hospital',
    icon: '✦',
    tag: 'Healthcare Partners',
    title: 'Hospital & Care Facility Support',
    desc: 'We are the bridge between your clinical team and the world outside the hospital — logistics handled so staff and patients aren’t.',
    megaBlurb: 'Discharge transport, prescriptions, and family updates',
    features: [
      'Discharge transport & safe return-home coordination',
      'Prescription pickup & same-day delivery to patient',
      'Family communication & status updates throughout the stay',
      'Documented hand-offs reducing readmission risk',
      'CPR, AED, First Aid & Narcan certified team',
      'HIPAA-aware courier & specimen transport',
    ],
    featured: true,
  },
  {
    id: 'rides',
    anchor: 'svc-rides',
    icon: '✦',
    tag: 'Transport',
    title: 'Medical & Appointment Rides',
    desc: 'Getting to and from a medical appointment shouldn’t be a source of stress. We handle the ride, the wait, and the way home.',
    megaBlurb: 'Door-through-door for dialysis, infusion & recurring visits',
    features: [
      'Dialysis, infusion, chemotherapy & recurring appointments',
      'Post-op & same-day discharge rides',
      'We wait, assist, and escort inside when needed',
      'Wheelchair-accessible & ambulatory options available',
    ],
  },
  {
    id: 'caregiver',
    anchor: 'svc-caregiver',
    icon: '✦',
    tag: 'Family Caregivers',
    title: 'Family Caregiver Relief',
    desc: 'You can’t be in two places at once. We cover the errands and check-ins so you can focus on the people who need you.',
    megaBlurb: 'Pharmacy, grocery, check-ins & pet care',
    features: [
      'Prescription pickup & delivery to the home',
      'Grocery runs, errand completion & supply restocking',
      'Welfare check-ins with written & photo updates',
      'Pet care, dog walking & home watch during hospital stays',
    ],
  },
  {
    id: 'executive',
    anchor: 'svc-executive',
    icon: '✦',
    tag: 'Executive',
    title: 'Executive & Professional Concierge',
    desc: 'High performers carry the heaviest personal logistics load. We give back the hours that matter most.',
    megaBlurb: 'Monthly personal assistant hours, on-call',
    features: [
      'Monthly personal assistant hours — flexible & on-call',
      'Vehicle maintenance scheduling & drop-off/pick-up',
      'Home vendor coordination & appointment management',
      'Travel prep, packing assistance & airport logistics',
    ],
  },
  {
    id: 'courier',
    anchor: 'svc-courier',
    icon: '✦',
    tag: 'Courier',
    title: 'Confidential Courier',
    desc: 'When it absolutely cannot be lost, delayed, or handed to a stranger — we carry it ourselves.',
    megaBlurb: 'Same-day, HIPAA-aware delivery',
    features: [
      'Medical specimens, lab samples & pathology transport',
      'Prescription & pharmacy delivery (same-day)',
      'Legal documents, contracts & confidential files',
      'Chain-of-custody documentation available',
    ],
  },
  {
    id: 'corporate',
    anchor: 'svc-corporate',
    icon: '✦',
    tag: 'Corporate',
    title: 'Corporate & Event Logistics',
    desc: 'Your event runs on a thousand moving parts. We handle the ones that go wrong at 6am.',
    megaBlurb: 'Airport runs, VIP ground transport & event staffing',
    features: [
      'Executive airport transfers & VIP ground transport',
      'Event-day staffing & on-site logistics coordination',
      'Conference, corporate retreat & gala support',
      'After-hours & early-morning availability',
    ],
  },
] as const
