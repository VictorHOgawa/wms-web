import { useEffect, useMemo, useState } from 'react'
import { History, Search, ArrowRight, User } from 'lucide-react'
import { isConnected, wmsApi, type WmsMovementDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader, type Tone } from '../components/ui'
import { num } from '../lib/utils'

const MOV_META: Record<string, { l: string; tone: Tone }> = {
  PUTAWAY: { l: 'Guardado', tone: 'primary' },
  REPLEN: { l: 'Abastecido', tone: 'info' },
  COUNT_ADJUST_UP: { l: 'Ajuste (+)', tone: 'ok' },
  COUNT_ADJUST_DOWN: { l: 'Ajuste (−)', tone: 'warn' },
  RECEIVE: { l: 'Recebido', tone: 'neutral' },
}

function fmtDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function Movimentos() {
  const conectado = isConnected()
  const [movs, setMovs] = useState<WmsMovementDTO[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(conectado)

  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const m = await wmsApi.movements(300)
        if (vivo) setMovs(m)
      } catch {
        /* mantém vazio */
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [conectado])

  const lista = useMemo(() => {
    const q = busca.toLowerCase()
    return movs.filter(
      (m) =>
        !q ||
        m.skuCode.toLowerCase().includes(q) ||
        (m.fromAddressCode ?? '').toLowerCase().includes(q) ||
        (m.toAddressCode ?? '').toLowerCase().includes(q) ||
        (MOV_META[m.type]?.l ?? m.type).toLowerCase().includes(q),
    )
  }, [movs, busca])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Movimentos & Rastreabilidade"
        subtitle="Histórico de toda movimentação de estoque — quem, quando, de onde, para onde"
      >
        {conectado ? (
          <Badge tone="ok">{num(lista.length)} movimentos · WMS</Badge>
        ) : (
          <Badge tone="warn">modo demo — conecte ao WMS para ver</Badge>
        )}
      </PageHeader>

      <div className="card p-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-sub px-3 py-2">
          <Search className="h-4 w-4 text-ink-muted" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por SKU, endereço ou tipo de movimento…"
            className="bg-transparent outline-none flex-1 text-sm"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Movimento</th>
                <th className="th">SKU</th>
                <th className="th">Origem → Destino</th>
                <th className="th text-right">Qtde</th>
                <th className="th">Operador</th>
                <th className="th">Quando</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => {
                const meta = MOV_META[m.type] ?? { l: m.type, tone: 'neutral' as Tone }
                return (
                  <tr key={m.id} className="row-hover">
                    <td className="td">
                      <Badge tone={meta.tone}>{meta.l}</Badge>
                    </td>
                    <td className="td">
                      <div className="mono font-medium text-brand">{m.skuCode}</div>
                      <div className="text-xs text-ink-muted">{m.skuDescription}</div>
                    </td>
                    <td className="td">
                      <span className="inline-flex items-center gap-1.5 mono text-xs">
                        <span className="text-ink-soft">{m.fromAddressCode ?? '—'}</span>
                        <ArrowRight className="h-3 w-3 text-ink-muted" />
                        <span className="text-brand font-medium">{m.toAddressCode ?? '—'}</span>
                      </span>
                    </td>
                    <td className="td text-right mono font-medium text-brand">{num(m.quantity)}</td>
                    <td className="td">
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                        <User className="h-3.5 w-3.5 text-ink-muted" />
                        {m.userId ? `${m.userId.slice(0, 8)}…` : '—'}
                      </span>
                    </td>
                    <td className="td text-xs text-ink-muted mono">{fmtDateTime(m.createdAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && (
          <EmptyState
            icon={<History className="h-6 w-6" />}
            title={conectado ? (loading ? 'Carregando movimentos…' : 'Nenhum movimento') : 'Sem conexão com o WMS'}
            text={
              conectado
                ? 'Movimentos aparecem aqui conforme o operador guarda, separa, conta e abastece no coletor.'
                : 'Entre com credenciais reais do Hub para ver o histórico de movimentação do estoque.'
            }
          />
        )}
      </div>
    </div>
  )
}
