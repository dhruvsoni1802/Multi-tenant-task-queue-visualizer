import { useState } from 'react'

const BLOCK_LEN = 5
const TENANTS = ['alice', 'bob', 'carol']
const TCOLOR = {
  alice: { bg: 'var(--alice-bg)', border: 'var(--alice-border)', text: 'var(--alice)' },
  bob:   { bg: 'var(--bob-bg)',   border: 'var(--bob-border)',   text: 'var(--bob)' },
  carol: { bg: 'var(--carol-bg)', border: 'var(--carol-border)', text: 'var(--carol)' },
}

function makeState() {
  return { groupPtrs: {}, groupIds: {}, groupIdCounter: 0, maxAssigned: 0, tasks: [] }
}

function enqueueTask(state, tenant) {
  const s = { ...state, groupPtrs: { ...state.groupPtrs }, groupIds: { ...state.groupIds }, tasks: [...state.tasks] }
  if (s.groupIds[tenant] === undefined) s.groupIds[tenant] = s.groupIdCounter++
  const gid = s.groupIds[tenant]
  let ptr = s.groupPtrs[tenant] === undefined
    ? s.maxAssigned
    : Math.max(s.maxAssigned, s.groupPtrs[tenant] + 1)
  s.groupPtrs[tenant] = ptr
  const taskId = gid + BLOCK_LEN * ptr
  s.maxAssigned = Math.max(s.maxAssigned, ptr)
  s.tasks.push({ id: taskId, tenant, blockPtr: ptr, status: 'queued' })
  s.tasks.sort((a, b) => a.id - b.id)
  return s
}

