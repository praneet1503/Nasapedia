'use client'
import { type ReactNode } from 'react'
type IntelCardProps = {
  title: string
  subtitle?: string
  status?: 'warning' | 'critical' | 'info'
  className?: string
  children: ReactNode
  headerRight?: ReactNode
}

const STATUS_COLORS = {
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
  info: 'bg-amber-500',
}

export function IntelCard({ title, subtitle, status, className = '', children, headerRight }: IntelCardProps) {
  return (
    <div className={`intel-card ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {status && (
            <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[status]} shadow-[0_0_6px] ${status === 'warning' ? 'shadow-amber-500/50' : status === 'critical' ? 'shadow-red-500/50' : 'shadow-amber-500/50'}`} />
          )}
          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
            {title}
          </h3>
        </div>
        {headerRight}
        {subtitle && (
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}


type MetricProps = {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'flat'
  trendValue?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Metric({ label, value, unit, trend, trendValue, size = 'md' }: MetricProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={`${sizeClasses[size]} font-bold font-mono text-[var(--text-primary)]`}>
          {value}
        </span>
        {unit && <span className="text-xs text-[var(--text-muted)]">{unit}</span>}
        {trend && trendValue && (
          <span className={`text-xs font-mono ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '─'} {trendValue}
          </span>
        )}
      </div>
    </div>
  )
}

type StatusBadgeProps = {
  label: string
  variant: 'green' | 'yellow' | 'red' | 'gold' | 'purple'
}

const BADGE_STYLES = {
  green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  yellow: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  red: 'bg-red-500/15 text-red-400 border-red-500/25',
  gold: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
}

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  if (!label) return null
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em] border ${BADGE_STYLES[variant]}`}>
      {label}
    </span>
  )
}

type IndexGaugeProps = {
  label: string
  value: number 
  icon?: string
}

export function IndexGauge({ label, value, icon }: IndexGaugeProps) {
  const color = value >= 70 ? 'var(--danger)' : value >= 40 ? 'var(--warm)' : 'var(--accent)'
  const percentage = Math.min(Math.max(value, 0), 100)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
          {icon && <span className="mr-1">{icon}</span>}
          {label}
        </span>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--space-deep)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 8px ${color}44`,
          }}
        />
      </div>
    </div>
  )
}


type AlertBannerProps = {
  message: string
  type: 'surge' | 'escalation' | 'expansion' | 'info'
}

const ALERT_STYLES = {
  surge: 'border-amber-500/30 bg-amber-500/8 text-amber-300',
  escalation: 'border-red-500/30 bg-red-500/8 text-red-300',
  expansion: 'border-amber-500/30 bg-amber-500/8 text-amber-300',
  info: 'border-[var(--border)] bg-[var(--space-surface)] text-[var(--text-secondary)]',
}

const ALERT_ICONS = {
  surge: '⚡',
  escalation: '🔴',
  expansion: '📡',
  info: 'ℹ️',
}

export function AlertBanner({ message, type }: AlertBannerProps) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono tracking-wide ${ALERT_STYLES[type]}`}>
      <span>{ALERT_ICONS[type]}</span>
      <span className="uppercase">{message}</span>
    </div>
  )
}

export function IntelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-[var(--space-elevated)]" style={{ width: `${80 - i * 15}%` }} />
      ))}
    </div>
  )
}

export function IntelError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
        <span className="text-red-400 text-lg">✕</span>
      </div>
      <p className="text-xs text-[var(--text-muted)] max-w-xs">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="space-btn text-xs px-3 py-1">
          RETRY
        </button>
      )}
    </div>
  )
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--accent)]">{title}</h2>
      {description && (
        <p className="text-xs text-[var(--text-muted)] mt-1">{description}</p>
      )}
    </div>
  )
}
