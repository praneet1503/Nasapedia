type LoadingStateProps = {
  label?: string
}

export default function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="loading-panel">
      <div className="orbit-loader">
        <div className="ring" />
        <div className="ring" />
        <div className="ring" />
        <div className="planet" />
      </div>
      <div className="loading-panel__copy">
        <span className="loading-panel__eyebrow">Signal handshake</span>
        <p className="loading-panel__title">{label}</p>
        <p className="loading-panel__body">Transmitting from deep space through the Nasapedia command grid…</p>
      </div>
    </div>
  )
}
