import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { getFirebaseDb, isFirebaseConfigured } from './config'

export type ConciergeRequestPayload = {
  firstName: string
  lastName: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
  email: string
  dateNeeded: string
  timeNeeded: string
  requestType: string
  details: string
  hearAboutUs: string
  paymentMethod: string
  cardholderName: string
  /** Digits from the card — only the last four are written to Firestore (see `submitConciergeRequest`). */
  cardLastFour: string
  expMonth: string
  expYear: string
}

/**
 * Submits request data to Firestore. Only the last four digits of a card are stored (`cardLastFour`);
 * full card numbers and CVV are never written (PCI).
 */
export async function submitConciergeRequest(payload: ConciergeRequestPayload): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured')
  }

  const db = getFirebaseDb()

  const digits = payload.cardLastFour.replace(/\D/g, '')
  const cardLastFourStored = digits.length >= 4 ? digits.slice(-4) : ''

  await addDoc(collection(db, 'conciergeRequests'), {
    firstName: payload.firstName,
    lastName: payload.lastName,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2,
    city: payload.city,
    state: payload.state,
    zip: payload.zip,
    country: payload.country,
    phone: payload.phone,
    email: payload.email,
    dateNeeded: payload.dateNeeded,
    timeNeeded: payload.timeNeeded,
    requestType: payload.requestType,
    details: payload.details,
    hearAboutUs: payload.hearAboutUs,
    paymentMethod: payload.paymentMethod,
    cardholderName: payload.cardholderName,
    cardLastFour: cardLastFourStored,
    expMonth: payload.expMonth,
    expYear: payload.expYear,
    createdAt: serverTimestamp(),
  })
}
