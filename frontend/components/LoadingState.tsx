type LoadingStateProps = {
  label?: string
}

export default function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      {label}
    </div>
  )
}
