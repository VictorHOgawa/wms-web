import { useEffect, useMemo, useState } from 'react'
import { Timer, AlertTriangle, PackageSearch } from 'lucide-react'
import { isConnected, wmsApi, type WmsCargaPisoDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader } from '../components/ui'
import { num } from '../lib/utils'

/**
 * Free time (H · decisão 25): cronômetro das cargas paradas no piso do cross-dock.
 * Base — visibilidade + alerta de estouro. O free time (horas) é ajustável aqui;
 * a transferência plena para armazenagem é a fase posterior.
 */
export default function FreeTime() {
  const conectado = isConnected()
  const [horas, setHoras] = useState(24)
  const [cargas, setCargas] = useState<WmsCargaPisoDTO[]>([])
  const [loading, setLoading] = useState(conectado)

  useEffect(() => {
    if (!conectado) return
    let vivo = true
    setLoading(true)
    wmsApi.cargasEmPiso(horas)
      .then((c) => { if (vivo) setCargas(c) })
      .catch(() => { /* mantém */ })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
  }, [conectado, horas])

  const estouradas = useMemo(() => cargas.filter((c) => c.estourou), [cargas])

  return (
    <div className="space-y-6">
      <PageHeader title="Free time (cross-dock)" subtitle="Cronômetro das cargas paradas no piso; alerta quando estoura o free time (→ armazenagem)">
        {conectado ? (
          estouradas.length > 0
            ? <Badge tone="bad">{num(estouradas.length)} estouradas</Badge>
            : <Badge tone="ok">{num(cargas.length)} no piso</Badge>
        ) : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      <div className="card p-3 flex items-center gap-3 text-sm">
        <Timer className="h-4 w-4 text-ink-muted" />
        <span className="text-ink-soft">Free time padrão</span>
        <input
          type="number"
          value={horas}
          min={1}
          onChange={(e) => setHoras(Math.max(1, Number(e.target.value) || 24))}
          className="w-20 rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-sm outline-none"
        />
        <span className="text-ink-muted">horas — ajustável por contrato depois (ex.: Electrolux 7 dias)</span>
      </div>

      <div className="card overflow-hidden">
        {cargas.length === 0 ? (
          <EmptyState icon={<PackageSearch className="h-6 w-6" />} title={loading ? 'Carregando…' : 'Nenhuma carga no piso'} text="Cargas recebidas em piso (cross-dock) aparecem aqui com o cronômetro." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className="th">Documento</th><th className="th">Unidade</th><th className="th text-right">Volumes</th>
                <th className="th text-right">No piso</th><th className="th">Free time</th>
              </tr></thead>
              <tbody>
                {cargas.map((c) => (
                  <tr key={c.floorStockId} className="row-hover">
                    <td className="td mono text-xs text-brand">{c.docType} · {c.fiscalDocumentId.slice(0, 8)}</td>
                    <td className="td text-ink-soft">{c.unidade ?? '—'}</td>
                    <td className="td text-right mono">{num(c.volumes)}</td>
                    <td className="td text-right mono font-medium">{c.horasNoPiso}h</td>
                    <td className="td">
                      {c.estourou
                        ? <Badge tone="bad"><AlertTriangle className="h-3 w-3" /> estourou (+{Math.round((c.horasNoPiso - c.freeTimeHoras) * 10) / 10}h)</Badge>
                        : <Badge tone="ok" dot>restam {c.horasRestantes}h</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
