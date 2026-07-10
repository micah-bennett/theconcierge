import { useHopAuth } from '../../../hop/useHopAuth'

export function HopProfilePage() {
  const { user } = useHopAuth()

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Profile</h1>

      <section className="hop-card">
        <dl className="hop-profile-list">
          <div>
            <dt>Name</dt>
            <dd>
              {user?.firstName} {user?.lastName}
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div>
            <dt>Account type</dt>
            <dd>{user?.role === 'admin' ? 'Admin' : 'HOP member'}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
