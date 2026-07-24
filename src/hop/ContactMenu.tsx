import { useState } from 'react'

// Click a name to reveal call/text/email options — used on the concierge's and admin's request
// cards so staff can reach a client directly without leaving the page. See
// docs/hop/architecture.md ("Phase 1 quick wins"). A plain disclosure, not a popover library.
export function ContactMenu({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="hop-contact-menu" onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <button type="button" className="hop-contact-menu__trigger" onClick={() => setOpen((v) => !v)}>
        {name}
      </button>
      {open && (
        <div className="hop-contact-menu__panel">
          {phone ? (
            <>
              <a href={`tel:${phone}`}>Call</a>
              <a href={`sms:${phone}`}>Text</a>
            </>
          ) : (
            <span className="hop-muted" style={{ padding: '0.35rem 0.5rem' }}>
              No phone on file
            </span>
          )}
          <a href={`mailto:${email}`}>Email</a>
        </div>
      )}
    </div>
  )
}
