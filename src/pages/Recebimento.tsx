import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Truck,
  RefreshCw,
  ClipboardList,
  Barcode,
  CheckCircle2,
  Circle,
  Clock,
  Smartphone,
  AlertTriangle,
  X,
} from 'lucide-react'
import {
  isConnected,
  wmsApi,
  type WarehouseOverviewDTO,
  type OverviewEventoDTO,
  type WmsDocaDTO,
} from '../lib/wmsApi'
import { Badge, EmptyState, PageHeader } from '../components/ui'

/**
 * RECEBIMENTO — fila de chegadas do CD (REAL; substituiu o mock em 06/07).
 * Cada carga que chega por viagem vira uma O.S "Recebimento em Piso" com 4
 * passos alternando torre ↔ coletor:
 *   1. pré-aviso (TORRE, aqui — libera o coletor)  2. receber (COLETOR)
 *   3. conferir (COLETOR)                          4. bipagem (TORRE, aqui)
 * Fonte: GET /service-orders/warehouse-overview (timeline completa).
 */

const PASSO_LABEL: Record<string, string> = {
  PREAVISORECEBIMENTO: 'Pré-aviso',
  TMSRECEBEEMPISO: 'Receber (coletor)',
  CONFQUANTIDADE: 'Conferir (coletor)',
  BIPAGEM: 'Bipagem',
}

