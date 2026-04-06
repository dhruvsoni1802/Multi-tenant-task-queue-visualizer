import { useState, useRef } from 'react'
import TaskPill from '../components/TaskPill'

let _id = 100
function mkTask(tenant) { return { id: _id++, tenant, rank: null } }

const INITIAL_QUEUE = [
  mkTask('alice'), mkTask('alice'),
  ...Array.from({ length: 6 }, () => mkTask('bob')),
  mkTask('carol'), mkTask('carol'),
]

function assignRanks(tasks) {
  const counters = {}
  return tasks.map(t => {
    counters[t.tenant] = (counters[t.tenant] || 0) + 1
    return { ...t, rank: counters[t.tenant] }
  })
}

function partitionSort(tasks) {
  const ranked = assignRanks(tasks)
  return [...ranked].sort((a, b) => a.rank !== b.rank ? a.rank - b.rank : a.id - b.id)
}

const WORKER_COLORS = ['#7c3aed', '#0369a1', '#b45309']

export default function PartitionSection() {
  const [queue, setQueue] = useState(INITIAL_QUEUE)
  const [processed, setProcessed] = useState([])
  const [workerLogs, setWorkerLogs] = useState([[], [], []])
  const [showPartitioned, setShowPartitioned] = useState(false)
  const [concurrencyBug, setConcurrencyBug] = useState(false)
  const [scanHighlight, setScanHighlight] = useState(false)

  const reset = () => {
    _id = 100
    setQueue(INITIAL_QUEUE.map(t => mkTask(t.tenant)))
    setProcessed([])
    setWorkerLogs([[], [], []])
    setShowPartitioned(false)
    setConcurrencyBug(false)
    setScanHighlight(false)
  }

  const runPartitionQuery = () => {
    setShowPartitioned(true)
    setScanHighlight(true)
    setTimeout(() => setScanHighlight(false), 1200)
  }

  const processRoundRobin = () => {
    if (queue.length === 0) return
    const sorted = partitionSort(queue)
    const limit = 3
    const batch = sorted.slice(0, limit)
    const batchIds = new Set(batch.map(t => t.id))
    setProcessed(p => [...p, ...batch])
    setQueue(q => q.filter(t => !batchIds.has(t.id)))
  }

  const simulateConcurrency = () => {
    setConcurrencyBug(true)
    // Three workers run simultaneously — they all see the same CTE snapshot
    // and may all lock the same rows, causing worker 2 and 3 to get 0 tasks
    const sorted = partitionSort(queue)
    const perWorker = 2
    const logs = [[], [], []]
    // Worker 1 gets the top tasks (they lock them)
    logs[0] = sorted.slice(0, perWorker).map(t => ({ ...t, got: true }))
    // Worker 2 and 3 try but the CTE already has those rows locked → they skip
    logs[1] = sorted.slice(0, perWorker).map(t => ({ ...t, got: false }))
    logs[2] = sorted.slice(0, perWorker).map(t => ({ ...t, got: false }))
    setWorkerLogs(logs)
  }

  const partitioned = partitionSort(queue)

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>
        Read-time fix: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 17, background: 'var(--bg-3)', padding: '2px 6px', borderRadius: 4 }}>PARTITION BY</code>
      </h2>
      <p style={{ color: 'var(--text-2)', marginBottom: 28, maxWidth: 580 }}>
        At read time, assign each task a rank within its tenant group using a window function,
        then sort by rank. This gives round-robin ordering — but introduces two serious problems.
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {/* raw queue */}
        <div style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            Raw queue (FIFO order)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {queue.map(t => <TaskPill key={t.id} tenant={t.tenant} id={t.id} />)}
          </div>
        </div>

        {/* after partition */}
        <div style={{
          flex: 1, background: showPartitioned ? '#fafff6' : 'var(--bg-2)',
          border: `1px solid ${showPartitioned ? '#bbf7d0' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)', padding: '14px 18px',
          transition: 'all 0.3s',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
            After PARTITION BY (rank order)
          </div>
          {/* scan overlay */}
          {scanHighlight && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent 0%, rgba(22,163,74,0.08) 50%, transparent 100%)',
              animation: 'none',
              pointerEvents: 'none',
            }} />
          )}
          {showPartitioned
            ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {partitioned.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', minWidth: 12, textAlign: 'right' }}>{t.rank}</span>
                    <TaskPill tenant={t.tenant} id={t.id} />
                  </div>
                ))}
              </div>
            : <button onClick={runPartitionQuery} style={{
                padding: '7px 14px', borderRadius: 'var(--radius-md)', fontSize: 13,
                border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--bg)',
              }}>
                Run PARTITION BY query
              </button>
          }
        </div>
      </div>

      {/* problem 1: full scan */}
      <div style={{
        padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 16,
        background: '#fffbeb', border: '1px solid #fde68a',
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#92400e', marginBottom: 4 }}>
          Problem 1 — Full table scan
        </div>
        <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
          The window function must read <strong>every QUEUED row</strong> to compute ranks.
          At 10,000 tasks it's fine. At 25,000+ tasks, the query time exceeds the polling interval
          — workers start missing tasks, the backlog grows, and the system becomes <em>unrecoverable</em>.
        </p>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
          {[
            { rows: '1k',  ms: '12ms',  ok: true  },
            { rows: '10k', ms: '89ms',  ok: true  },
            { rows: '25k', ms: '380ms', ok: false },
            { rows: '50k', ms: '820ms', ok: false },
          ].map(r => (
            <div key={r.rows} style={{
              padding: '6px 10px', borderRadius: 6,
              background: r.ok ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${r.ok ? '#bbf7d0' : '#fecaca'}`,
              color: r.ok ? '#15803d' : '#dc2626',
            }}>
              {r.rows} rows → {r.ms}
            </div>
          ))}
        </div>
      </div>

      {/* problem 2: concurrency */}
      <div style={{
        padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 24,
        background: '#fef2f2', border: '1px solid #fecaca',
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#991b1b', marginBottom: 4 }}>
          Problem 2 — Concurrency deadlock
        </div>
        <p style={{ fontSize: 13, color: '#7f1d1d', lineHeight: 1.6, marginBottom: 12 }}>
          The CTE snapshots the partition before applying <code style={{ fontFamily: 'var(--font-mono)' }}>SKIP LOCKED</code>.
          When 3 workers run simultaneously, they all read the same CTE — workers 2 and 3 try to lock rows
          that worker 1 already holds. They get 0 tasks.
        </p>
        <button onClick={simulateConcurrency} style={{
          padding: '7px 14px', borderRadius: 'var(--radius-md)', fontSize: 13,
          border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', fontWeight: 500,
        }}>
          Simulate 3 workers polling at once
        </button>

        {concurrencyBug && (
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            {workerLogs.map((log, wi) => (
              <div key={wi} style={{
                flex: 1, padding: '10px 12px', borderRadius: 8,
                background: '#fff', border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: WORKER_COLORS[wi], marginBottom: 6 }}>
                  Worker {wi + 1}
                </div>
                {log.map(t => (
                  <div key={t.id} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ color: t.got ? '#16a34a' : '#dc2626' }}>{t.got ? '✓' : '✗'}</span>
                    <TaskPill tenant={t.tenant} id={t.id} />
                    {!t.got && <span style={{ color: 'var(--text-3)', fontSize: 10 }}>locked</span>}
                  </div>
                ))}
                {wi > 0 && (
                  <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626', fontWeight: 500 }}>
                    0 tasks acquired
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* controls */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={processRoundRobin} disabled={queue.length === 0 || !showPartitioned} style={{
          padding: '8px 20px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
          border: '1px solid var(--text-1)', background: 'var(--text-1)', color: '#fff',
          opacity: queue.length === 0 || !showPartitioned ? 0.4 : 1,
        }}>
          Process batch (round-robin)
        </button>
        <button onClick={reset} style={{
          padding: '8px 14px', borderRadius: 'var(--radius-md)', fontSize: 13,
          border: '1px solid var(--border)', color: 'var(--text-2)',
        }}>
          Reset
        </button>
      </div>

      <div style={{ marginTop: 32, padding: '16px 20px', borderRadius: 'var(--radius-md)', background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em' }}>The takeaway</div>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
          Solving fairness at read time is tempting but fragile — it fails under load and under concurrency.
          The real fix is to make the queue <em>already fair</em> at write time, so reads stay a simple <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>ORDER BY id LIMIT n</code>.
        </p>
      </div>
    </div>
  )
}
