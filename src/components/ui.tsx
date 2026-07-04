import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, CheckCircle2, AlertTriangle, ChevronDown, Info, XCircle, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { useStore } from '../store/useStore'

/* ---------------- Badge ---------------- */
export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral' | 'primary' | 'accent'
const toneMap: Record<Tone, string> = {
  ok: 'bg-ok-50 text-ok',
  warn: 'bg-warn-50 text-warn',
  bad: 'bg-bad-50 text-bad',
  info: 'bg-info-50 text-info',
  primary: 'bg-primary-50 text-primary',
  accent: 'bg-accent-50 text-accent',
  neutral: 'bg-slate-100 text-ink-soft',
}
export function Badge({
  tone = 'neutral',
  children,
  dot,
  className,
}: {
  tone?: Tone
  children: ReactNode
  dot?: boolean
  className?: string
}) {
  return (
    <span className={cn('chip', toneMap[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

/* ---------------- Progress ---------------- */
export function Progress({ value, tone = 'primary' }: { value: number; tone?: Tone }) {
  const bar: Record<string, string> = {
    primary: 'bg-primary',
    ok: 'bg-ok',
    warn: 'bg-warn',
    bad: 'bg-bad',
    accent: 'bg-accent',
    info: 'bg-info',
    neutral: 'bg-slate-400',
  }
  return (
    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', bar[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

/* ---------------- Modal ---------------- */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size]
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full bg-surface rounded-t-2xl sm:rounded-2xl shadow-pop animate-scale-in max-h-[92vh] flex flex-col',
          w,
        )}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-line">
          <div>
            <h3 className="text-base font-semibold text-brand">{title}</h3>
            {subtitle && <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="btn-ghost -mr-1.5 -mt-1.5 p-2 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-line bg-surface-sub rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

/* ---------------- Toaster ---------------- */
const toastIcon = {
  sucesso: CheckCircle2,
  erro: XCircle,
  aviso: AlertTriangle,
  info: Info,
}
const toastTone = {
  sucesso: 'border-l-ok text-ok',
  erro: 'border-l-bad text-bad',
  aviso: 'border-l-warn text-warn',
  info: 'border-l-info text-info',
}
export function Toaster() {
  const { toasts, dismiss } = useStore()
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2.5 w-[340px] max-w-[calc(100vw-2.5rem)]">
      {toasts.map((t) => {
        const Icon = toastIcon[t.tipo]
        return (
          <div
            key={t.id}
            className={cn(
              'card border-l-4 p-3.5 flex gap-3 animate-fade-in shadow-pop',
              toastTone[t.tipo],
            )}
          >
            <Icon className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-brand">{t.titulo}</p>
              {t.texto && <p className="text-xs text-ink-muted mt-0.5">{t.texto}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-ink-muted hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body,
  )
}

/* ---------------- ScanInput (scan-to-confirm) ---------------- */
export function ScanInput({
  expected,
  label = 'Bipe o código',
  placeholder = 'Aguardando leitura…',
  onValid,
  hint,
}: {
  expected: string
  label?: string
  placeholder?: string
  onValid: () => void
  hint?: string
}) {
  const [val, setVal] = useState('')
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle')
  const check = () => {
    if (val.trim().toUpperCase() === expected.toUpperCase()) {
      setState('ok')
      setTimeout(onValid, 450)
    } else {
      setState('err')
    }
  }
  return (
    <div>
      <label className="label">{label}</label>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl border px-3 py-2.5 transition',
          state === 'ok' && 'border-ok bg-ok-50 animate-pulse-ok',
          state === 'err' && 'border-bad bg-bad-50',
          state === 'idle' && 'border-line bg-surface',
        )}
      >
        <span className="text-ink-muted">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14" strokeLinecap="round" />
          </svg>
        </span>
        <input
          autoFocus
          value={val}
          onChange={(e) => {
            setVal(e.target.value)
            setState('idle')
          }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm mono"
        />
        <button onClick={check} className="btn-primary px-3 py-1.5 text-xs">
          Validar
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="text-ink-muted">
          {hint ?? (
            <>
              Esperado: <span className="mono text-ink-soft">{expected}</span>
            </>
          )}
        </span>
        {state === 'err' && <span className="text-bad font-medium">✗ Não confere com o esperado</span>}
        {state === 'ok' && <span className="text-ok font-medium">✓ Validado</span>}
      </div>
    </div>
  )
}

/* ---------------- PageHeader ---------------- */
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-brand tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-muted mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

/* ---------------- Tabs ---------------- */
const TabsCtx = createContext<{ value: string; set: (v: string) => void } | null>(null)
export function Tabs({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <TabsCtx.Provider value={{ value, set: onChange }}>
      <div className="flex items-center gap-1 border-b border-line overflow-x-auto">{children}</div>
    </TabsCtx.Provider>
  )
}
export function Tab({ id, children }: { id: string; children: ReactNode }) {
  const ctx = useContext(TabsCtx)!
  const active = ctx.value === id
  return (
    <button
      onClick={() => ctx.set(id)}
      className={cn(
        'relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer',
        active ? 'text-primary' : 'text-ink-muted hover:text-ink-soft',
      )}
    >
      {children}
      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
    </button>
  )
}

/* ---------------- EmptyState ---------------- */
export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-12 w-12 rounded-2xl bg-surface-sub border border-line flex items-center justify-center text-ink-muted mb-3">
        {icon}
      </div>
      <p className="font-medium text-ink-soft">{title}</p>
      {text && <p className="text-sm text-ink-muted mt-1 max-w-sm">{text}</p>}
    </div>
  )
}

/* ---------------- SelectField ---------------- */
export type SelectFieldOption = {
  value: string
  label: ReactNode
  disabled?: boolean
}

export function SelectField({
  id,
  value,
  onChange,
  options,
  className,
  placeholder = 'Selecione',
}: {
  id?: string
  value: string | number
  onChange: (value: string) => void
  options: SelectFieldOption[]
  className?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({})
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const selectedValue = String(value)
  const selected = options.find((option) => option.value === selectedValue)

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const gap = 6
      const spaceBelow = window.innerHeight - rect.bottom - 12
      const spaceAbove = rect.top - 12
      const maxHeight = Math.max(160, Math.min(280, Math.max(spaceBelow, spaceAbove) - gap))
      const opensUp = spaceBelow < 180 && spaceAbove > spaceBelow

      setMenuStyle({
        left: rect.left,
        top: opensUp ? Math.max(12, rect.top - maxHeight - gap) : rect.bottom + gap,
        width: rect.width,
        maxHeight,
      })
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    updatePosition()
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className={cn('input flex items-center justify-between gap-3 text-left', className)}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-ink-muted')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-primary transition-transform', open && 'rotate-180 text-accent')}
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={menuStyle}
            className="fixed z-[80] overflow-y-auto rounded-2xl border border-line bg-surface p-1 shadow-pop animate-scale-in"
          >
            {options.map((option) => {
              const active = option.value === selectedValue
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={option.disabled}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                    buttonRef.current?.focus()
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                    active
                      ? 'bg-primary-50 text-primary'
                      : 'text-ink-soft hover:bg-slate-50 hover:text-brand',
                    option.disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent',
                  )}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0 text-accent" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
