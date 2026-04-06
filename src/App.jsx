import { useState } from 'react'
import './index.css'
import FifoSection from './sections/FifoSection'
import PartitionSection from './sections/PartitionSection'
import BlockSection from './sections/BlockSection'
import ConcurrencySection from './sections/ConcurrencySection'

const STEPS = [
  { id: 'fifo',        label: 'FIFO starvation',     subtitle: 'The problem' },
  { id: 'partition',   label: 'PARTITION BY',         subtitle: 'Read-time fix & its bug' },
  { id: 'block',       label: 'Block sequencing',     subtitle: 'Write-time fix' },
  { id: 'concurrency', label: 'Concurrency limits',   subtitle: 'Per-tenant fairness' },
]

export default function App() {
  const [step, setStep] = useState(0)

  const prev = () => setStep(s => Math.max(0, s - 1))
  const next = () => setStep(s => Math.min(STEPS.length - 1, s + 1))

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px' }}>

      {/* header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 6 }}>
          Fair multi-tenant queues
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          A walkthrough of how task queues can starve tenants — and how to fix it.
        </p>
      </div>

      {/* context */}
      <div style={{
        marginBottom: 36, padding: '18px 22px',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 16 }}>
          Three customers share the same pool of background workers.
          Bob is a power user — he queues a lot of tasks at once.
          With a naive queue, his jobs can completely block Alice and Carol,
          even if they only have one task each.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { t: 'alice', label: 'Alice', note: 'light user — 1–2 tasks' },
            { t: 'bob',   label: 'Bob',   note: 'power user — floods the queue' },
            { t: 'carol', label: 'Carol', note: 'light user — 1 task' },
          ].map(({ t, label, note }) => (
            <div key={t} style={{
              flex: 1, minWidth: 120, padding: '10px 14px',
              background: `var(--${t}-bg)`, border: `1px solid var(--${t}-border)`,
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: `var(--${t})`, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* step nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(i)}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: i === step
                ? '1.5px solid var(--text-1)'
                : '1px solid var(--border)',
              background: i === step ? 'var(--text-1)' : 'var(--bg)',
              color: i === step ? 'var(--bg)' : i < step ? 'var(--text-2)' : 'var(--text-1)',
              fontSize: 12,
              fontWeight: 500,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>0{i + 1}</div>
            <div style={{ lineHeight: 1.3 }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* active section */}
      <div>
        {step === 0 && <FifoSection />}
        {step === 1 && <PartitionSection />}
        {step === 2 && <BlockSection />}
        {step === 3 && <ConcurrencySection />}
      </div>

      {/* prev / next */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 52 }}>
        <button
          onClick={prev}
          disabled={step === 0}
          style={{
            padding: '10px 20px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', fontSize: 14,
            color: step === 0 ? 'var(--text-3)' : 'var(--text-1)',
            background: 'var(--bg)',
            opacity: step === 0 ? 0.4 : 1,
          }}
        >
          ← Previous
        </button>
        <button
          onClick={next}
          disabled={step === STEPS.length - 1}
          style={{
            padding: '10px 20px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--text-1)', fontSize: 14,
            color: 'var(--bg)', background: 'var(--text-1)',
            opacity: step === STEPS.length - 1 ? 0.4 : 1,
          }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}