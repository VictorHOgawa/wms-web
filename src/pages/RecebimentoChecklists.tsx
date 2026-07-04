import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Search, User, MapPin } from 'lucide-react'
import { isConnected, wmsApi, type WmsChecklistExecutionDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader, type Tone } from '../components/ui'
import { num } from '../lib/utils'

const COND_META: Record<string, { l: string; tone: Tone }> = {
  INTEGRA: { l: 'Íntegra', tone: 'ok' },
  AVARIADA: { l: 'Avariada', tone: 'bad' },
  PARCIAL: { l: 'Parcial', tone: 'warn' },
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

export default function RecebimentoChecklists() {
  const conectado = isConnected()
  const [execs, setExecs] = useState<WmsChecklistExecutionDTO[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(conectado)

  useEffect(() => {
    if (!conectado) return
    let vivo = true
    ;(async () => {
      try {
        const e = await wmsApi.checklistExecutions('receber', 200)
        if (vivo) setExecs(e)
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
    return execs.filter(
      (e) =>
        !q ||
        (e.responsavel ?? '').toLowerCase().includes(q) ||
        (e.templateCode ?? '').toLowerCase().includes(q) ||
        (e.condicao ?? '').toLowerCase().includes(q),
    )
  }, [execs, busca])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklists de Recebimento"
        subtitle="Chegadas conferidas no coletor — respostas, condição da carga, responsável e local"
      >
        {conectado ? (
          <Badge tone="ok">{num(lista.length)} execuções · WMS</Badge>
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
            placeholder="Buscar por responsável, checklist ou condição…"
            className="bg-transparent outline-none flex-1 text-sm"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Condição</th>
                <th className="th">Checklist</th>
                <th className="th">Respostas</th>
                <th className="th">Responsável</th>
                <th className="th">Local</th>
                <th className="th">Quando</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const cond = e.condicao ? (COND_META[e.condicao] ?? { l: e.condicao, tone: 'neutral' as Tone }) : null
                return (
                  <tr key={e.id} className="row-hover align-top">
                    <td className="td">{cond ? <Badge tone={cond.tone}>{cond.l}</Badge> : <span className="text-ink-muted text-xs">—</span>}</td>
                    <td className="td">
                      <div className="mono font-medium text-brand">{e.templateCode ?? '—'}</div>
                    </td>
                    <td className="td">
                      <div className="flex flex-col gap-0.5">
                        {(e.answers ?? []).slice(0, 4).map((a, i) => (
                          <span key={i} className="text-xs text-ink-soft">
                            <span className="text-ink-muted">{a.text ?? a.questionId ?? '—'}:</span>{' '}
                            <span className="font-medium text-ink">{a.value ?? '—'}</span>
                          </span>
                        ))}
                        {(e.answers?.length ?? 0) > 4 && (
                          <span className="text-xs text-ink-muted">+{(e.answers?.length ?? 0) - 4} resposta(s)</span>
                        )}
                      </div>
                    </td>
                    <td className="td">
                      <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
                        <User className="h-3.5 w-3.5 text-ink-muted" />
                        {e.responsavel ?? '—'}
                      </span>
                    </td>
                    <td className="td">
                      {e.geolocalizacao ? (
                        <span className="inline-flex items-center gap-1.5 mono text-xs text-ink-soft">
                          <MapPin className="h-3.5 w-3.5 text-ink-muted" />
                          {e.geolocalizacao}
                        </span>
                      ) : (
                        <span className="text-ink-muted text-xs">—</span>
                      )}
                    </td>
                    <td className="td text-xs text-ink-muted mono">{fmtDateTime(e.executedAt)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {lista.length === 0 && (
          <EmptyState
            icon={<ClipboardCheck className="h-6 w-6" />}
            title={conectado ? (loading ? 'Carregando…' : 'Nenhum checklist executado') : 'Sem conexão com o WMS'}
            text={
              conectado
                ? 'Os checklists aparecem aqui conforme o operador registra a chegada da carga no coletor.'
                : 'Entre com credenciais reais do Hub para ver os checklists de recebimento.'
            }
          />
        )}
      </div>
    </div>
  )
}
