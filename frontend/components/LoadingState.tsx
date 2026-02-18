type LoadingStateProps = {
  label?: string
}

export default function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="flex w-full items-center gap-4 rounded-xl p-6 space-glass">
      {/* Orbit loader */}
      <div className="orbit-loader">
        <div className="ring" />
        <div className="ring" />
        <div className="ring" />
        <div className="planet" />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Transmitting from deep space…</p>
      </div>
    </div>
  )
}
