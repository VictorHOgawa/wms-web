import { useEffect, useState } from 'react'
import { ClipboardCheck, RotateCcw, PackageSearch } from 'lucide-react'
import {
  isConnected,
  wmsApi,
  type WmsStockPositionDTO,
  type WmsTarefaArmazemDTO,
} from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader, type Tone } from '../components/ui'
import { num } from '../lib/utils'

const STATUS_TONE: Record<string, Tone> = { AVAILABLE: 'info', COMPLETED: 'ok', DONE: 'ok' }

/**
 * Inventário rotativo (base): a torre dispara uma contagem CEGA de uma posição;
 * o coletor conta e o handler ajusta a divergência. Disparo automático por
 * política (frequência, curva) é o tuning posterior (Alex).
 */
export default function Inventario() {
  const conectado = isConnected()
  const [posicoes, setPosicoes] = useState<WmsStockPositionDTO[]>([])
  const [contagens, setContagens] = useState<WmsTarefaArmazemDTO[]>([])
  const [loading, setLoading] = useState(conectado)
  const [msg, setMsg] = useState<string | null>(null)

  const carregar = async () => {
    try {
      const [pos, ct] = await Promise.all([wmsApi.stockPositions(), wmsApi.contagens()])
      setPosicoes(pos)
      setContagens(ct)
    } catch { /* mantém */ } finally { setLoading(false) }
  }
  useEffect(() => { if (conectado) carregar() /* eslint-disable-next-line */ }, [conectado])

  const contar = async (pos: WmsStockPositionDTO) => {
    setMsg(null)
    try {
      const r = await wmsApi.gerarContagem({ positionId: pos.id })
      setMsg(`Contagem ${r.code} disparada — ${pos.addressCode} (${pos.skuCode}). Cai no coletor (cega).`)
      await carregar()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Falha ao disparar contagem.') }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Inventário rotativo" subtitle="Dispara contagem cega de uma posição; o coletor conta e o sistema ajusta a divergência">
        {conectado ? <Badge tone="ok">{num(contagens.length)} contagens · WMS</Badge> : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      {msg && <div className="card p-3 text-sm text-ink-soft">{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-muted">Posições com saldo</div>
          {posicoes.length === 0 ? (
            <EmptyState icon={<PackageSearch className="h-6 w-6" />} title={loading ? 'Carregando…' : 'Nenhuma posição'} text="Posições com estoque aparecem aqui para inventário." />
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {posicoes.filter((p) => p.quantity > 0).map((p) => (
                <li key={p.id} className="px-4 py-2.5 border-b border-line flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="mono text-sm text-brand">{p.skuCode}</div>
                    <div className="text-[11px] text-ink-muted">{p.addressCode} · {p.addressType} · {num(p.quantity)} {p.unit}</div>
                  </div>
                  <button className="btn-outline text-xs" onClick={() => contar(p)}>
                    <RotateCcw className="h-4 w-4" /> Contar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-muted">Contagens disparadas</div>
          {contagens.length === 0 ? (
            <EmptyState icon={<ClipboardCheck className="h-6 w-6" />} title="Nenhuma contagem" text="Dispare uma contagem à esquerda; ela cai no coletor (cega)." />
          ) : (
            <table className="w-full text-sm">
              <thead><tr>
                <th className="th">O.S</th><th className="th">SKU</th><th className="th">Endereço</th><th className="th">Resultado</th>
              </tr></thead>
              <tbody>
                {contagens.map((t) => {
                  const done = t.done as { sistemico?: number; contado?: number; divergencia?: number; ajustado?: boolean } | null
                  return (
                    <tr key={t.eventId} className="row-hover">
                      <td className="td mono text-xs text-brand">{t.code}</td>
                      <td className="td mono text-xs">{t.skuCode ?? '—'}</td>
                      <td className="td mono text-xs text-ink-soft">{t.suggestedAddressCode ?? t.fromAddressCode ?? '—'}</td>
                      <td className="td">
                        {done
                          ? (done.divergencia === 0
                            ? <Badge tone="ok" dot>confere ({num(done.contado ?? 0)})</Badge>
                            : <Badge tone="warn">div. {(done.divergencia ?? 0) > 0 ? '+' : ''}{num(done.divergencia ?? 0)} (ajustado)</Badge>)
                          : <Badge tone={STATUS_TONE[t.status] ?? 'neutral'} dot>{t.status === 'AVAILABLE' ? 'no coletor' : t.status}</Badge>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
