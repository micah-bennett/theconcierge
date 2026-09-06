import { useEffect, useState } from 'react'
import {
  hopCreateSocialPost,
  hopListSocialFeed,
  hopListUserStatuses,
  hopReactToPost,
  hopRemoveReaction,
  hopSetMyStatus,
  type HopReactionType,
  type HopSocialPost,
  type HopUserStatusEntry,
} from '../api'
import { useHopAuth } from '../useHopAuth'
import { useToast } from '../useToast'
import { SkeletonCard } from '../SkeletonCard'
import { EmptyState } from '../EmptyState'
import { HopFeedComposer } from './HopFeedComposer'
import { HopFeedPostCard } from './HopFeedPostCard'
import { HopFeedStatusRail } from './HopFeedStatusRail'

// The shared HOP Feed — one internal, LinkedIn/Facebook-style feed visible to every role
// (member/admin/concierge/facility). Polls every 15s, same pattern as RequestMessageThread and
// HopMessagesPage — no websockets exist anywhere in this codebase. See api/hop/social.ts.
export function HopFeedPage() {
  const { user } = useHopAuth()
  const toast = useToast()
  const [posts, setPosts] = useState<HopSocialPost[]>([])
  const [statuses, setStatuses] = useState<HopUserStatusEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    function tick() {
      Promise.all([hopListSocialFeed(), hopListUserStatuses()])
        .then(([feedResult, statusResult]) => {
          if (cancelled) return
          setPosts(feedResult.posts)
          setStatuses(statusResult.statuses)
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoaded(true)
        })
    }
    tick()
    const interval = setInterval(tick, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  async function refreshFeed() {
    try {
      const result = await hopListSocialFeed()
      setPosts(result.posts)
    } catch {
      // Next poll tick will retry — a single missed refresh isn't worth surfacing.
    }
  }

  async function handlePost(body: string) {
    try {
      await hopCreateSocialPost(body)
      await refreshFeed()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post that')
      throw err
    }
  }

  async function handleReact(postId: string, reaction: HopReactionType | null) {
    // Optimistic patch of just this one card, then reconcile with the server's real counts.
    const previous = posts
    try {
      const result = reaction ? await hopReactToPost(postId, reaction) : await hopRemoveReaction(postId)
      setPosts((current) =>
        current.map((post) =>
          post.id === postId ? { ...post, reactions: result.reactions, myReaction: result.myReaction } : post,
        ),
      )
    } catch (err) {
      setPosts(previous)
      toast.error(err instanceof Error ? err.message : 'Could not save your reaction')
    }
  }

  async function handleSetStatus(statusType: string, statusNote: string) {
    try {
      const result = await hopSetMyStatus(statusType, statusNote)
      setStatuses((current) => {
        const rest = current.filter((entry) => entry.user_id !== result.status.user_id)
        return [result.status, ...rest]
      })
      toast.success('Status updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update your status')
      throw err
    }
  }

  return (
    <div className="hop-page-body">
      <h1 className="hop-page-title">Feed</h1>
      <p className="hop-page-sub">One shared feed for everyone on HOP — shout-outs, welcomes, and what's going on.</p>

      <div className="hop-feed-layout">
        <div className="hop-feed-layout__main">
          <section className="hop-card">
            <HopFeedComposer onPost={handlePost} />
          </section>

          {!loaded ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : posts.length === 0 ? (
            <section className="hop-card">
              <EmptyState icon="💬" message="No posts yet — be the first to say hello." />
            </section>
          ) : (
            posts.map((post) => <HopFeedPostCard key={post.id} post={post} onReact={handleReact} />)
          )}
        </div>

        <div className="hop-feed-layout__rail">
          {loaded && <HopFeedStatusRail statuses={statuses} myUserId={user?.id} onSetStatus={handleSetStatus} />}
        </div>
      </div>
    </div>
  )
}
