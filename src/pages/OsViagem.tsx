import { useCallback, useEffect, useMemo, useState } from 'react'
import { Workflow, RefreshCw, ClipboardList, Barcode, ListChecks, FileText, Truck, Lock, AlertTriangle } from 'lucide-react'
import { isConnected, wmsApi, type WarehouseTaskDTO } from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader } from '../components/ui'

/**
 * O.S DA VIAGEM — a torre REAL dos passos de armazém que não são do coletor.
 * A viagem gera as O.S (Recebimento/Separação/Carregamento); o coletor executa
 * receber/conferir/carregar-checklist; AQUI a torre executa o resto:
 *   pré-aviso → (coletor) → bipagem · lista de separação → romaneio · carregamento.
 * Mesma fonte do coletor (`/service-orders/warehouse-tasks?codes=...`), execução
 * pela rota genérica de eventos.
 */

const CODES = ['PREAVISORECEBIMENTO', 'BIPAGEM', 'RELATLISTASEPARA', 'ROMANEIODOCUMENTO', 'CARREGAMENTO']

const META: Record<string, { titulo: string; acao: string; desc: string; Icon: typeof ClipboardList }> = {
  PREAVISORECEBIMENTO: {
    titulo: 'Pré-aviso de recebimento',
    acao: 'Registrar pré-aviso',
    desc: 'Deriva a carga esperada da parada e LIBERA o "Receber" no coletor.',
    Icon: ClipboardList,
  },
  BIPAGEM: {
    titulo: 'Bipagem de volumes',
    acao: 'Registrar bipagem',
    desc: 'Registra os volumes bipados × esperados e fecha o Recebimento.',
    Icon: Barcode,
  },
  RELATLISTASEPARA: {
    titulo: 'Lista de separação',
    acao: 'Gerar lista',
    desc: 'Gera a lista de separação (estratégia de picking) da O.S de Separação.',
    Icon: ListChecks,
  },
  ROMANEIODOCUMENTO: {
    titulo: 'Romaneio da carga',
    acao: 'Gerar romaneio',
    desc: 'Deriva o romaneio dos documentos embarcados e fecha a Separação.',
    Icon: FileText,
  },
  CARREGAMENTO: {
    titulo: 'Confirmar carregamento',
    acao: 'Confirmar carregamento',
    desc: 'Expede a carga do piso (ALOCADA → EXPEDIDA) e fecha o Carregamento.',
    Icon: Truck,
  },
}

const ESTRATEGIAS = ['FIFO', 'FEFO', 'BATCH', 'ZONE', 'WAVE']

