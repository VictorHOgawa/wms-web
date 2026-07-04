import { useEffect, useMemo, useState } from 'react'
import { ScanLine, PackageSearch, ArrowRight, Send } from 'lucide-react'
import {
  isConnected,
  wmsApi,
  type WmsSeparacaoDTO,
  type WmsStockPositionDTO,
} from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader, type Tone } from '../components/ui'
import { num } from '../lib/utils'

const STATUS_TONE: Record<string, Tone> = { AVAILABLE: 'info', COMPLETED: 'ok', DONE: 'ok' }

/**
 * Separação / Picking (Fluxo 6): a torre despacha uma separação a partir de uma
 * posição de picking (o coletor executa e baixa o estoque). Enquanto o picking
 * não nasce automático da viagem, o supervisor gera manualmente (decisão 21).
 */
export default function Separacao() {
  const conectado = isConnected()
  const [posicoes, setPosicoes] = useState<WmsStockPositionDTO[]>([])
  const [seps, setSeps] = useState<WmsSeparacaoDTO[]>([])
  const [loading, setLoading] = useState(conectado)
  const [msg, setMsg] = useState<string | null>(null)

  const carregar = async () => {
    try {
      const [pos, sp] = await Promise.all([wmsApi.stockPositions(), wmsApi.separacoes()])
      setPosicoes(pos)
      setSeps(sp)
    } catch { /* mantém */ } finally { setLoading(false) }
  }
  useEffect(() => { if (conectado) carregar() /* eslint-disable-next-line */ }, [conectado])

  const pickables = useMemo(
    () => posicoes.filter((p) => p.addressType === 'PICKING' && p.status === 'DISPONIVEL' && p.quantity > 0),
    [posicoes],
  )

  const gerar = async (pos: WmsStockPositionDTO, qtd: number) => {
    setMsg(null)
    try {
      const r = await wmsApi.gerarSeparacao({ positionId: pos.id, quantity: qtd })
      setMsg(`Separação ${r.code} gerada — ${qtd} un de ${pos.skuCode}. Cai no coletor.`)
      await carregar()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Falha ao gerar separação.') }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Separação (picking)" subtitle="Despacha a separação de uma posição de picking; o coletor executa e baixa o estoque">
        {conectado ? <Badge tone="ok">{num(seps.length)} separações · WMS</Badge> : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      {msg && <div className="card p-3 text-sm text-ink-soft">{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Posições de picking disponíveis
          </div>
          {pickables.length === 0 ? (
            <EmptyState icon={<PackageSearch className="h-6 w-6" />} title={loading ? 'Carregando…' : 'Nenhuma posição de picking'} text="Guarde estoque em endereços de PICKING para separar." />
          ) : (
            <ul>
              {pickables.map((p) => <LinhaPosicao key={p.id} pos={p} onGerar={gerar} />)}
            </ul>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Separações despachadas
          </div>
          {seps.length === 0 ? (
            <EmptyState icon={<ScanLine className="h-6 w-6" />} title="Nenhuma separação" text="Gere uma separação à esquerda; ela cai no coletor do operador." />
          ) : (
            <table className="w-full text-sm">
              <thead><tr>
                <th className="th">O.S</th><th className="th">SKU</th><th className="th text-right">Qtd</th><th className="th">Status</th>
              </tr></thead>
              <tbody>
                {seps.map((s) => (
                  <tr key={s.eventId} className="row-hover">
                    <td className="td mono text-xs text-brand">{s.code}</td>
                    <td className="td mono text-xs">{s.skuCode ?? '—'}<span className="block text-ink-muted">{s.fromAddressCode}</span></td>
                    <td className="td text-right mono">{num(s.quantidade)}{s.separado != null ? ` → ${num(s.separado)}` : ''}</td>
                    <td className="td">
                      <Badge tone={STATUS_TONE[s.status] ?? 'neutral'} dot>{s.status === 'AVAILABLE' ? 'no coletor' : 'concluída'}</Badge>
                      {s.parcial ? <Badge tone="warn">parcial</Badge> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function LinhaPosicao({ pos, onGerar }: { pos: WmsStockPositionDTO; onGerar: (p: WmsStockPositionDTO, qtd: number) => void }) {
  const [qtd, setQtd] = useState('')
  const n = Number(qtd) || 0
  return (
    <li className="px-4 py-2.5 border-b border-line flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex-1 min-w-[160px]">
        <div className="mono text-sm text-brand">{pos.skuCode}</div>
        <div className="text-[11px] text-ink-muted">{pos.addressCode} · {num(pos.quantity)} {pos.unit} disp.</div>
      </div>
      <ArrowRight className="h-4 w-4 text-ink-muted" />
      <input
        type="number"
        value={qtd}
        onChange={(e) => setQtd(e.target.value)}
        placeholder="qtd"
        className="w-20 rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-sm outline-none"
      />
      <button className="btn-primary text-xs" disabled={n <= 0 || n > pos.quantity} onClick={() => onGerar(pos, n)}>
        <Send className="h-4 w-4" /> Separar
      </button>
    </li>
  )
}
