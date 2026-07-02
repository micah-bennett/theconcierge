import { OFFICE_PHONE_DISPLAY, OFFICE_PHONE_TEL } from '../src/site.js'
import { CONCIERGE_PLAYBOOK } from '../src/site/conciergePlaybook.js'
import { PLANS_KNOWLEDGE } from '../src/site/plansKnowledge.js'

type ChatMessage = { role: 'user' | 'model'; text: string }

const SYSTEM_INSTRUCTION = `${CONCIERGE_PLAYBOOK}

--- PLANS & POLICIES (website source of truth) ---
${PLANS_KNOWLEDGE}
---

Primary call line for handoff: ${OFFICE_PHONE_DISPLAY} (tel: ${OFFICE_PHONE_TEL}).`

function validMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) throw new Error('Invalid messages')
  return value.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid message')
    const role = (item as Record<string, unknown>).role
    const text = (item as Record<string, unknown>).text
    if ((role !== 'user' && role !== 'model') || typeof text !== 'string' || !text.trim() || text.length > 2000) {
      throw new Error('Invalid message')
    }
    return { role, text: text.trim() }
  })
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) return Response.json({ error: 'The assistant is not configured' }, { status: 503 })

  try {
    const body = (await request.json()) as { messages?: unknown }
    const messages = validMessages(body.messages)
    const model = process.env.AI_MODEL?.trim() || 'claude-haiku-4-5-20251001'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1536,
        system: SYSTEM_INSTRUCTION,
        messages: messages.map((m) => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.text,
        })),
      }),
    })

    const result = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>
      error?: { message?: string }
    }
    if (!response.ok) throw new Error(result.error?.message || 'Assistant request failed')
    const text = result.content?.find((b) => b.type === 'text')?.text?.trim()
    if (!text) throw new Error('The assistant returned an empty response')
    return Response.json({ text }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assistant request failed'
    const status = /Invalid message/i.test(message) ? 400 : 502
    if (status === 502) console.error('Chat request failed', message)
    return Response.json({ error: status === 400 ? message : 'The assistant is temporarily unavailable' }, { status })
  }
}

export function GET(): Response {
  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}
