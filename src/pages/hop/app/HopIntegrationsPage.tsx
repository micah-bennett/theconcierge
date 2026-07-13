import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { hopDisconnectGoogleCalendar, hopListIntegrations, type HopIntegration } from '../../../hop/api'

const PROVIDER_INFO: Record<string, { label: string; icon: string; live: boolean }> = {
  google_calendar: { label: 'Google Calendar', icon: '📅', live: true },
  fitbit: { label: 'Fitbit', icon: '⌚', live: false },
  oura: { label: 'Oura Ring', icon: '💍', live: false },
  apple_health: { label: 'Apple Health', icon: '🍎', live: false },
  garmin: { label: 'Garmin', icon: '⌚', live: false },
}

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Google Calendar isn't set up yet. Contact your administrator.",
  state_mismatch: 'Your connection attempt could not be verified. Please try connecting again.',
  connect_failed: 'Could not connect Google Calendar. Please try again.',
  db: 'Something went wrong. Please try again in a moment.',
}
const DEFAULT_ERROR_MESSAGE = 'Could not connect Google Calendar. Please try again.'

export function HopIntegrationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [integrations, setIntegrations] = useState<HopIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  function load() {
    setLoading(true)
    hopListIntegrations()
      .then((result) => setIntegrations(result.integrations))
      .catch(() => setIntegrations([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    if (searchParams.has('connected') || searchParams.has('error')) {
      const next = new URLSearchParams(searchParams)
      next.delete('connected')
      next.delete('error')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connectedMessage = searchParams.get('connected')
  const errorCode = searchParams.get('error')

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await hopDisconnectGoogleCalendar()
      load()
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Integrations</h1>
      <p className="hop-page-sub">Connect your calendar and wearables so HOP can look out for you.</p>

      {connectedMessage && <div className="hop-banner hop-banner--success">Google Calendar connected.</div>}
      {errorCode && (
        <div className="hop-banner hop-banner--error">{ERROR_MESSAGES[errorCode] || DEFAULT_ERROR_MESSAGE}</div>
      )}

      {loading ? (
        <p className="hop-muted">Loading…</p>
      ) : (
        <div className="hop-integration-grid">
          {integrations.map((integration) => {
            const info = PROVIDER_INFO[integration.provider]
            const connected = integration.status === 'connected'
            const needsReconnect = integration.status === 'error'
            return (
              <div key={integration.provider} className="hop-card hop-integration-card">
                <div className="hop-integration-card__header">
                  <span className="hop-integration-card__icon">{info?.icon}</span>
                  <strong>{info?.label || integration.provider}</strong>
                </div>
                {connected ? (
                  <>
                    <p className="hop-muted">
                      Connected{integration.external_account_email ? ` as ${integration.external_account_email}` : ''}.
                    </p>
                    <button
                      type="button"
                      className="hop-btn-secondary"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </>
                ) : needsReconnect ? (
                  <>
                    <p className="hop-muted">Your connection needs to be renewed.</p>
                    <a className="hop-btn-primary" href="/api/hop/integrations/google?action=start">
                      Reconnect
                    </a>
                  </>
                ) : info?.live ? (
                  <>
                    <p className="hop-muted">See upcoming events right on your dashboard.</p>
                    <a className="hop-btn-primary" href="/api/hop/integrations/google?action=start">
                      Connect
                    </a>
                  </>
                ) : (
                  <>
                    <p className="hop-muted">Coming soon.</p>
                    <button type="button" className="hop-btn-secondary" disabled>
                      Connect
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