function StatusIcon({ ev }: { ev: OverviewEventoDTO }) {
  if (ev.status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  if (ev.status === 'AVAILABLE') return <Clock className="h-4 w-4 text-amber-500" />
  return <Circle className="h-4 w-4 text-ink-muted/40" />
}

/** Resumo amigável do que o coletor conferiu (event.data do CONFQUANTIDADE). */
function resumoConferencia(data: Record<string, unknown> | null): string | null {
  if (!data) return null
  const esperado = Number(data.totalEsperado ?? NaN)
  const conferido = Number(data.totalConferido ?? NaN)
  const div = Number(data.divergencias ?? 0)
  if (Number.isNaN(esperado) || Number.isNaN(conferido)) return null
  return `${conferido}/${esperado}${div > 0 ? ` · ${div} divergência(s)` : ''}`
}

export default function Recebimento() {
  const conectado = isConnected()
  const [ordens, setOrdens] = useState<WarehouseOverviewDTO[]>([])
  const [docas, setDocas] = useState<WmsDocaDTO[]>([])
  const [loading, setLoading] = useState(conectado)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [verConcluidas, setVerConcluidas] = useState(false)
  const [docaSel, setDocaSel] = useState<Record<string, string>>({})
  const [bipModal, setBipModal] = useState<{ os: WarehouseOverviewDTO; ev: OverviewEventoDTO } | null>(null)

  const carregar = useCallback(() => {
    if (!conectado) return
    setLoading(true)
    Promise.all([
      wmsApi.warehouseOverview('Recebimento em Piso'),
      wmsApi.docas().catch(() => [] as WmsDocaDTO[]),
    ])
      .then(([os, dks]) => {
        setOrdens(os)
        setDocas(dks)
      })
      .catch((e) => setMsg(e?.message ?? 'Falha ao buscar as chegadas'))
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

  const kpis = useMemo(() => {
    const passoDisp = (o: WarehouseOverviewDTO) => o.eventos.find((e) => e.status === 'AVAILABLE')?.code
    return {
      preAviso: abertas.filter((o) => passoDisp(o) === 'PREAVISORECEBIMENTO').length,
      coletor: abertas.filter((o) => ['TMSRECEBEEMPISO', 'CONFQUANTIDADE'].includes(passoDisp(o) ?? '')).length,
      bipagem: abertas.filter((o) => passoDisp(o) === 'BIPAGEM').length,
      concluidas: concluidas.length,
    }
  }, [abertas, concluidas])

  const executar = async (os: WarehouseOverviewDTO, ev: OverviewEventoDTO, data: Record<string, unknown>) => {
    setBusy(ev.eventId)
    setMsg(null)
    try {
      await wmsApi.executeOsEvent(os.serviceOrderId, ev.eventId, data)
      setMsg(`✓ ${PASSO_LABEL[ev.code ?? ''] ?? ev.label} concluído (${os.code}).`)
      setBipModal(null)
      carregar()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Falha ao executar o passo.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recebimento"
        subtitle="Fila de chegadas do CD — pré-aviso e bipagem são da torre; receber e conferir acontecem no coletor"
      >
        <div className="flex items-center gap-2">
          {conectado ? (
            <Badge tone={abertas.length ? 'warn' : 'ok'}>{abertas.length} chegada(s) em andamento</Badge>
          ) : (
            <Badge tone="warn">modo demo — conecte ao WMS</Badge>
          )}
          <button type="button" onClick={carregar} className="btn-ghost" title="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </PageHeader>

      {/* KPIs do funil */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Aguardando pré-aviso', n: kpis.preAviso, Icon: ClipboardList },
          { label: 'No coletor', n: kpis.coletor, Icon: Smartphone },
          { label: 'Aguardando bipagem', n: kpis.bipagem, Icon: Barcode },
          { label: 'Concluídas', n: kpis.concluidas, Icon: CheckCircle2 },
        ].map(({ label, n, Icon }) => (
          <div key={label} className="card p-3 flex items-center gap-3">
            <Icon className="h-5 w-5 text-ink-soft" />
            <div>
              <div className="text-lg font-semibold leading-none">{n}</div>
              <div className="text-xs text-ink-muted mt-1">{label}</div>
            </div>
          </div>
        ))}
      </div>

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
            title={loading ? 'Carregando…' : verConcluidas ? 'Nenhuma chegada concluída' : 'Nenhuma chegada em andamento'}
            text="Quando uma viagem com entrega neste CD for gerada, a chegada aparece aqui com os passos do recebimento."
          />
        </div>
      ) : (
        visiveis.map((os) => {
          const preAviso = os.eventos.find((e) => e.code === 'PREAVISORECEBIMENTO')
          const bipagem = os.eventos.find((e) => e.code === 'BIPAGEM')
          const conf = os.eventos.find((e) => e.code === 'CONFQUANTIDADE')
          const resumoConf = resumoConferencia(conf?.data ?? null)
          return (
            <div key={os.serviceOrderId} className="card overflow-hidden">
              <div className="border-b border-line px-4 py-3 flex flex-wrap items-center gap-2">
                <Truck className="h-4 w-4 text-brand" />
                <span className="font-semibold">
                  {os.documentos.length
                    ? os.documentos.map((d) => `${d.tipo ?? 'DOC'} ${d.numero ?? '—'}`).join(' · ')
                    : 'Carga da viagem'}
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

              {/* Timeline dos 4 passos */}
              <div className="px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                {os.eventos.map((ev) => (
                  <span key={ev.eventId} className="inline-flex items-center gap-1.5">
                    <StatusIcon ev={ev} />
                    <span
                      className={
                        ev.status === 'COMPLETED'
                          ? 'text-ink-soft'
                          : ev.status === 'AVAILABLE'
                            ? 'font-medium'
                            : 'text-ink-muted'
                      }
                    >
                      {PASSO_LABEL[ev.code ?? ''] ?? ev.label}
                      {ev.code === 'CONFQUANTIDADE' && resumoConf ? ` — ${resumoConf}` : ''}
                    </span>
                  </span>
                ))}
              </div>

              {/* Ações de torre */}
              {os.bloqueada && os.status !== 'COMPLETED' && (
                <div className="px-4 pb-3">
                  <Badge tone="warn">aguardando{os.bloqueadaPor ? `: ${os.bloqueadaPor}` : ' etapa anterior'}</Badge>
                </div>
              )}
              {preAviso?.status === 'AVAILABLE' && !os.bloqueada && (
                <div className="px-4 pb-3 flex flex-wrap items-center gap-2">
                  {docas.length > 0 && (
                    <select
                      value={docaSel[os.serviceOrderId] ?? ''}
                      onChange={(e) => setDocaSel((m) => ({ ...m, [os.serviceOrderId]: e.target.value }))}
                      className="rounded-lg border border-line bg-surface-sub px-2 py-1.5 text-sm outline-none"
                    >
                      <option value="">Doca (opcional)</option>
                      {docas.map((d) => (
                        <option key={d.id} value={d.code ?? d.name ?? d.nome ?? d.id}>
                          {d.code ?? d.name ?? d.nome ?? d.id}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() =>
                      executar(os, preAviso, docaSel[os.serviceOrderId] ? { doca: docaSel[os.serviceOrderId] } : {})
                    }
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    {busy === preAviso.eventId ? 'Registrando…' : 'Registrar pré-aviso (libera o coletor)'}
                  </button>
                </div>
              )}
              {bipagem?.status === 'AVAILABLE' && !os.bloqueada && (
                <div className="px-4 pb-3">
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => setBipModal({ os, ev: bipagem })}
                    className="btn-primary text-sm disabled:opacity-50"
                  >
                    <Barcode className="h-4 w-4 inline -mt-0.5 mr-1" />
                    Bipar volumes
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}

      {bipModal && (
        <BipagemModal
          os={bipModal.os}
          busy={busy === bipModal.ev.eventId}
          onClose={() => setBipModal(null)}
          onConfirm={(codigos) => {
            void executar(bipModal.os, bipModal.ev, { bipados: codigos })
          }}
        />
      )}
    </div>
  )
}

/** Modal de bipagem: bipa/cola um código por vez (Enter adiciona), concluir envia. */
function BipagemModal({
  os,
  busy,
  onClose,
  onConfirm,
}: {
  os: WarehouseOverviewDTO
  busy: boolean
  onClose: () => void
  onConfirm: (codigos: string[]) => void
}) {
  const [atual, setAtual] = useState('')
  const [codigos, setCodigos] = useState<string[]>([])

  const adicionar = () => {
    const v = atual.trim()
    if (!v) return
    if (!codigos.includes(v)) setCodigos((c) => [...c, v])
    setAtual('')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-lg p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Bipagem de volumes — {os.code}</h3>
          <button type="button" onClick={onClose} className="btn-ghost p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-ink-muted">
          Bipe (ou cole) o código de cada volume e pressione Enter. Ao concluir, o sistema registra
          bipados × esperados e fecha o recebimento.
        </p>
        <div className="flex gap-2">
          <input
            autoFocus
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                adicionar()
              }
            }}
            placeholder="Código do volume"
            className="flex-1 rounded-lg border border-line bg-surface-sub px-3 py-2 text-sm outline-none mono"
          />
          <button type="button" onClick={adicionar} className="btn-ghost text-sm">
            Adicionar
          </button>
        </div>
        {codigos.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {codigos.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full bg-surface-sub border border-line px-2 py-0.5 text-xs mono"
              >
                {c}
                <button type="button" onClick={() => setCodigos((l) => l.filter((x) => x !== c))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-soft">{codigos.length} volume(s) bipado(s)</span>
          <button
            type="button"
            disabled={codigos.length === 0 || busy}
            onClick={() => onConfirm(codigos)}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {busy ? 'Enviando…' : 'Concluir bipagem'}
          </button>
        </div>
      </div>
    </div>
  )
}
