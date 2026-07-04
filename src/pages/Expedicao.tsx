import { useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  Boxes,
  Camera,
  CheckCircle2,
  ClipboardList,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ScanLine,
  Send,
  ShieldCheck,
  Truck,
  XCircle,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, PageHeader, Progress, Tab, Tabs, type Tone } from '../components/ui'
import {
  CARGAS_EXPEDICAO,
  DEMO_EXPEDITION_MOBILE_EVENTS,
  MARGEM_CUBAGEM_EXPEDICAO,
  criarRequisicaoBipagemExpedicao,
  avaliarChecklistEmbarque,
  avaliarConferenciaExpedicao,
  calcularResumoCargaExpedicao,
  type CargaExpedicao,
  type CondicaoVeiculo,
  type StatusCargaExpedicao,
  type VolumeExpedicao,
} from '../lib/expedicaoWorkflow'

type AbaExpedicao = 'ordem' | 'conferencia' | 'checklist' | 'historico'

const statusMeta: Record<StatusCargaExpedicao, { label: string; tone: Tone }> = {
  'montagem-aprovada': { label: 'Montagem aprovada', tone: 'info' },
  'anexada-destino': { label: 'Anexada ao destino', tone: 'primary' },
  reservada: { label: 'Reservada', tone: 'info' },
  conferencia: { label: 'Conferencia', tone: 'warn' },
  'pronta-expedicao': { label: 'Pronta para expedicao', tone: 'ok' },
  carregando: { label: 'Carregando', tone: 'primary' },
  'viagem-liberada': { label: 'Viagem liberada', tone: 'ok' },
  bloqueada: { label: 'Bloqueada', tone: 'bad' },
}

const groupByCte = (volumes: VolumeExpedicao[]) =>
  volumes.reduce<Record<string, VolumeExpedicao[]>>((groups, volume) => {
    groups[volume.cte] = [...(groups[volume.cte] ?? []), volume]
    return groups
  }, {})

const initialBipados = CARGAS_EXPEDICAO.reduce<Record<string, boolean>>((acc, carga) => {
  carga.volumes.forEach((volume) => {
    acc[volume.id] = volume.bipado
  })
  return acc
}, {})

