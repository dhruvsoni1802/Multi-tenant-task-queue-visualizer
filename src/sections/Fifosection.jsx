import { useState, useCallback } from 'react'
import TaskPill from '../components/TaskPill'

const LABEL = { alice: 'Alice', bob: 'Bob', carol: 'Carol' }
const TENANTS = ['alice', 'bob', 'carol']

let _id = 0
function mkTask(tenant) { return { id: _id++, tenant } }

const INITIAL = [
  ...Array.from({ length: 8 }, () => mkTask('bob')),
  mkTask('alice'), mkTask('alice'),
  mkTask('carol'),
]

export default function FifoSection() {
  const [queue, setQueue] = useState(INITIAL)
  const [processed, setProcessed] = useState([])
  const [highlight, setHighlight] = useState(null)

  const enqueue = (tenant) => {
    setQueue(q => [...q, mkTask(tenant)])
  }

  const dequeue = useCallback(() => {
    if (queue.length === 0) return
    const [first, ...rest] = queue
    setProcessed(p => [...p, first])
    setHighlight(first.id)
    setQueue(rest)
    setTimeout(() => setHighlight(null), 600)
  }, [queue])

  const reset = () => {
    _id = 0
    setQueue(INITIAL.map(t => mkTask(t.tenant)))
    setProcessed([])
    setHighlight(null)
  }

  const aliceInQueue = queue.filter(t => t.tenant === 'alice').length
  const bobInQueue   = queue.filter(t => t.tenant === 'bob').length

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>
        FIFO — First In, First Out
      </h2>
      <p style={{ color: 'var(--text-2)', marginBottom: 24, maxWidth: 560 }}>
        Tasks are processed in arrival order. Bob's 8 tasks arrived first — Alice is stuck waiting
        behind all of them. Hit <em>Process next</em> to see her wait. Try <em>Bob uploads 6 files</em> to make it worse.
      </p>

      {/* queue visualization */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Queue — oldest first →
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 36 }}>
          {queue.length === 0
            ? <span style={{ color: 'var(--text-3)', fontSize: 13 }}>Queue is empty</span>
            : queue.map((t, i) => (
                <TaskPill key={t.id} tenant={t.tenant} id={t.id} dim={highlight === t.id} />
              ))
          }
        </div>
      </div>

      {/* processed */}
      {processed.length > 0 && (
        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Processed (most recent last)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {processed.map(t => <TaskPill key={t.id} tenant={t.tenant} id={t.id} />)}
          </div>
        </div>
      )}

      {/* starvation callout */}
      {aliceInQueue > 0 && bobInQueue === 0 && processed.length > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-md)',
          background: 'var(--carol-bg)', border: '1px solid var(--carol-border)',
          color: 'var(--carol)', fontSize: 13, marginBottom: 20,
        }}>
          Alice was waiting while all of Bob's tasks ran first — that's starvation.
        </div>
      )}

      {/* controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
        {TENANTS.map(t => (
          <button key={t} onClick={() => enqueue(t)} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: `var(--${t})`,
          }}>
            + {LABEL[t]} task
          </button>
        ))}
        <button onClick={() => Array.from({ length: 6 }).forEach(() => enqueue('bob'))}
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13,
            border: '1px solid var(--bob-border)', background: 'var(--bob-bg)',
            color: 'var(--bob)', fontWeight: 500,
          }}>
          Bob uploads 6 files
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={dequeue} disabled={queue.length === 0} style={{
          padding: '8px 20px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
          border: '1px solid var(--text-1)', background: 'var(--text-1)', color: 'var(--bg)',
          opacity: queue.length === 0 ? 0.4 : 1,
        }}>
          Process next
        </button>
        <button onClick={reset} style={{
          padding: '8px 14px', borderRadius: 'var(--radius-md)', fontSize: 13,
          border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--bg)',
        }}>
          Reset
        </button>
      </div>

    </div>
  )
}
