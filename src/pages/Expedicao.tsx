import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Truck,
  RefreshCw,
  CheckCircle2,
  Circle,
  Clock,
  Smartphone,
  Lock,
  AlertTriangle,
  GitCompareArrows,
  XCircle,
  MinusCircle,
} from 'lucide-react'
import {
  isConnected,
  wmsApi,
  type WarehouseOverviewDTO,
  type OverviewEventoDTO,
  type WmsAutorizacaoDTO,
} from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader } from '../components/ui'

/**
 * EXPEDIÇÃO — cargas a expedir do CD (REAL; substituiu o mock em 06/07).
 * Cada embarque da viagem vira uma O.S "Carregamento" com 2 passos:
 *   1. checklist de embarque (COLETOR — aqui mostramos o RESULTADO real)
 *   2. confirmar carregamento (TORRE, aqui — expede do piso: ALOCADA→EXPEDIDA)
 * Fonte: GET /service-orders/warehouse-overview.
 */

interface ChecklistItem {
  pergunta?: string
  questionId?: string
  resultado?: string
  observacao?: string
}

export default function Expedicao() {
  const conectado = isConnected()
  const [ordens, setOrdens] = useState<WarehouseOverviewDTO[]>([])
  const [loading, setLoading] = useState(conectado)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [verConcluidas, setVerConcluidas] = useState(false)
  // A2: solicitações "carregar sem bipagem" pendentes (aprovar/negar no card).
  const [autorizacoes, setAutorizacoes] = useState<WmsAutorizacaoDTO[]>([])

  const carregar = useCallback(() => {
    if (!conectado) return
    setLoading(true)
    Promise.all([
      wmsApi.warehouseOverview('Carregamento'),
      wmsApi.autorizacoes('PENDENTE').catch(() => [] as WmsAutorizacaoDTO[]),
    ])
      .then(([ords, auts]) => {
        setOrdens(ords)
        setAutorizacoes(auts)
      })
      .catch((e) => setMsg(e?.message ?? 'Falha ao buscar as expedições'))
      .finally(() => setLoading(false))
  }, [conectado])

  useEffect(() => {
    carregar()
  }, [carregar])

  const abertas = useMemo(
    () => ordens.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED'),
    [ordens],
  )
  const concluidas = useMemo(() => ordens.filter((o) => o.status === 'COMPLETED'), [ordens])
  const visiveis = verConcluidas ? concluidas : abertas

  const executar = async (os: WarehouseOverviewDTO, ev: OverviewEventoDTO) => {
    setBusy(ev.eventId)
    setMsg(null)
    try {
      await wmsApi.executeOsEvent(os.serviceOrderId, ev.eventId, {})
      setMsg(`✓ Carregamento confirmado (${os.code}) — carga expedida do piso.`)
      carregar()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Falha ao confirmar o carregamento.')
    } finally {
      setBusy(null)
    }
  }

  /** A2: decide a solicitação "carregar sem bipagem" do coletor. */
  const decidir = async (aut: WmsAutorizacaoDTO, status: 'APROVADA' | 'NEGADA') => {
    setBusy(aut.id)
    setMsg(null)
    try {
      await wmsApi.decidirAutorizacao(aut.id, status)
      setMsg(status === 'APROVADA'
        ? '✓ Liberado — o operador já pode concluir sem bipagem no coletor.'
        : '✓ Negado — o operador precisa bipar as etiquetas.')
      carregar()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Falha ao decidir a autorização.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expedição"
        subtitle="Embarques da viagem — o checklist é do coletor; a confirmação do carregamento (expede do piso) é da torre"
      >
        <div className="flex items-center gap-2">
          {conectado ? (
            <Badge tone={abertas.length ? 'warn' : 'ok'}>{abertas.length} embarque(s) em andamento</Badge>
          ) : (
            <Badge tone="warn">modo demo — conecte ao WMS</Badge>
          )}
          <Link to="/confronto" className="btn-ghost text-sm" title="Confronto carga × descarga">
            <GitCompareArrows className="h-4 w-4" />
          </Link>
          <button type="button" onClick={carregar} className="btn-ghost" title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </PageHeader>

      {msg && (
        <div className={`card p-3 text-sm ${msg.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'}`}>{msg}</div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => setVerConcluidas(false)}
          className={`px-3 py-1.5 rounded-lg border ${!verConcluidas ? 'border-brand text-brand font-medium' : 'border-line text-ink-soft'}`}
        >
          Em andamento ({abertas.length})
        </button>
        <button
          type="button"
          onClick={() => setVerConcluidas(true)}
          className={`px-3 py-1.5 rounded-lg border ${verConcluidas ? 'border-brand text-brand font-medium' : 'border-line text-ink-soft'}`}
        >
          Concluídas ({concluidas.length})
        </button>
      </div>

      {visiveis.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Truck className="h-6 w-6" />}
            title={loading ? 'Carregando…' : verConcluidas ? 'Nenhum embarque concluído' : 'Nenhum embarque em andamento'}
            text="Quando uma viagem com embarque neste CD for gerada, a O.S de Carregamento aparece aqui."
          />
        </div>
      ) : (
        visiveis.map((os) => <CardEmbarque key={os.serviceOrderId} os={os} busy={busy} onConfirmar={executar} autorizacao={autorizacoes.find((a) => a.serviceOrderId === os.serviceOrderId) ?? null} onDecidir={decidir} />)
      )}
    </div>
  )
}

