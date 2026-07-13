import { useEffect, useState } from 'react'
import { hopAdminListWellnessCheckIns, type HopAdminWellnessCheckIn } from '../../../hop/api'

const FEELING_LABEL: Record<string, string> = {
  doing_well: 'Doing well',
  stretched_thin: 'Stretched thin',
  low_energy: 'Low energy',
  overwhelmed: 'Overwhelmed',
}

const SUPPORT_LABEL: Record<string, string> = {
  meal: 'Meal support',
  ride: 'Ride or commute support',
  errands: 'Errands',
  wellness_appt: 'Wellness appointment',
  time_back_home: 'Time back at home',
  talk_to_concierge: 'Talk to a concierge',
}

const SHIFT_PROTECTION_LABEL: Record<string, string> = {
  yes: 'Yes',
  no: 'No',
  not_applicable: 'Not applicable',
}

export function HopAdminWellnessPage() {
  const [checkIns, setCheckIns] = useState<HopAdminWellnessCheckIn[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hopAdminListWellnessCheckIns()
      .then((result) => setCheckIns(result.checkIns))
      .catch(() => setCheckIns([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Wellness check-ins</h1>
      <p className="hop-page-sub">
        Voluntary staff check-ins, shown here for concierge triage only — not a performance or
        clinical record.
      </p>

      <section className="hop-card">
        {loading && <p className="hop-muted">Loading…</p>}
        {!loading && checkIns.length === 0 && <p className="hop-muted">No check-ins yet.</p>}
        {!loading && checkIns.length > 0 && (
          <table className="hop-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Feeling</th>
                <th>Would help most</th>
                <th>Shift protection</th>
                <th>Note</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {checkIns.map((checkIn) => (
                <tr key={checkIn.id}>
                  <td>
                    {checkIn.first_name} {checkIn.last_name}
                    <div className="hop-muted">{checkIn.email}</div>
                  </td>
                  <td>{FEELING_LABEL[checkIn.feeling] || checkIn.feeling}</td>
                  <td>{SUPPORT_LABEL[checkIn.desired_support] || checkIn.desired_support}</td>
                  <td>
                    {checkIn.shift_protection
                      ? SHIFT_PROTECTION_LABEL[checkIn.shift_protection] || checkIn.shift_protection
                      : '—'}
                  </td>
                  <td>{checkIn.note || '—'}</td>
                  <td>{new Date(checkIn.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
