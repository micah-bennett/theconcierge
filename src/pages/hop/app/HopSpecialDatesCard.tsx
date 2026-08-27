import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  hopAddFamilyMember,
  hopDeleteFamilyMember,
  hopGetSelfDates,
  hopListFamilyMembers,
  hopUpdateSelfDates,
  type HopFamilyMember,
} from '../../../hop/api'
import { useToast } from '../../../hop/useToast'
import { EmptyState } from '../../../hop/EmptyState'

const RELATIONSHIPS = ['Spouse/Partner', 'Child', 'Parent', 'Sibling', 'Friend', 'Other']

// So HOP can do special things for members and their families — birthdays/anniversaries here
// are also what the HOP AI assistant widget (dashboard) reads to suggest things like arranging a
// birthday cake. See docs/hop/architecture.md, "Member special dates + family profile".
export function HopSpecialDatesCard() {
  const toast = useToast()
  const [birthday, setBirthday] = useState('')
  const [anniversary, setAnniversary] = useState('')
  const [savingSelf, setSavingSelf] = useState(false)
  const [members, setMembers] = useState<HopFamilyMember[] | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0])
  const [name, setName] = useState('')
  const [memberBirthday, setMemberBirthday] = useState('')
  const [momentNote, setMomentNote] = useState('')
  const [momentDate, setMomentDate] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    hopGetSelfDates()
      .then((dates) => {
        setBirthday(dates.birthday ?? '')
        setAnniversary(dates.anniversary ?? '')
      })
      .catch(() => {})
    loadMembers()
  }, [])

  function loadMembers() {
    hopListFamilyMembers()
      .then((result) => setMembers(result.members))
      .catch(() => setMembers([]))
  }

  async function handleSaveSelf(event: FormEvent) {
    event.preventDefault()
    setSavingSelf(true)
    try {
      await hopUpdateSelfDates({ birthday: birthday || null, anniversary: anniversary || null })
      toast.success('Your dates have been saved.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your dates')
    } finally {
      setSavingSelf(false)
    }
  }

  async function handleAddMember(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setAdding(true)
    try {
      await hopAddFamilyMember({
        relationship,
        name,
        birthday: memberBirthday || null,
        specialMomentNote: momentNote,
        specialMomentDate: momentDate || null,
      })
      setName('')
      setMemberBirthday('')
      setMomentNote('')
      setMomentDate('')
      setShowForm(false)
      loadMembers()
      toast.success('Family member added.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add family member')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    await hopDeleteFamilyMember(id)
    loadMembers()
  }

  const loading = members === null

  return (
    <section className="hop-card">
      <h2>🎂 Special dates &amp; family</h2>
      <p className="hop-muted">
        Add your own dates and the people closest to you, so HOP can do something special for the
        moments that matter.
      </p>

      <form className="hop-form-stack" onSubmit={handleSaveSelf}>
        <div className="hop-field-row">
          <label className="hop-field">
            <span>Your birthday</span>
            <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </label>
          <label className="hop-field">
            <span>Your anniversary</span>
            <input type="date" value={anniversary} onChange={(e) => setAnniversary(e.target.value)} />
          </label>
        </div>
        <button type="submit" className="hop-btn-secondary" disabled={savingSelf}>
          {savingSelf ? 'Saving…' : 'Save my dates'}
        </button>
      </form>

      <hr className="hop-divider" />

      {loading && <div className="hop-skeleton-bar" />}
      {!loading && members.length === 0 && !showForm && (
        <EmptyState icon="👨‍👩‍👧" message="No family members added yet." />
      )}
      {!loading && members.length > 0 && (
        <ul className="hop-history-list">
          {members.map((member) => (
            <li key={member.id} className="hop-history-list__item">
              <span className="hop-history-list__type">
                {member.name}
                {member.relationship ? ` — ${member.relationship}` : ''}
              </span>
              {member.birthday && <span className="hop-muted">🎂 {member.birthday}</span>}
              <button
                type="button"
                className="hop-btn-ghost"
                onClick={() => handleDelete(member.id)}
                aria-label={`Remove ${member.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form className="hop-form-stack" onSubmit={handleAddMember}>
          {error && (
            <div className="hop-auth-card__error" role="alert">
              {error}
            </div>
          )}
          <div className="hop-field-row">
            <label className="hop-field">
              <span>Name</span>
              <input type="text" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="hop-field">
              <span>Relationship</span>
              <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="hop-field-row">
            <label className="hop-field">
              <span>Birthday</span>
              <input type="date" value={memberBirthday} onChange={(e) => setMemberBirthday(e.target.value)} />
            </label>
            <label className="hop-field">
              <span>Special moment date</span>
              <input type="date" value={momentDate} onChange={(e) => setMomentDate(e.target.value)} />
            </label>
          </div>
          <label className="hop-field">
            <span>Special moment note (optional)</span>
            <input
              type="text"
              maxLength={200}
              placeholder="e.g. Starting kindergarten"
              value={momentNote}
              onChange={(e) => setMomentNote(e.target.value)}
            />
          </label>
          <div className="hop-field-row">
            <button type="submit" className="hop-btn-primary" disabled={adding}>
              {adding ? 'Adding…' : 'Add family member'}
            </button>
            <button type="button" className="hop-btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="hop-btn-secondary" onClick={() => setShowForm(true)}>
          ➕ Add family member
        </button>
      )}
    </section>
  )
}
