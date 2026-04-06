import { useState } from 'react'

const BLOCK_LEN = 5   // simplified from 1M — each "block" holds up to 5 slots
const TENANTS = ['alice', 'bob', 'carol']
const TCOLOR = {
  alice: { bg: 'var(--alice-bg)', border: 'var(--alice-border)', text: 'var(--alice)' },
  bob:   { bg: 'var(--bob-bg)',   border: 'var(--bob-border)',   text: 'var(--bob)' },
  carol: { bg: 'var(--carol-bg)', border: 'var(--carol-border)', text: 'var(--carol)' },
}

function makeState() {
  return {
    groupPtrs: {},    // p(i): last block pointer per group
    groupIds: {},     // numeric id per group
    groupIdCounter: 0,
    maxAssigned: 0,   // p_max_assigned
    tasks: [],
  }
}

function enqueueTask(state, tenant) {
  const s = { ...state, groupPtrs: { ...state.groupPtrs }, groupIds: { ...state.groupIds }, tasks: [...state.tasks] }

  // assign numeric group id if new
  if (s.groupIds[tenant] === undefined) {
    s.groupIds[tenant] = s.groupIdCounter++
  }
  const gid = s.groupIds[tenant]

  let ptr
  if (s.groupPtrs[tenant] === undefined) {
    // new group: start at p_max_assigned
    ptr = s.maxAssigned
  } else {
    // existing group: advance to next block (or stay ahead of max)
    ptr = Math.max(s.maxAssigned, s.groupPtrs[tenant] + 1)
  }
  s.groupPtrs[tenant] = ptr

  const taskId = gid + BLOCK_LEN * ptr
  s.maxAssigned = Math.max(s.maxAssigned, ptr)
  s.tasks.push({ id: taskId, tenant, blockPtr: ptr, gid })
  s.tasks.sort((a, b) => a.id - b.id)
  return s
}