function CardEmbarque({
  os,
  busy,
  onConfirmar,
  autorizacao,
  onDecidir,
}: {
  os: WarehouseOverviewDTO
  busy: string | null
  onConfirmar: (os: WarehouseOverviewDTO, ev: OverviewEventoDTO) => void
  autorizacao: WmsAutorizacaoDTO | null
  onDecidir: (aut: WmsAutorizacaoDTO, status: 'APROVADA' | 'NEGADA') => void
}) {
  const checklist = os.eventos.find((e) => e.code === 'CHECKLISTCARREGA')
  const carregamento = os.eventos.find((e) => e.code === 'CARREGAMENTO')
  const respostas: ChecklistItem[] = Array.isArray((checklist?.data as { itens?: unknown[] } | null)?.itens)
    ? ((checklist!.data as { itens: ChecklistItem[] }).itens)
    : []
  const noks = respostas.filter((r) => r.resultado === 'NOK').length
  const expedidas = (carregamento?.data as { expedidas?: number } | null)?.expedidas
  // Etiquetas bipadas volume a volume no embarque (abre o confronto da viagem).
  const clData = checklist?.data as { etiquetasBipadas?: number; etiquetasDesconhecidas?: string[] } | null
  const etiquetasBipadas = clData?.etiquetasBipadas ?? null
  const etiquetasDesconhecidas = clData?.etiquetasDesconhecidas?.length ?? 0

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-4 py-3 flex flex-wrap items-center gap-2">
        <Truck className="h-4 w-4 text-brand" />
        <span className="font-semibold">
          {os.documentos.filter((d) => d.kind === 'pickup').length
            ? os.documentos
                .filter((d) => d.kind === 'pickup')
                .map((d) => `${d.tipo ?? 'DOC'} ${d.numero ?? '—'}`)
                .join(' · ')
            : 'Embarque da viagem'}
        </span>
        {os.trip && <Badge tone="neutral">viagem {os.trip.code}</Badge>}
        {os.cd && <span className="text-xs text-ink-muted">{os.cd.name}</span>}
        <span className="mono text-xs text-ink-muted ml-auto">{os.code}</span>
        {os.ocorrenciasAbertas > 0 && (
          <Badge tone="bad">
            <AlertTriangle className="h-3 w-3" /> {os.ocorrenciasAbertas} problema(s)
          </Badge>
        )}
      </div>

      {/* A2 — solicitação do coletor: carregar sem bipagem (aprovar/negar) */}
      {autorizacao && (
        <div className="px-4 py-3 border-b border-line bg-amber-50/50 flex flex-wrap items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="font-medium">
            Solicitação do coletor: carregar SEM bipagem
            {autorizacao.solicitadoPorNome ? ` — ${autorizacao.solicitadoPorNome}` : ''}
          </span>
          {autorizacao.motivo && <span className="text-xs text-ink-muted">({autorizacao.motivo})</span>}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              disabled={busy === autorizacao.id}
              onClick={() => onDecidir(autorizacao, 'APROVADA')}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:border-emerald-400 disabled:opacity-50"
            >
              Aprovar
            </button>
            <button
              type="button"
              disabled={busy === autorizacao.id}
              onClick={() => onDecidir(autorizacao, 'NEGADA')}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:border-red-400 disabled:opacity-50"
            >
              Negar
            </button>
          </div>
        </div>
      )}

      {/* Passo 1 — checklist do coletor (resultado real) */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-1.5 text-sm">
          {checklist?.status === 'COMPLETED' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <Smartphone className="h-4 w-4 text-amber-500" />
          )}
          <span className={checklist?.status === 'COMPLETED' ? 'text-ink-soft' : 'font-medium'}>
            Checklist de embarque (coletor)
            {checklist?.status === 'COMPLETED'
              ? noks > 0
                ? ` — ${noks} não conforme`
                : ' — tudo conforme'
              : ' — aguardando o operador'}
          </span>
        </div>
        {(() => {
          // Expedição por ROTA: último a entregar embarca primeiro.
          const pickups = os.documentos.filter((d) => d.kind === 'pickup' && d.entregaSequencia != null)
          if (pickups.length < 2) return null
          const ordenados = [...pickups].sort((a, b) => (b.entregaSequencia ?? -1) - (a.entregaSequencia ?? -1))
          return (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Badge tone="neutral">ordem de embarque</Badge>
              <span className="text-ink-soft">
                {ordenados.map((d, i) => `${i + 1}º ${d.tipo ?? 'DOC'} ${d.numero ?? '—'} (entrega ${d.entregaSequencia})`).join(' → ')}
              </span>
              <span className="text-ink-muted">— último a entregar sobe primeiro</span>
            </div>
          )
        })()}
        {etiquetasBipadas != null && (
          <div className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Badge tone={etiquetasDesconhecidas > 0 ? 'warn' : 'ok'} dot>
              {etiquetasBipadas} etiqueta(s) bipada(s) no embarque
              {etiquetasDesconhecidas > 0 ? ` · ${etiquetasDesconhecidas} fora do cadastro` : ''}
            </Badge>
            <span className="text-ink-muted">— confronto abre na descarga do CD destino</span>
          </div>
        )}
        {respostas.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {respostas.map((r, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                  r.resultado === 'NOK'
                    ? 'border-red-300 text-red-600'
                    : r.resultado === 'NA'
                      ? 'border-line text-ink-muted'
                      : 'border-emerald-300 text-emerald-700'
                }`}
                title={r.observacao ?? undefined}
              >
                {r.resultado === 'NOK' ? <XCircle className="h-3 w-3" /> : r.resultado === 'NA' ? <MinusCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                {r.pergunta ?? r.questionId ?? 'item'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Passo 2 — confirmar carregamento (torre) */}
      <div className="px-4 pb-3 flex flex-wrap items-center gap-2 text-sm">
        {carregamento?.status === 'COMPLETED' ? (
          <span className="inline-flex items-center gap-1.5 text-ink-soft">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Carregamento confirmado{typeof expedidas === 'number' ? ` — ${expedidas} carga(s) expedida(s) do piso` : ''}
          </span>
        ) : carregamento?.status === 'AVAILABLE' ? (
          <>
            {os.bloqueada && (
              <Badge tone="warn">
                <Lock className="h-3 w-3" /> aguardando{os.bloqueadaPor ? `: ${os.bloqueadaPor}` : ''}
              </Badge>
            )}
            <button
              type="button"
              disabled={!!busy || os.bloqueada}
              onClick={() => onConfirmar(os, carregamento)}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {busy === carregamento.eventId ? 'Confirmando…' : 'Confirmar carregamento (expede do piso)'}
            </button>
          </>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-ink-muted">
            <Circle className="h-4 w-4 text-ink-muted/40" />
            Confirmação do carregamento — libera após o checklist
          </span>
        )}
        {os.trip && (
          <Link to="/confronto" className="text-xs text-brand underline ml-auto" title="Registrar carga × descarga desta viagem">
            <Clock className="h-3 w-3 inline -mt-0.5 mr-0.5" />
            Confronto (chave: {os.trip.code})
          </Link>
        )}
      </div>
    </div>
  )
}
