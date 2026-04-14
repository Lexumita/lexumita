import { ArrowLeft, AlertCircle, SearchX } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/* ── PageHeader ─────────────────────────────────────────────── */
export function PageHeader({ label, title, subtitle, action }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        {label && <p className="section-label mb-2">{label}</p>}
        <h1 className="font-display text-4xl font-light text-nebbia">{title}</h1>
        {subtitle && <p className="font-body text-sm text-nebbia/40 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

/* ── BackButton ─────────────────────────────────────────────── */
export function BackButton({ to, label = 'Indietro' }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => to ? navigate(to) : navigate(-1)}
      className="flex items-center gap-2 font-body text-sm text-nebbia/40 hover:text-oro transition-colors mb-6"
    >
      <ArrowLeft size={15} />
      {label}
    </button>
  )
}

/* ── StatCard ───────────────────────────────────────────────── */
export function StatCard({ label, value, sub, colorClass = 'text-oro', icon: Icon }) {
  return (
    <div className="bg-slate border border-white/5 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className={`font-display text-3xl font-semibold ${colorClass}`}>{value}</p>
          <p className="font-body text-xs text-nebbia/40 tracking-widest uppercase mt-1">{label}</p>
          {sub && <p className="font-body text-xs text-nebbia/25 mt-0.5">{sub}</p>}
        </div>
        {Icon && <Icon size={18} className="text-nebbia/15 mt-1" />}
      </div>
    </div>
  )
}

/* ── Badge ──────────────────────────────────────────────────── */
const BADGE_VARIANTS = {
  oro:     'bg-oro/15 text-oro border-oro/30',
  salvia:  'bg-salvia/15 text-salvia border-salvia/30',
  red:     'bg-red-900/20 text-red-400 border-red-500/30',
  gray:    'bg-white/5 text-nebbia/40 border-white/10',
  warning: 'bg-amber-900/20 text-amber-400 border-amber-500/30',
}

export function Badge({ label, variant = 'gray' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-body border ${BADGE_VARIANTS[variant] ?? BADGE_VARIANTS.gray}`}>
      {label}
    </span>
  )
}

/* ── EmptyState ─────────────────────────────────────────────── */
export function EmptyState({ icon: Icon = SearchX, title = 'Nessun risultato', desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={36} className="text-nebbia/10 mb-4" />
      <p className="font-display text-xl font-light text-nebbia/40 mb-2">{title}</p>
      {desc && <p className="font-body text-sm text-nebbia/25 max-w-xs">{desc}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/* ── LoadingSpinner ─────────────────────────────────────────── */
export function LoadingSpinner({ fullPage = false }) {
  const el = <div className="w-6 h-6 border-2 border-oro border-t-transparent rounded-full animate-spin" />
  if (fullPage) {
    return <div className="flex items-center justify-center min-h-[300px]">{el}</div>
  }
  return el
}

/* ── InputField ─────────────────────────────────────────────── */
export function InputField({ label, error, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{label}</label>
      )}
      <input
        className={`w-full bg-petrolio border ${error ? 'border-red-500/60' : 'border-white/10'} text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25`}
        {...props}
      />
      {error && <p className="mt-1 font-body text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  )
}

/* ── TextareaField ──────────────────────────────────────────── */
export function TextareaField({ label, error, rows = 4, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{label}</label>
      )}
      <textarea
        rows={rows}
        className={`w-full bg-petrolio border ${error ? 'border-red-500/60' : 'border-white/10'} text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors placeholder:text-nebbia/25 resize-none`}
        {...props}
      />
      {error && <p className="mt-1 font-body text-xs text-red-400 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  )
}

/* ── SelectField ────────────────────────────────────────────── */
export function SelectField({ label, error, children, className = '', ...props }) {
  return (
    <div className={className}>
      {label && (
        <label className="block font-body text-xs text-nebbia/50 tracking-widest uppercase mb-2">{label}</label>
      )}
      <select
        className={`w-full bg-petrolio border ${error ? 'border-red-500/60' : 'border-white/10'} text-nebbia font-body text-sm px-4 py-3 outline-none focus:border-oro/50 transition-colors`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 font-body text-xs text-red-400">{error}</p>}
    </div>
  )
}

/* ── Table ──────────────────────────────────────────────────── */
export function Table({ headers, children, loading, empty }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {headers.map(h => (
              <th key={h} className="px-4 py-3 text-left font-body text-xs font-medium text-nebbia/30 tracking-widest uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={headers.length} className="px-4 py-12 text-center"><LoadingSpinner /></td></tr>
          ) : !children || (Array.isArray(children) && children.length === 0) ? (
            <tr><td colSpan={headers.length}>{empty ?? <EmptyState />}</td></tr>
          ) : children}
        </tbody>
      </table>
    </div>
  )
}

/* ── Tr (table row) ─────────────────────────────────────────── */
export function Tr({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-white/5 transition-colors ${onClick ? 'cursor-pointer hover:bg-petrolio/40' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 font-body text-sm text-nebbia/70 ${className}`}>{children}</td>
}