export default function Expedicao() {
  const { toast } = useStore()
  const [aba, setAba] = useState<AbaExpedicao>('ordem')
  const [cargaId, setCargaId] = useState(CARGAS_EXPEDICAO[0]?.id ?? '')
  const [bipados, setBipados] = useState<Record<string, boolean>>(initialBipados)
  const [condicaoVeiculo, setCondicaoVeiculo] = useState<CondicaoVeiculo>('ok')
  const [fotoRegistrada, setFotoRegistrada] = useState(true)

  const carga = useMemo<CargaExpedicao>(() => {
    const cargaBase = CARGAS_EXPEDICAO.find((item) => item.id === cargaId) ?? CARGAS_EXPEDICAO[0]
    return {
      ...cargaBase,
      volumes: cargaBase.volumes.map((volume) => ({
        ...volume,
        bipado: bipados[volume.id] ?? volume.bipado,
      })),
    }
  }, [bipados, cargaId])

  const resumo = useMemo(
    () => calcularResumoCargaExpedicao(carga.volumes, carga),
    [carga],
  )
  const conferencia = useMemo(() => avaliarConferenciaExpedicao(carga.volumes), [carga.volumes])
  const checklist = useMemo(
    () =>
      avaliarChecklistEmbarque({
        placa: carga.placa,
        motorista: carga.motorista,
        horario: carga.horario,
        destino: carga.destino,
        carga: carga.id,
        condicaoVeiculo,
        fotoRegistrada,
      }),
    [carga, condicaoVeiculo, fotoRegistrada],
  )

  const biparVolume = (volume: VolumeExpedicao) => {
    const evento = criarRequisicaoBipagemExpedicao({
      cargaId: carga.id,
      tarefaId: carga.tarefaConferenciaId,
      volumeId: volume.id,
      operadorId: 'usr-1',
      deviceId: 'dev-1',
      resultado: 'ok',
      timestamp: new Date().toISOString(),
    })
    setBipados((atual) => ({ ...atual, [volume.id]: true }))
    toast({ tipo: 'sucesso', titulo: 'Evento recebido do APP', texto: `${evento.eventType} · ${volume.id}` })
  }

  const finalizarChecklist = () => {
    toast({
      tipo: checklist.proximaAcao === 'disparar-frotas' ? 'aviso' : 'sucesso',
      titulo: checklist.status === 'recusado' ? 'Veiculo recusado' : 'Checklist finalizado',
      texto: checklist.mensagem,
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expedicao"
        subtitle="Ordem de separacao, conferencia individual por volume, checklist de embarque e liberacao da viagem."
      >
        <Badge tone={conferencia.status === 'conferida' ? 'ok' : 'warn'} dot>
          {conferencia.volumesBipados}/{resumo.totalVolumes} volumes bipados
        </Badge>
      </PageHeader>

      <div className="rounded-xl border border-info/20 bg-info-50 px-4 py-3 text-sm text-info">
        Montagem aprovada: quando o pallet sai da montagem, o proprio WMS anexa a carga ao destino operacional
        correto. Se for cross-docking, ela entra nesta expedicao; se for enderecamento, segue para putaway.
        A cubagem ja aparece com 20% de margem.
      </div>

      <section className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          {CARGAS_EXPEDICAO.map((item) => {
            const itemResumo = calcularResumoCargaExpedicao(item.volumes, item)
            const meta = statusMeta[item.status]
            const active = item.id === carga.id
            return (
              <button
                key={item.id}
                onClick={() => setCargaId(item.id)}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  active ? 'border-primary bg-primary-50/40' : 'border-line bg-surface hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="mono text-sm font-semibold text-brand">{item.id}</p>
                    <p className="mt-1 text-sm text-ink-soft">{item.destino}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {item.origem.montagemId} · {item.destinoOperacional}
                    </p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <TinyStat label="CTE" value={itemResumo.totalCtes} />
                  <TinyStat label="Vol" value={itemResumo.totalVolumes} />
                  <TinyStat label="m3" value={itemResumo.cubagemReservadaM3} />
                </div>
              </button>
            )
          })}
        </aside>

        <div className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-brand mono">{carga.id}</h2>
                  <Badge tone={statusMeta[carga.status].tone} dot>{statusMeta[carga.status].label}</Badge>
                  <Badge tone="primary">
                    <LockKeyhole className="h-3.5 w-3.5" /> Carga reservada
                  </Badge>
                  <Badge tone={carga.destinoOperacional === 'cross-docking' ? 'warn' : 'info'}>
                    {carga.destinoOperacional}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  Montagem aprovada {carga.origem.montagemId} · A4 {carga.origem.palletA4Id} · {carga.transportadora} · {carga.doca}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 pt-1">
            <Tabs value={aba} onChange={(value) => setAba(value as AbaExpedicao)}>
              <Tab id="ordem">Carga</Tab>
              <Tab id="conferencia">Conferencia por volume</Tab>
              <Tab id="checklist">Checklist embarque</Tab>
              <Tab id="historico">Rastreabilidade</Tab>
            </Tabs>
          </div>

          <div className="p-5">
            {aba === 'ordem' && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <Metric icon={<PackageCheck className="h-5 w-5" />} label="Volumes" value={resumo.totalVolumes} />
                  <Metric icon={<Boxes className="h-5 w-5" />} label="Pallets" value={resumo.totalPallets} />
                  <Metric icon={<ClipboardList className="h-5 w-5" />} label="CTEs" value={resumo.totalCtes} />
                  <Metric icon={<Truck className="h-5 w-5" />} label="m3 reservado" value={resumo.cubagemReservadaM3} />
                  <Metric icon={<ShieldCheck className="h-5 w-5" />} label="20% de margem" value={`${MARGEM_CUBAGEM_EXPEDICAO * 100}%`} />
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <OriginDetail label="Origem WMS" value="Montagem aprovada" />
                  <OriginDetail label="Montagem" value={carga.origem.montagemId} mono />
                  <OriginDetail label="Recebimento" value={carga.origem.recebimentoId} mono />
                  <OriginDetail label="Anexado em" value={new Date(carga.origem.anexadoEm).toLocaleString('pt-BR')} />
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-xl border border-line overflow-hidden">
                    <table className="w-full min-w-[760px]">
                      <thead>
                        <tr>
                          <th className="th">CTE</th>
                          <th className="th">Volume</th>
                          <th className="th">Pallet</th>
                          <th className="th">Staging</th>
                          <th className="th text-right">m3</th>
                          <th className="th text-right">Kg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(groupByCte(carga.volumes)).flatMap(([cte, volumes]) =>
                          volumes.map((volume) => (
                            <tr key={volume.id} className="row-hover">
                              <td className="td mono font-semibold text-brand">{cte}</td>
                              <td className="td">
                                <p className="mono text-brand">{volume.id}</p>
                                <p className="text-xs text-ink-muted">{volume.descricao}</p>
                              </td>
                              <td className="td mono">{volume.palletId}</td>
                              <td className="td mono">{volume.staging}</td>
                              <td className="td text-right mono">{volume.cubagemM3.toFixed(2)}</td>
                              <td className="td text-right mono">{volume.pesoKg.toFixed(1)}</td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-xl border border-line bg-surface-sub p-4">
                    <p className="text-sm font-semibold text-brand">Compatibilidade do veiculo</p>
                    <div className="mt-4 space-y-4">
                      <Occupancy label="Cubagem com margem" value={resumo.ocupacaoM3Percentual} ok={resumo.cabeNoVeiculo} />
                      <Occupancy label="Peso" value={resumo.ocupacaoKgPercentual} ok={resumo.ocupacaoKgPercentual <= 100} />
                    </div>
                    <div className="mt-4 rounded-lg bg-surface p-3 text-sm">
                      <p className="text-ink-muted">Espaco livre depois da margem</p>
                      <p className="mt-1 text-2xl font-semibold text-brand mono">{resumo.espacoLivreM3.toFixed(2)} m3</p>
                    </div>
                    <p className="mt-3 text-xs text-ink-muted">
                      A carga compativel e definida pelo WMS no fechamento da montagem e anexada ao destino correto.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {aba === 'conferencia' && (
              <div className="space-y-4">
                <div className={`rounded-xl border p-4 ${conferencia.status === 'conferida' ? 'border-ok/30 bg-ok-50' : 'border-warn/30 bg-warn-50'}`}>
                  <div className="flex items-start gap-3">
                    {conferencia.status === 'conferida' ? <CheckCircle2 className="h-5 w-5 text-ok" /> : <AlertTriangle className="h-5 w-5 text-warn" />}
                    <div>
                      <p className="font-semibold text-brand">
                        {conferencia.status === 'conferida' ? 'Itens e quantidade de acordo' : 'Divergencia na conferencia'}
                      </p>
                      <p className="mt-1 text-sm text-ink-soft">{conferencia.mensagem}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {carga.volumes.map((volume) => (
                    <div key={volume.id} className="rounded-xl border border-line bg-surface p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="mono font-semibold text-brand">{volume.id}</p>
                          <p className="mt-1 text-sm text-ink-soft">{volume.descricao}</p>
                          <p className="mt-1 text-xs text-ink-muted">{volume.cte} · {volume.palletId}</p>
                        </div>
                        {volume.bipado ? <Badge tone="ok">Bipado</Badge> : <Badge tone="warn">Pendente</Badge>}
                      </div>
                      {volume.divergencia && (
                        <div className="mt-3 rounded-lg bg-bad-50 px-3 py-2 text-xs text-bad">
                          {volume.divergencia}
                        </div>
                      )}
                      <button
                        className="btn-outline mt-4 w-full py-2 text-sm"
                        disabled={volume.bipado}
                        onClick={() => biparVolume(volume)}
                      >
                        <ScanLine className="h-4 w-4" /> Bipar volume
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aba === 'checklist' && (
              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <div className="rounded-xl border border-line overflow-hidden">
                  <table className="w-full">
                    <tbody>
                      <ChecklistRow label="Placa" value={carga.placa} icon={<Truck className="h-4 w-4" />} />
                      <ChecklistRow label="Motorista" value={carga.motorista} icon={<ShieldCheck className="h-4 w-4" />} />
                      <ChecklistRow label="Horario" value={carga.horario} icon={<ClipboardList className="h-4 w-4" />} />
                      <ChecklistRow label="Destino" value={carga.destino} icon={<MapPin className="h-4 w-4" />} />
                      <ChecklistRow label="Carga" value={`${carga.id} / ${carga.romaneioId}`} icon={<PackageCheck className="h-4 w-4" />} />
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-line bg-surface-sub p-4">
                  <p className="text-sm font-semibold text-brand">Condicao do veiculo + foto</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      className={`btn-outline py-2 ${condicaoVeiculo === 'ok' ? 'border-ok bg-ok-50 text-ok' : ''}`}
                      onClick={() => setCondicaoVeiculo('ok')}
                    >
                      <CheckCircle2 className="h-4 w-4" /> Veiculo ok
                    </button>
                    <button
                      className={`btn-outline py-2 ${condicaoVeiculo === 'recusado' ? 'border-bad bg-bad-50 text-bad' : ''}`}
                      onClick={() => setCondicaoVeiculo('recusado')}
                    >
                      <XCircle className="h-4 w-4" /> Veiculo recusado
                    </button>
                  </div>
                  <button
                    className={`btn-outline mt-3 w-full py-2 ${fotoRegistrada ? 'border-info bg-info-50 text-info' : ''}`}
                    onClick={() => setFotoRegistrada((value) => !value)}
                  >
                    <Camera className="h-4 w-4" /> {fotoRegistrada ? 'Foto registrada' : 'Registrar foto'}
                  </button>

                  <div className={`mt-4 rounded-xl border p-3 text-sm ${checklist.status === 'recusado' ? 'border-bad/30 bg-bad-50 text-bad' : checklist.status === 'aprovado' ? 'border-ok/30 bg-ok-50 text-ok' : 'border-warn/30 bg-warn-50 text-warn'}`}>
                    <p className="font-semibold">
                      {checklist.status === 'recusado' ? 'Foi disparado para o frotas na parte de contratacao' : checklist.mensagem}
                    </p>
                    {checklist.status === 'recusado' && (
                      <p className="mt-1">
                        Prioridade maxima porque a viagem ja esta agendada, a carga foi separada e conferida, so falta o caminhao.
                      </p>
                    )}
                  </div>

                  <button className="btn-primary mt-4 w-full" onClick={finalizarChecklist}>
                    <Send className="h-4 w-4" /> Finalizar checklist
                  </button>
                  <p className="mt-3 text-xs text-ink-muted">
                    A execucao operacional deste checklist entra no wms-mobile; aqui fica o espelho para teste desktop.
                  </p>
                </div>
              </div>
            )}

            {aba === 'historico' && (
              <div className="space-y-3">
                {[
                  ['Montagem aprovada', 'O WMS fecha a montagem do pallet, calcula CTE, volumes, pallets e m3.'],
                  ['Anexo ao destino', 'Ao sair da montagem, a carga segue para enderecamento ou cross-docking conforme o fluxo definido no WMS.'],
                  ['Reserva', 'Ao entrar em expedicao, os volumes ficam reservados para impedir movimentacao por outro operador.'],
                  ['Separacao', 'Operador recebe a ordem de separacao e leva os volumes ao staging de expedicao.'],
                  ['Conferencia', 'Mesmo com etiqueta de pallet, cada volume precisa ser bipado individualmente.'],
                  ['Embarque', 'Veiculo ok libera viagem; veiculo recusado aciona frotas como prioridade maxima.'],
                ].map(([title, text], index) => (
                  <div key={title} className="flex gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-primary-50 text-primary grid place-items-center mono text-xs font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-brand">{title}</p>
                      <p className="mt-0.5 text-sm text-ink-muted">{text}</p>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-line bg-surface p-4">
                  <p className="text-sm font-semibold text-brand">Eventos recebidos do APP</p>
                  <div className="mt-3 space-y-2">
                    {DEMO_EXPEDITION_MOBILE_EVENTS.filter((evento) => evento.objectId === carga.id).map((evento) => (
                      <div key={evento.id} className="rounded-lg bg-surface-sub px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="mono font-semibold text-brand">{evento.eventType}</span>
                          <Badge tone="info">{String(evento.payload?.syncStatus ?? 'SYNC_PENDING')}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">{evento.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function TinyStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface px-2 py-2">
      <p className="text-[10px] uppercase text-ink-muted">{label}</p>
      <p className="mono text-sm font-semibold text-brand">{value}</p>
    </div>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-line bg-surface-sub p-4">
      <div className="text-primary">{icon}</div>
      <p className="mt-3 text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-brand mono">{value}</p>
    </div>
  )
}

function OriginDetail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface-sub p-3">
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`mt-1 text-sm font-semibold text-brand ${mono ? 'mono' : ''}`}>{value}</p>
    </div>
  )
}

function Occupancy({ label, value, ok }: { label: string; value: number; ok: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="mono font-semibold text-brand">{value.toFixed(1)}%</span>
      </div>
      <Progress value={value} tone={ok ? 'ok' : 'bad'} />
    </div>
  )
}

function ChecklistRow({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <tr className="row-hover">
      <td className="td w-12 text-primary">{icon}</td>
      <td className="td text-ink-muted">{label}</td>
      <td className="td text-right font-semibold text-brand mono">{value}</td>
    </tr>
  )
}