export default function OsViagem() {
  const conectado = isConnected()
  const [tasks, setTasks] = useState<WarehouseTaskDTO[]>([])
  const [loading, setLoading] = useState(conectado)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  // Inputs por evento (bipagem: códigos; separação: estratégia).
  const [bipados, setBipados] = useState<Record<string, string>>({})
  const [estrategia, setEstrategia] = useState<Record<string, string>>({})

  const carregar = useCallback(() => {
    if (!conectado) return
    setLoading(true)
    wmsApi
      .warehouseTasks(CODES)
      .then(setTasks)
      .catch((e) => setMsg(e?.message ?? 'Falha ao buscar as O.S da viagem'))
      .finally(() => setLoading(false))
  }, [conectado])

  useEffect(() => {
    carregar()
  }, [carregar])

  const executar = async (t: WarehouseTaskDTO) => {
    if (busyId) return
    let data: Record<string, unknown> = {}
    if (t.eventCode === 'BIPAGEM') {
      const codigos = (bipados[t.eventId] ?? '')
        .split(/[\n,;\s]+/)
        .map((c) => c.trim())
        .filter(Boolean)
      if (codigos.length === 0) {
        setMsg('Bipagem: informe ao menos 1 código de volume (um por linha).')
        return
      }
      const esperado = t.contexto.itens.reduce((s, i) => s + Number(i.esperada || 0), 0)
      data = { bipados: codigos, ...(esperado > 0 ? { totalEsperado: esperado } : {}) }
    }
    if (t.eventCode === 'RELATLISTASEPARA') {
      data = { reportGeneratedAt: new Date().toISOString(), estrategiaPicking: estrategia[t.eventId] ?? 'FIFO' }
    }
    setBusyId(t.eventId)
    setMsg(null)
    try {
      await wmsApi.executeOsEvent(t.serviceOrderId, t.eventId, data)
      setMsg(`✓ ${META[t.eventCode]?.titulo ?? t.eventCode} concluído (${t.serviceOrderCode}).`)
      carregar()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Falha ao executar o evento.')
    } finally {
      setBusyId(null)
    }
  }

  // Agrupa por O.S para leitura (Recebimento / Separação / Carregamento).
  const grupos = useMemo(() => {
    const by = new Map<string, { code: string; template: string | null; tasks: WarehouseTaskDTO[] }>()
    for (const t of tasks) {
      const g = by.get(t.serviceOrderId) ?? { code: t.serviceOrderCode, template: t.templateName, tasks: [] }
      g.tasks.push(t)
      by.set(t.serviceOrderId, g)
    }
    return [...by.entries()]
  }, [tasks])

  return (
    <div className="space-y-6">
      <div className="card p-3 text-sm border-amber-300 bg-amber-50 text-amber-800">
        ⚠ <strong>Tela temporária</strong> (visão técnica para validação manual). Os passos da
        viagem agora vivem nas telas de processo — <strong>Recebimento</strong> (pré-aviso e
        bipagem), <strong>Separação</strong> (lista e romaneio) e <strong>Expedição</strong>
        (carregamento). Esta tela será removida.
      </div>
      <PageHeader
        title="O.S da Viagem (torre)"
        subtitle="Passos de armazém da viagem que a torre executa — o coletor faz receber/conferir/checklist; aqui roda pré-aviso, bipagem, separação, romaneio e o carregamento final"
      >
        <div className="flex items-center gap-2">
          {conectado ? (
            <Badge tone={tasks.length ? 'warn' : 'ok'}>{tasks.length} passo(s) pendente(s)</Badge>
          ) : (
            <Badge tone="warn">modo demo — conecte ao WMS</Badge>
          )}
          <button type="button" onClick={carregar} className="btn-ghost" title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </PageHeader>

      {msg && (
        <div className={`card p-3 text-sm ${msg.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'}`}>{msg}</div>
      )}

      {grupos.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Workflow className="h-6 w-6" />}
            title={loading ? 'Carregando…' : 'Nenhum passo de torre pendente'}
            text="Quando uma viagem com parada em CD for gerada, os passos de torre (pré-aviso, bipagem, separação, romaneio, carregamento) aparecem aqui."
          />
        </div>
      ) : (
        grupos.map(([soId, g]) => (
          <div key={soId} className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3 flex items-center gap-2">
              <Workflow className="h-4 w-4 text-brand" />
              <span className="font-semibold">{g.template ?? 'O.S de armazém'}</span>
              <span className="mono text-xs text-ink-muted">{g.code}</span>
            </div>
            <div className="divide-y divide-line">
              {g.tasks.map((t) => {
                const meta = META[t.eventCode]
                const Icon = meta?.Icon ?? ClipboardList
                const totalEsperado = t.contexto.itens.reduce((s, i) => s + Number(i.esperada || 0), 0)
                return (
                  <div key={t.eventId} className="px-4 py-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <Icon className="h-4 w-4 mt-0.5 text-ink-soft" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{meta?.titulo ?? t.eventLabel}</span>
                          {t.bloqueada && (
                            <Badge tone="warn">
                              <Lock className="h-3 w-3" /> aguardando{t.bloqueadaPor ? `: ${t.bloqueadaPor}` : ''}
                            </Badge>
                          )}
                          {t.temOcorrencia && (
                            <Badge tone="bad">
                              <AlertTriangle className="h-3 w-3" /> problema
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">{meta?.desc}</p>
                        {t.contexto.itens.length > 0 && (
                          <p className="text-xs text-ink-soft mt-1">
                            Carga: {t.contexto.itens.map((i) => `${i.numero ?? i.chave ?? '—'} (${i.esperada})`).join(' · ')}
                            {totalEsperado > 0 ? ` — total esperado ${totalEsperado}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Inputs específicos por tipo */}
                    {t.eventCode === 'BIPAGEM' && (
                      <textarea
                        value={bipados[t.eventId] ?? ''}
                        onChange={(e) => setBipados((m) => ({ ...m, [t.eventId]: e.target.value }))}
                        placeholder="Códigos dos volumes bipados — um por linha"
                        rows={3}
                        className="w-full rounded-lg border border-line bg-surface-sub px-3 py-2 text-sm outline-none mono"
                      />
                    )}
                    {t.eventCode === 'RELATLISTASEPARA' && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-ink-soft">Estratégia de picking</span>
                        <select
                          value={estrategia[t.eventId] ?? 'FIFO'}
                          onChange={(e) => setEstrategia((m) => ({ ...m, [t.eventId]: e.target.value }))}
                          className="rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-sm outline-none"
                        >
                          {ESTRATEGIAS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => executar(t)}
                      disabled={!!busyId || t.bloqueada}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {busyId === t.eventId ? 'Executando…' : (meta?.acao ?? 'Concluir')}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
