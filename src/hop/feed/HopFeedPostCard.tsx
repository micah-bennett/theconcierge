import { HopAvatar, hopRoleLabel } from '../HopAvatar'
import type { HopReactionType, HopSocialPost } from '../api'

const REACTIONS: Array<{ type: HopReactionType; icon: string; label: string }> = [
  { type: 'like', icon: '👍', label: 'Like' },
  { type: 'celebrate', icon: '🎉', label: 'Celebrate' },
  { type: 'support', icon: '🙌', label: 'Support' },
]

// A short, friendly "2h ago" / "3d ago" — this codebase otherwise just calls
// toLocaleString() everywhere; a feed reads noticeably livelier with relative time.
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffSeconds = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (diffSeconds < 60) return 'just now'
  const diffMinutes = Math.round(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(iso).toLocaleDateString()
}

export function HopFeedPostCard({
  post,
  onReact,
}: {
  post: HopSocialPost
  onReact: (postId: string, reaction: HopReactionType | null) => void
}) {
  return (
    <article className="hop-card hop-feed-post">
      <div className="hop-feed-post__header">
        <HopAvatar firstName={post.author.firstName} lastName={post.author.lastName} userId={post.author.id} />
        <div className="hop-feed-post__author">
          <span className="hop-feed-post__name">
            {post.author.firstName} {post.author.lastName}
          </span>
          <span className={`hop-role-badge hop-role-badge--${post.author.role}`}>
            {hopRoleLabel(post.author.role)}
          </span>
        </div>
        <span className="hop-muted hop-feed-post__time">{formatRelativeTime(post.created_at)}</span>
      </div>

      <p className="hop-feed-post__body">{post.body}</p>

      <div className="hop-feed-post__reactions">
        {REACTIONS.map((reaction) => {
          const count = post.reactions[reaction.type] || 0
          const active = post.myReaction === reaction.type
          return (
            <button
              key={reaction.type}
              type="button"
              className={`hop-feed-reaction-btn${active ? ' hop-feed-reaction-btn--active' : ''}`}
              onClick={() => onReact(post.id, active ? null : reaction.type)}
              aria-pressed={active}
            >
              <span aria-hidden="true">{reaction.icon}</span>
              {reaction.label}
              {count > 0 && <span className="hop-feed-reaction-btn__count">{count}</span>}
            </button>
          )
        })}
      </div>
    </article>
  )
}