export default function BlockSection() {
  const [state, setState] = useState(makeState())
  const [processed, setProcessed] = useState([])
  const [lastEnqueued, setLastEnqueued] = useState(null)

  const enqueue = (tenant) => {
    setState(s => {
      const next = enqueueTask(s, tenant)
      const newest = next.tasks[next.tasks.length - 1]
      // find the actual newly added task (by id)
      const added = next.tasks.find(t =>
        t.tenant === tenant && !s.tasks.find(old => old.id === t.id)
      )
      setLastEnqueued(added ? added.id : null)
      return next
    })
  }

  const addBobBurst = () => {
    setState(s => {
      let next = s
      for (let i = 0; i < 5; i++) next = enqueueTask(next, 'bob')
      return next
    })
    setLastEnqueued(null)
  }

  const dequeue = () => {
    if (state.tasks.length === 0) return
    const [first, ...rest] = state.tasks
    setProcessed(p => [...p, first])
    setState(s => ({ ...s, tasks: rest }))
    setLastEnqueued(null)
  }

  const reset = () => {
    setState(makeState())
    setProcessed([])
    setLastEnqueued(null)
  }

  // build block grid for visualization
  const maxBlock = Math.max(
    ...Object.values(state.groupPtrs),
    processed.length > 0 ? Math.max(...processed.map(t => t.blockPtr)) : 0,
    1
  )
  const blocks = Array.from({ length: maxBlock + 2 }, (_, b) => ({
    blockIdx: b,
    slots: TENANTS.map(tenant => {
      const gid = state.groupIds[tenant]
      if (gid === undefined) return { tenant, id: null, status: 'empty' }
      const expectedId = gid + BLOCK_LEN * b
      const inQueue = state.tasks.find(t => t.id === expectedId)
      const isDone  = processed.find(t => t.id === expectedId)
      if (inQueue) return { tenant, id: expectedId, status: 'queued' }
      if (isDone)  return { tenant, id: expectedId, status: 'done' }
      return { tenant, id: expectedId, status: 'empty' }
    })
  }))

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>
        Write-time fix: block sequencing
      </h2>
      <p style={{ color: 'var(--text-2)', marginBottom: 24, maxWidth: 580 }}>
        Assign IDs at <em>write time</em> so a plain <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>ORDER BY id</code> is already round-robin.
        Each tenant gets one slot per block: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 3 }}>id = group_id + block_size × block_ptr</code>.
        Add tasks and watch the grid fill in interleaved order.
      </p>

      {/* block grid */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 18px', marginBottom: 20, overflowX: 'auto',
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          ID space — block size = {BLOCK_LEN}
        </div>

        {/* header */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 8, minWidth: 400 }}>
          <div style={{ width: 60, fontSize: 11, color: 'var(--text-3)' }}>Block</div>
          {TENANTS.map(t => (
            <div key={t} style={{ flex: 1, fontSize: 11, fontWeight: 500, color: `var(--${t})`, textTransform: 'capitalize' }}>
              {t} (g={state.groupIds[t] ?? '?'})
            </div>
          ))}
        </div>

        {blocks.map(({ blockIdx, slots }) => (
          <div key={blockIdx} style={{
            display: 'flex', alignItems: 'center', gap: 0,
            padding: '6px 0', borderTop: '1px solid var(--border)', minWidth: 400,
          }}>
            <div style={{ width: 60, fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              b={blockIdx}
            </div>
            {slots.map(({ tenant, id, status }) => {
              const c = TCOLOR[tenant]
              const isNew = id === lastEnqueued
              return (
                <div key={tenant} style={{ flex: 1 }}>
                  {id !== null && status !== 'empty' ? (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 9px', borderRadius: 20,
                      background: status === 'done' ? 'var(--bg-3)' : c.bg,
                      border: `${isNew ? 2 : 1}px solid ${status === 'done' ? 'var(--border)' : c.border}`,
                      fontSize: 11, fontWeight: 500,
                      color: status === 'done' ? 'var(--text-3)' : c.text,
                      textDecoration: status === 'done' ? 'line-through' : 'none',
                      transition: 'all 0.2s',
                    }}>
                      id={id}
                      {status === 'done' && <span style={{ fontSize: 10 }}>✓</span>}
                    </div>
                  ) : (
                    <div style={{
                      display: 'inline-flex', padding: '3px 9px',
                      borderRadius: 20, border: '1px dashed var(--border)',
                      fontSize: 11, color: 'var(--text-3)',
                    }}>
                      {id !== null ? `id=${id}` : '—'}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* sorted queue (what worker sees) */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Worker view — simple <code style={{ fontFamily: 'var(--font-mono)' }}>ORDER BY id</code> → already round-robin
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {state.tasks.length === 0
            ? <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Queue empty</span>
            : state.tasks.map(t => {
                const c = TCOLOR[t.tenant]
                return (
                  <div key={t.id} style={{
                    padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                    background: c.bg, border: `1px solid ${c.border}`, color: c.text,
                  }}>
                    {t.tenant[0].toUpperCase()} id={t.id}
                  </div>
                )
              })
          }
        </div>
      </div>

      {/* processed */}
      {processed.length > 0 && (
        <div style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 20,
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Processed</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {processed.map(t => {
              const c = TCOLOR[t.tenant]
              return (
                <div key={t.id} style={{
                  padding: '3px 9px', borderRadius: 20, fontSize: 11,
                  background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-3)',
                  textDecoration: 'line-through',
                }}>
                  {t.tenant[0].toUpperCase()} id={t.id}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {TENANTS.map(t => (
          <button key={t} onClick={() => enqueue(t)} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: `var(--${t})`,
          }}>
            + {t[0].toUpperCase() + t.slice(1)} task
          </button>
        ))}
        <button onClick={addBobBurst} style={{
          padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13,
          border: '1px solid var(--bob-border)', background: 'var(--bob-bg)',
          color: 'var(--bob)', fontWeight: 500,
        }}>
          Bob uploads 5 files
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={dequeue} disabled={state.tasks.length === 0} style={{
          padding: '8px 20px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
          border: '1px solid var(--text-1)', background: 'var(--text-1)', color: 'var(--bg)',
          opacity: state.tasks.length === 0 ? 0.4 : 1,
        }}>
          Process next
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
