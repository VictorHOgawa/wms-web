import icon from '../assets/brand/integra-icon.png'
import { cn } from '../lib/utils'

export function Brand({
  className,
  showText = true,
  textClass,
  variant = 'dark',
}: {
  className?: string
  showText?: boolean
  textClass?: string
  /** 'dark' = texto marinho (fundo claro) · 'light' = texto branco (fundo escuro) */
  variant?: 'dark' | 'light'
}) {
  const light = variant === 'light'
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'grid place-items-center rounded-lg bg-white shadow-sm ring-1 ring-black/5 p-1',
          className,
        )}
      >
        <img src={icon} alt="Integra WMS" className="h-7 w-7 object-contain" />
      </span>
      {showText && (
        <div className="leading-none">
          <div
            className={cn(
              'font-bold tracking-tight text-lg',
              light ? 'text-white' : 'text-brand',
              textClass,
            )}
          >
            INTEGRA<span className="text-accent"> WMS</span>
          </div>
          <div
            className={cn(
              'text-[10px] uppercase tracking-[0.18em] mt-0.5',
              light ? 'text-white/60' : 'text-ink-muted',
            )}
          >
            Warehouse OS
          </div>
        </div>
      )}
    </div>
  )
}
