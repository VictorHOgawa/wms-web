import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Layers, PackageSearch, Send } from 'lucide-react'
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
 * Reabastecimento (base): a torre despacha um abastecimento pulmão → picking; o
 * coletor (abastecer) executa e move o estoque. O disparo automático por nível
 * mínimo é o tuning posterior (precisa do Alex).
 */
export default function Reabastecimento() {
  const conectado = isConnected()
  const [posicoes, setPosicoes] = useState<WmsStockPositionDTO[]>([])
  const [tarefas, setTarefas] = useState<WmsTarefaArmazemDTO[]>([])
  const [loading, setLoading] = useState(conectado)
  const [msg, setMsg] = useState<string | null>(null)

  const carregar = async () => {
    try {
      const [pos, ab] = await Promise.all([wmsApi.stockPositions(), wmsApi.abastecimentos()])
      setPosicoes(pos)
      setTarefas(ab)
    } catch { /* mantém */ } finally { setLoading(false) }
  }
  useEffect(() => { if (conectado) carregar() /* eslint-disable-next-line */ }, [conectado])

  const pulmoes = useMemo(
    () => posicoes.filter((p) => p.addressType === 'PULMAO' && p.status === 'DISPONIVEL' && p.quantity > 0),
    [posicoes],
  )

  const gerar = async (pos: WmsStockPositionDTO, picking: string, qtd: number) => {
    setMsg(null)
    try {
      const r = await wmsApi.gerarAbastecimento({ fromPositionId: pos.id, pickingAddressCode: picking, quantity: qtd })
      setMsg(`Abastecimento ${r.code} gerado — ${qtd} un de ${pos.skuCode} para ${picking}. Cai no coletor.`)
      await carregar()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Falha ao gerar abastecimento.') }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reabastecimento" subtitle="Despacha do pulmão para o picking; o coletor executa e move o estoque">
        {conectado ? <Badge tone="ok">{num(tarefas.length)} abastecimentos · WMS</Badge> : <Badge tone="warn">modo demo — conecte ao WMS</Badge>}
      </PageHeader>

      {msg && <div className="card p-3 text-sm text-ink-soft">{msg}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-muted">Pulmão (reserva) com saldo</div>
          {pulmoes.length === 0 ? (
            <EmptyState icon={<PackageSearch className="h-6 w-6" />} title={loading ? 'Carregando…' : 'Nenhuma posição de pulmão'} text="Guarde estoque em endereços de PULMÃO para reabastecer o picking." />
          ) : (
            <ul>{pulmoes.map((p) => <LinhaPulmao key={p.id} pos={p} onGerar={gerar} />)}</ul>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-muted">Abastecimentos despachados</div>
          {tarefas.length === 0 ? (
            <EmptyState icon={<Layers className="h-6 w-6" />} title="Nenhum abastecimento" text="Despache um abastecimento à esquerda; cai no coletor." />
          ) : (
            <table className="w-full text-sm">
              <thead><tr>
                <th className="th">O.S</th><th className="th">SKU</th><th className="th">Rota</th><th className="th text-right">Qtd</th><th className="th">Status</th>
              </tr></thead>
              <tbody>
                {tarefas.map((t) => (
                  <tr key={t.eventId} className="row-hover">
                    <td className="td mono text-xs text-brand">{t.code}</td>
                    <td className="td mono text-xs">{t.skuCode ?? '—'}</td>
                    <td className="td text-xs text-ink-soft">{t.fromAddressCode} → {t.suggestedAddressCode}</td>
                    <td className="td text-right mono">{num(t.quantidade)}</td>
                    <td className="td"><Badge tone={STATUS_TONE[t.status] ?? 'neutral'} dot>{t.status === 'AVAILABLE' ? 'no coletor' : 'concluído'}</Badge></td>
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

function LinhaPulmao({ pos, onGerar }: { pos: WmsStockPositionDTO; onGerar: (p: WmsStockPositionDTO, picking: string, qtd: number) => void }) {
  const [picking, setPicking] = useState('')
  const [qtd, setQtd] = useState('')
  const n = Number(qtd) || 0
  return (
    <li className="px-4 py-2.5 border-b border-line flex flex-wrap items-center gap-x-2 gap-y-2">
      <div className="flex-1 min-w-[150px]">
        <div className="mono text-sm text-brand">{pos.skuCode}</div>
        <div className="text-[11px] text-ink-muted">{pos.addressCode} · {num(pos.quantity)} {pos.unit} disp.</div>
      </div>
      <ArrowRight className="h-4 w-4 text-ink-muted" />
      <input value={picking} onChange={(e) => setPicking(e.target.value)} placeholder="endereço picking" className="w-32 rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-sm outline-none mono" />
      <input type="number" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="qtd" className="w-16 rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-sm outline-none" />
      <button className="btn-primary text-xs" disabled={!picking.trim() || n <= 0 || n > pos.quantity} onClick={() => onGerar(pos, picking.trim(), n)}>
        <Send className="h-4 w-4" /> Abastecer
      </button>
    </li>
  )
}
