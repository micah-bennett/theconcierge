import { getAI, getGenerativeModel, GoogleAIBackend, type GenerativeModel } from 'firebase/ai'

import { getFirebaseApp } from './config'
import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../site'
import { CONCIERGE_PLAYBOOK } from '../site/conciergePlaybook'
import { PLANS_KNOWLEDGE } from '../site/plansKnowledge'

const CONCIERGE_SYSTEM = `${CONCIERGE_PLAYBOOK}

--- PLANS & POLICIES (website source of truth) ---
Use this block for membership hours, what is included in each tier, stated policies (e.g. gratuity, mileage rules), a la carte, payment methods, and privacy. Do not contradict it. Do not turn tiers into dollar prices or rates—only describe structure and inclusions. If a detail is not listed, say the concierge team can confirm.

${PLANS_KNOWLEDGE}
---

Primary call line for handoff: ${OFFICE_PHONE_DISPLAY} (tel: ${OFFICE_PHONE_TEL}). Prefer this number when directing visitors to speak with the team after discovery.
`

let cached: GenerativeModel | undefined

/**
 * Generative model for the on-site Q&A assistant (Firebase AI Logic + Gemini).
 */
export function getConciergeGenerativeModel(): GenerativeModel {
  if (!cached) {
    const app = getFirebaseApp()
    const ai = getAI(app, { backend: new GoogleAIBackend() })
    cached = getGenerativeModel(ai, {
      model: 'gemini-2.5-flash',
      systemInstruction: CONCIERGE_SYSTEM,
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: 1536,
        topP: 0.95,
        topK: 40,
      },
    })
  }
  return cached
}
