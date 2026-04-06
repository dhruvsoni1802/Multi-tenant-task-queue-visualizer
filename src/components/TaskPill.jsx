const COLORS = {
  alice: { bg: 'var(--alice-bg)', border: 'var(--alice-border)', text: 'var(--alice)' },
  bob:   { bg: 'var(--bob-bg)',   border: 'var(--bob-border)',   text: 'var(--bob)'   },
  carol: { bg: 'var(--carol-bg)', border: 'var(--carol-border)', text: 'var(--carol)' },
}

export default function TaskPill({ tenant, id, dim }) {
  const c = COLORS[tenant] || COLORS.alice
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 20,
      background: c.bg, border: `1px solid ${c.border}`,
      fontSize: 11, fontWeight: 500, color: c.text,
      opacity: dim ? 0.3 : 1,
      transition: 'opacity 0.3s',
      whiteSpace: 'nowrap',
    }}>
      <span>{tenant[0].toUpperCase()}</span>
      <span style={{ opacity: 0.6 }}>#{id}</span>
    </div>
  )
}