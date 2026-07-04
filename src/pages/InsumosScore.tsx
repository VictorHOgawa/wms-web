import { useEffect, useMemo, useState } from 'react'
import { Boxes, AlertTriangle } from 'lucide-react'
import { isConnected, wmsApi, type WmsSupplyScoreDTO, type WmsOwnerLiteDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader } from '../components/ui'
import { num } from '../lib/utils'

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function InsumosScore() {
  const conectado = isConnected()
  const [score, setScore] = useState<WmsSupplyScoreDTO[]>([])
  const [owners, setOwners] = useState<WmsOwnerLiteDTO[]>([])
  const [loading, setLoading] = useState(conectado)

  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const [sc, ow] = await Promise.all([wmsApi.supplyScore(), wmsApi.owners()])
        if (!vivo) return
        setScore(sc)
        setOwners(ow)
      } catch {
        /* vazio */
      } finally {
        if (vivo) setLoading(false)
      }
    })()
    return () => {
      vivo = false
    }
  }, [conectado])

  const nomeOwner = (id: string | null) => (id ? owners.find((o) => o.id === id)?.nome ?? id.slice(0, 8) : 'Geral')
  const prejuizoTotal = useMemo(() => score.reduce((s, r) => s + (r.prejuizoEstimado ?? 0), 0), [score])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insumos & Score"
        subtitle="Pallets/stretch enviados × devolvidos por cliente — saldo em aberto e prejuízo estimado"
      >
        {conectado ? (
          <Badge tone="ok">{num(score.length)} linhas · WMS</Badge>
        ) : (
          <Badge tone="warn">modo demo — conecte ao WMS para ver</Badge>
        )}
      </PageHeader>

      {conectado && score.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-sm font-medium text-ink-muted">Saldo em aberto (não devolvido)</p>
            <p className="mt-2 text-2xl font-semibold text-brand">{num(score.reduce((s, r) => s + Math.max(r.saldo, 0), 0))}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm font-medium text-ink-muted">Consumido na operação</p>
            <p className="mt-2 text-2xl font-semibold text-brand">{num(score.reduce((s, r) => s + r.consumo, 0))}</p>
          </div>
          <div className="card p-4 border-bad/30">
            <p className="text-sm font-medium text-ink-muted">Prejuízo estimado</p>
            <p className="mt-2 text-2xl font-semibold text-bad">{brl(prejuizoTotal)}</p>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Insumo</th>
                <th className="th">Cliente</th>
                <th className="th text-right">Enviado</th>
                <th className="th text-right">Devolvido</th>
                <th className="th text-right">Saldo</th>
                <th className="th text-right">Consumo</th>
                <th className="th text-right">Prejuízo est.</th>
              </tr>
            </thead>
            <tbody>
              {score.map((r) => (
                <tr key={`${r.supplyId}|${r.ownerId ?? ''}`} className="row-hover">
                  <td className="td">
                    <div className="mono font-medium text-brand">{r.supplyCode ?? '—'}</div>
                    <div className="text-xs text-ink-muted">{r.supplyName}</div>
                  </td>
                  <td className="td text-sm">{nomeOwner(r.ownerId)}</td>
                  <td className="td text-right mono text-xs">{num(r.enviado)}</td>
                  <td className="td text-right mono text-xs">{num(r.recebido)}</td>
                  <td className="td text-right">
                    <Badge tone={r.saldo > 0 ? 'warn' : 'ok'}>{r.saldo > 0 ? `+${num(r.saldo)}` : num(r.saldo)}</Badge>
                  </td>
                  <td className="td text-right mono text-xs">{num(r.consumo)}</td>
                  <td className="td text-right mono text-xs font-medium">
                    {r.prejuizoEstimado != null && r.prejuizoEstimado > 0 ? (
                      <span className="inline-flex items-center gap-1 text-bad">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {brl(r.prejuizoEstimado)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {score.length === 0 && (
          <EmptyState
            icon={<Boxes className="h-6 w-6" />}
            title={conectado ? (loading ? 'Carregando…' : 'Sem movimentação de insumos') : 'Sem conexão com o WMS'}
            text={
              conectado
                ? 'O score aparece conforme insumos são enviados com a carga e devolvidos pelos clientes.'
                : 'Entre com credenciais reais do Hub para ver o score de insumos.'
            }
          />
        )}
      </div>
    </div>
  )
}
