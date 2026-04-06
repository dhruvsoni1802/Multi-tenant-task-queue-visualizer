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

const WORKER_COLORS = ['#a78bfa', '#38bdf8', '#fb923c']

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
      <p style={{ color: 'var(--text-2)', marginBottom: 24, maxWidth: 580 }}>
        Use a window function to rank tasks per tenant, then sort by rank — instant round-robin.
        Click <em>Run PARTITION BY query</em> to see the reordering, then spot the two problems below.
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
          flex: 1, background: showPartitioned ? 'var(--bob-bg)' : 'var(--bg-2)',
          border: `1px solid ${showPartitioned ? 'var(--bob-border)' : 'var(--border)'}`,
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
        padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 12,
        background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#fbbf24', marginBottom: 3 }}>
          Problem 1 — Full table scan
        </div>
        <p style={{ fontSize: 13, color: '#d97706', lineHeight: 1.5 }}>
          The window function must read <strong>every queued row</strong> to assign ranks.
          At 25k+ tasks the query time exceeds the polling interval — the backlog never drains.
        </p>
      </div>

      {/* problem 2: concurrency */}
      <div style={{
        padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: 24,
        background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#f87171', marginBottom: 4 }}>
          Problem 2 — Concurrency deadlock
        </div>
        <p style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.5, marginBottom: 12 }}>
          The CTE snapshots the ranked list before <code style={{ fontFamily: 'var(--font-mono)' }}>SKIP LOCKED</code> runs.
          All 3 workers read the same snapshot and race for the same rows — workers 2 and 3 get nothing.
        </p>
        <button onClick={simulateConcurrency} style={{
          padding: '7px 14px', borderRadius: 'var(--radius-md)', fontSize: 13,
          border: '1px solid var(--carol-border)', background: 'var(--carol-bg)', color: 'var(--carol)', fontWeight: 500,
        }}>
          Simulate 3 workers polling at once
        </button>

        {concurrencyBug && (
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            {workerLogs.map((log, wi) => (
              <div key={wi} style={{
                flex: 1, padding: '10px 12px', borderRadius: 8,
                background: 'var(--bg-3)', border: '1px solid var(--border)',
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
          border: '1px solid var(--text-1)', background: 'var(--text-1)', color: 'var(--bg)',
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

    </div>
  )
}
