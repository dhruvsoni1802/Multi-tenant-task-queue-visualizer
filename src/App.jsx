import { useState } from 'react'
import './index.css'
import FifoSection    from './sections/FifoSection'
import PartitionSection from './sections/PartitionSection'
import BlockSection   from './sections/BlockSection'
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
      <div style={{ marginBottom: 48 }}>
        <p style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>
          Interactive explainer
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8 }}>
          Fair multi-tenant queues
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 15 }}>
          How Postgres-backed task queues handle fairness — and what goes wrong along the way.
        </p>
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
              color: i === step ? '#fff' : i < step ? 'var(--text-2)' : 'var(--text-1)',
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

      {/* section label */}
      <div style={{ marginBottom: 28, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <span style={{
          fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase',
          color: 'var(--text-3)', marginRight: 12
        }}>
          Step {step + 1} of {STEPS.length}
        </span>
        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{STEPS[step].subtitle}</span>
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
            color: '#fff', background: 'var(--text-1)',
            opacity: step === STEPS.length - 1 ? 0.4 : 1,
          }}
        >
          Next →
        </button>
      </div>
    </div>
  )
}