export default function ConcurrencySection() {
  const [state, setState] = useState(() => {
    let s = makeState()
    // pre-load: alice 2, bob 5, carol 1
    ;[...Array(2)].forEach(() => { s = enqueueTask(s, 'alice') })
    ;[...Array(5)].forEach(() => { s = enqueueTask(s, 'bob') })
    s = enqueueTask(s, 'carol')
    return s
  })
  const [limit, setLimit] = useState(2)           // global worker limit
  const [concurrency, setConcurrency] = useState(2) // per-tenant concurrency cap
  const [running, setRunning] = useState([])
  const [done, setDone] = useState([])

  const enqueue = (tenant) => setState(s => enqueueTask(s, tenant))
  const reset = () => {
    let s = makeState()
    ;[...Array(2)].forEach(() => { s = enqueueTask(s, 'alice') })
    ;[...Array(5)].forEach(() => { s = enqueueTask(s, 'bob') })
    s = enqueueTask(s, 'carol')
    setState(s)
    setRunning([])
    setDone([])
  }

  // Dispatch: pick up to `limit` tasks, but no more than `concurrency` per tenant
  const dispatch = () => {
    const alreadyRunningByTenant = {}
    running.forEach(t => { alreadyRunningByTenant[t.tenant] = (alreadyRunningByTenant[t.tenant] || 0) + 1 })

    const eligible = state.tasks.filter(t => {
      const inFlight = alreadyRunningByTenant[t.tenant] || 0
      return inFlight < concurrency
    })

    const slots = limit - running.length
    if (slots <= 0) return

    const toStart = eligible.slice(0, slots)
    if (toStart.length === 0) return

    const startIds = new Set(toStart.map(t => t.id))
    setState(s => ({ ...s, tasks: s.tasks.filter(t => !startIds.has(t.id)) }))
    setRunning(r => [...r, ...toStart])
  }

  const complete = (taskId) => {
    const task = running.find(t => t.id === taskId)
    setRunning(r => r.filter(t => t.id !== taskId))
    setDone(d => [...d, task])
  }

  const tenantStats = TENANTS.map(tenant => ({
    tenant,
    queued:  state.tasks.filter(t => t.tenant === tenant).length,
    running: running.filter(t => t.tenant === tenant).length,
    done:    done.filter(t => t.tenant === tenant).length,
  }))

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>
        Concurrency limits per tenant
      </h2>
      <p style={{ color: 'var(--text-2)', marginBottom: 24, maxWidth: 580 }}>
        Even with fair ordering, one tenant could grab every worker slot.
        Use the sliders to set a global limit and a per-tenant cap, then dispatch and complete tasks.
      </p>

      {/* sliders */}
      <div style={{
        display: 'flex', gap: 20, marginBottom: 28,
        padding: '16px 20px', background: 'var(--bg-2)',
        border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
      }}>
        {[
          { label: 'Global worker slots', value: limit, min: 1, max: 8, set: setLimit },
          { label: 'Per-tenant concurrency cap', value: concurrency, min: 1, max: 5, set: setConcurrency },
        ].map(s => (
          <div key={s.label} style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{s.label}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{s.value}</span>
            </div>
            <input type="range" min={s.min} max={s.max} value={s.value}
              onChange={e => s.set(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--text-1)' }}
            />
          </div>
        ))}
      </div>

      {/* tenant stat table */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Per-tenant status</div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(3, 1fr)', gap: '6px 0', fontSize: 13 }}>
          <div style={{ color: 'var(--text-3)', fontSize: 11 }}></div>
          {['Queued', 'Running', 'Done'].map(h => (
            <div key={h} style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>{h}</div>
          ))}
          {tenantStats.map(({ tenant, queued, running: r, done: d }) => {
            const c = TCOLOR[tenant]
            const atCap = r >= concurrency
            return [
              <div key={`${tenant}-name`} style={{ fontSize: 13, fontWeight: 500, color: c.text, paddingRight: 8, display: 'flex', alignItems: 'center' }}>
                {tenant[0].toUpperCase() + tenant.slice(1)}
                {atCap && <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10, color: '#fbbf24' }}>cap</span>}
              </div>,
              <div key={`${tenant}-q`} style={{ textAlign: 'center', color: 'var(--text-1)' }}>{queued}</div>,
              <div key={`${tenant}-r`} style={{ textAlign: 'center', fontWeight: r > 0 ? 600 : 400, color: r > 0 ? c.text : 'var(--text-3)' }}>{r}</div>,
              <div key={`${tenant}-d`} style={{ textAlign: 'center', color: 'var(--text-3)' }}>{d}</div>,
            ]
          })}
        </div>
      </div>

      {/* running tasks */}
      <div style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 20, minHeight: 80,
      }}>
        <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Running now ({running.length} / {limit} slots used)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {running.length === 0
            ? <span style={{ fontSize: 13, color: 'var(--text-3)' }}>No tasks running</span>
            : running.map(t => {
                const c = TCOLOR[t.tenant]
                return (
                  <button key={t.id} onClick={() => complete(t.id)} title="Click to complete" style={{
                    padding: '5px 12px', borderRadius: 20,
                    background: c.bg, border: `1.5px solid ${c.border}`,
                    color: c.text, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span>{t.tenant[0].toUpperCase()} id={t.id}</span>
                    <span style={{ fontSize: 10, opacity: 0.6 }}>✓ done</span>
                  </button>
                )
              })
          }
        </div>
        {running.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>Click a task to mark it complete</div>
        )}
      </div>

      {/* controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {TENANTS.map(t => (
          <button key={t} onClick={() => enqueue(t)} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: `var(--${t})`,
          }}>
            + {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button onClick={() => { for(let i=0;i<4;i++) enqueue('bob') }} style={{
          padding: '8px 16px', borderRadius: 'var(--radius-md)', fontSize: 13,
          border: '1px solid var(--bob-border)', background: 'var(--bob-bg)',
          color: 'var(--bob)', fontWeight: 500,
        }}>
          Bob ×4
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={dispatch}
          disabled={state.tasks.length === 0 || running.length >= limit}
          style={{
            padding: '8px 20px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
            border: '1px solid var(--text-1)', background: 'var(--text-1)', color: 'var(--bg)',
            opacity: (state.tasks.length === 0 || running.length >= limit) ? 0.4 : 1,
          }}>
          Dispatch batch
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
