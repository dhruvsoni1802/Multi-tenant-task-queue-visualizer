import { useState, useCallback } from 'react'
import TaskPill from '../components/TaskPill'

const LABEL = { alice: 'Alice', bob: 'Bob', carol: 'Carol' }
const TENANTS = ['alice', 'bob', 'carol']

let _id = 0
function mkTask(tenant) { return { id: _id++, tenant } }

const INITIAL = [
  mkTask('alice'), mkTask('alice'),
  ...Array.from({ length: 8 }, () => mkTask('bob')),
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
  const aliceDone    = processed.filter(t => t.tenant === 'alice').length

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>
        FIFO — First In, First Out
      </h2>
      <p style={{ color: 'var(--text-2)', marginBottom: 28, maxWidth: 560 }}>
        Tasks are processed in arrival order. When Bob enqueues 8 tasks before Alice,
        Alice waits until every one of Bob's finishes — even if her job is tiny.
        This is called <strong style={{ color: 'var(--text-1)', fontWeight: 500 }}>starvation</strong>.
      </p>

      {/* stat row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        {[
          { label: "Queue length", value: queue.length },
          { label: "Alice waiting", value: aliceInQueue, warn: aliceInQueue > 0 },
          { label: "Bob waiting",   value: bobInQueue },
          { label: "Alice processed", value: aliceDone },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, padding: '12px 14px',
            background: s.warn ? 'var(--carol-bg)' : 'var(--bg-2)',
            border: `1px solid ${s.warn ? 'var(--carol-border)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-md)',
          }}>
            <div style={{ fontSize: 11, color: s.warn ? 'var(--carol)' : 'var(--text-3)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: s.warn ? 'var(--carol)' : 'var(--text-1)' }}>{s.value}</div>
          </div>
        ))}
      </div>

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
          border: '1px solid var(--text-1)', background: 'var(--text-1)', color: '#fff',
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

      {/* insight */}
      <div style={{ marginTop: 32, padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Why this matters</div>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
          In a real SaaS product, Bob could be one power user uploading thousands of files,
          while Alice is a free-tier user uploading one PDF. With FIFO, Alice waits for <em>all</em> of
          Bob's work to finish. The fix: process one task per tenant in rotation — round-robin.
        </p>
      </div>
    </div>
  )
}
