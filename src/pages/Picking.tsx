import { useState, type ReactNode } from 'react'
import {
  Boxes,
  CalendarClock,
  ClipboardList,
  Layers,
  Map,
  Package,
  Route,
  ScanLine,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { COLETAS_TMS, ONDAS } from '../lib/mock'
import { useStore } from '../store/useStore'
import { Badge, Modal, PageHeader, Progress, Tab, Tabs, type Tone } from '../components/ui'
import OrdemServicoPanel from '../components/OrdemServicoPanel'
import type { Onda } from '../lib/types'

type AbaPicking = 'geral' | 'ondas' | 'viagens'

const estrategiaInfo: Record<Onda['estrategia'], { l: string; icon: LucideIcon; desc: string; quando: string }> = {
  discreto: { l: 'Discreto', icon: Package, desc: '1 pedido por vez', quando: 'Baixo volume, pedidos grandes' },
  batch: { l: 'Batch / Lote', icon: Layers, desc: 'Vários pedidos, mesmo SKU juntos', quando: 'Alto volume, itens repetidos' },
  wave: { l: 'Por onda (wave)', icon: Boxes, desc: 'Agrupado por rota/corte', quando: 'Sincronizar com expedição' },
  zona: { l: 'Por zona', icon: Map, desc: 'Operador cobre uma zona', quando: 'Armazém grande' },
  cluster: { l: 'Cluster', icon: Users, desc: 'N pedidos num carrinho', quando: 'E-commerce, pedidos pequenos' },
}
const statusMeta: Record<Onda['status'], { l: string; tone: Tone }> = {
  planejada: { l: 'Planejada', tone: 'neutral' },
  liberada: { l: 'Liberada', tone: 'info' },
  'em-separacao': { l: 'Em separação', tone: 'primary' },
  concluida: { l: 'Concluída', tone: 'ok' },
}

const VIAGENS_TMS = COLETAS_TMS.map((coleta) => ({
  ...coleta,
  tms: 'Redful',
  prioridade: coleta.risco === 'alto' ? 'alta' : 'media',
  statusLabel:
    coleta.status === 'recebida'
      ? 'recebida do TMS'
      : coleta.status === 'validando'
        ? 'validando reserva'
        : coleta.status === 'em-separacao'
          ? 'em separação'
          : coleta.status === 'em-packing'
            ? 'em packing'
            : coleta.status === 'carregando'
              ? 'carregando'
              : coleta.status,
}))

export default function Picking() {
  const { tarefas } = useStore()
  const [aba, setAba] = useState<AbaPicking>('geral')
  const [det, setDet] = useState<Onda | null>(null)
  const [viagemDet, setViagemDet] = useState<(typeof VIAGENS_TMS)[number] | null>(null)
  const osPicking = tarefas.filter((t) => t.tipo === 'picking')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Picking (Separação)"
        subtitle="Coração do outbound: ondas, viagens TMS, OS de separação e execução prática no mobile. (DEMO — dados de exemplo)"
      >
        <Badge tone="primary" dot>{osPicking.length} OS de picking</Badge>
      </PageHeader>

      <div className="card overflow-hidden">
        <div className="px-4 pt-1">
          <Tabs value={aba} onChange={(value) => setAba(value as AbaPicking)}>
            <Tab id="geral">Visão geral</Tab>
            <Tab id="ondas">Ondas</Tab>
            <Tab id="viagens">Coletas TMS</Tab>
          </Tabs>
        </div>

        <div className="p-5">
          {aba === 'geral' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted mb-2">Estratégias de separação</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(Object.keys(estrategiaInfo) as Onda['estrategia'][]).map((k) => {
                    const e = estrategiaInfo[k]
                    return (
                      <div key={k} className="card p-3.5">
                        <e.icon className="h-5 w-5 text-primary" />
                        <p className="mt-2 text-sm font-medium text-brand">{e.l}</p>
                        <p className="text-xs text-ink-muted mt-0.5">{e.desc}</p>
                        <p className="text-[11px] text-ink-muted mt-2 pt-2 border-t border-line">{e.quando}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                {[
                  ['OS de picking', osPicking.length],
                  ['Sem operador', osPicking.filter((t) => !t.operador).length],
                  ['Fazendo', osPicking.filter((t) => t.status === 'fazendo').length],
                  ['Problemas', osPicking.filter((t) => t.status === 'problema').length],
                ].map(([label, value]) => (
                  <div key={label as string} className="card p-4">
                    <div className="text-2xl font-semibold text-brand mono">{value}</div>
                    <div className="text-xs text-ink-muted mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              <OrdemServicoPanel
                title="OS de picking"
                subtitle="Crie tarefas de separação a partir de pedidos, ondas, viagens TMS ou exceções."
                tipos={['picking', 'reabastecimento']}
              />
            </div>
          )}

          {aba === 'ondas' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-line overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px]">
                    <thead>
                      <tr>
                        <th className="th">Onda</th>
                        <th className="th">Estratégia</th>
                        <th className="th text-right">Pedidos</th>
                        <th className="th text-right">Linhas</th>
                        <th className="th text-right">Itens</th>
                        <th className="th">Corte</th>
                        <th className="th">Progresso</th>
                        <th className="th">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ONDAS.map((o) => {
                        const e = estrategiaInfo[o.estrategia]
                        return (
                          <tr key={o.id} className="row-hover cursor-pointer" onClick={() => setDet(o)}>
                            <td className="td mono font-semibold text-brand">{o.id}</td>
                            <td className="td">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-primary-50 text-primary grid place-items-center">
                                  <e.icon className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-brand">{e.l}</p>
                                  <p className="text-xs text-ink-muted">{e.desc}</p>
                                </div>
                              </div>
                            </td>
                            <td className="td text-right mono">{o.pedidos}</td>
                            <td className="td text-right mono">{o.linhas}</td>
                            <td className="td text-right mono">{o.itens}</td>
                            <td className="td mono">{o.corte}</td>
                            <td className="td">
                              <div className="min-w-28">
                                <Progress value={o.progresso} tone={o.progresso === 100 ? 'ok' : 'primary'} />
                                <p className="text-[11px] text-ink-muted mt-1">{o.progresso}%</p>
                              </div>
                            </td>
                            <td className="td"><Badge tone={statusMeta[o.status].tone} dot>{statusMeta[o.status].l}</Badge></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <InfoBand icon={<ScanLine className="h-4 w-4" />} title="Ao clicar na onda" text="O supervisor vê rota de separação, exceções, reabastecimento necessário e pode gerar/acompanhar OS para o operador executar no mobile." />
            </div>
          )}

          {aba === 'viagens' && (
            <div className="grid xl:grid-cols-[1fr_0.75fr] gap-4">
              <div className="rounded-2xl border border-line overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[880px]">
                    <thead>
                      <tr>
                        <th className="th">Viagem TMS</th>
                        <th className="th">Transportadora / rota</th>
                        <th className="th">Doca</th>
                        <th className="th">Corte</th>
                        <th className="th text-right">Pedidos</th>
                        <th className="th text-right">Volumes</th>
                        <th className="th">Status</th>
                        <th className="th"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {VIAGENS_TMS.map((viagem) => (
                        <tr key={viagem.id} className="row-hover">
                          <td className="td">
                            <p className="mono font-semibold text-brand">{viagem.id}</p>
                            <p className="text-xs text-ink-muted">{viagem.tms} · {viagem.viagemIdTms}</p>
                          </td>
                          <td className="td">
                            <p className="text-sm text-ink-soft">{viagem.transportadora}</p>
                            <p className="text-xs text-ink-muted">{viagem.rota}</p>
                          </td>
                          <td className="td mono">{viagem.doca}</td>
                          <td className="td mono">{viagem.cutOff}</td>
                          <td className="td text-right mono">{viagem.pedidos.length}</td>
                          <td className="td text-right mono">{viagem.volumesPrevistos}</td>
                          <td className="td">
                            <Badge tone={viagem.risco === 'alto' ? 'bad' : viagem.risco === 'medio' ? 'warn' : 'ok'}>
                              {viagem.statusLabel}
                            </Badge>
                          </td>
                          <td className="td">
                            <div className="flex items-center justify-end gap-1.5">
                              <button className="btn-outline py-1.5 px-2 text-xs" onClick={() => setViagemDet(viagem)}>Detalhes</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                <InfoPanel
                  icon={<Truck className="h-5 w-5" />}
                  title="O que vem do TMS"
                  lines={[
                    'Viagem, rota, transportadora, veículo e janela de corte.',
                    'Pedidos/volumes que precisam estar prontos para carregar.',
                    'Prioridade operacional conforme horário e SLA da rota.',
                  ]}
                />
                <InfoPanel
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="O que o WMS cria"
                  lines={[
                    'Onda de separação agrupada pela viagem.',
                    'OS por zona, batch ou operador para execução no mobile.',
                    'Reabastecimento quando a onda exige item sem picking face suficiente.',
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={!!det} onClose={() => setDet(null)} title={`Onda ${det?.id}`} subtitle={det ? estrategiaInfo[det.estrategia].l : undefined} size="lg">
        {det && (
          <div className="space-y-4">
            {(() => {
              const coleta = COLETAS_TMS.find((c) => c.id === det.coletaId)
              if (!coleta) return null
              return (
                <div className="rounded-xl border border-primary/15 bg-primary-50/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Coleta / viagem que esta onda atende</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <Detail label="Coleta" value={coleta.id} mono />
                    <Detail label="Viagem TMS" value={coleta.viagemIdTms} mono />
                    <Detail label="Doca" value={coleta.doca} mono />
                    <Detail label="Janela" value={coleta.janelaColeta} mono />
                  </div>
                  <p className="mt-3 text-sm text-ink-soft">
                    A separação precisa terminar até <span className="mono font-semibold text-brand">{coleta.cutOff}</span> para alimentar o packing, romaneio e carregamento do veículo {coleta.placa}.
                  </p>
                </div>
              )
            })()}
            <div className="rounded-xl bg-warn-50 border border-warn/20 p-3 text-xs text-warn">
              <strong>Exceções no fluxo:</strong> endereço com quantidade insuficiente gera picking parcial + tarefa de
              reabastecimento. Produto avariado registra ocorrência e o sistema busca outro endereço com o SKU.
            </div>
            <div className="rounded-xl border border-line overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="th">Sequência</th>
                    <th className="th">Endereço</th>
                    <th className="th">SKU</th>
                    <th className="th text-right">Qtde</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { a: 'A-12-03-2', s: 'SKU-10241', d: 'Fone Bluetooth Pulse X', q: 2, st: 'ok' },
                    { a: 'A-12-04-1', s: 'SKU-10242', d: 'Carregador Turbo 30W', q: 1, st: 'ok' },
                    { a: 'A-13-01-1', s: 'SKU-10243', d: 'Cabo USB-C 2m', q: 4, st: 'parcial' },
                    { a: 'B-04-12-3', s: 'SKU-20055', d: 'Sérum Vitamina C 30ml', q: 2, st: 'ok' },
                  ].map((r, index) => (
                    <tr key={`${r.s}-${index}`} className="row-hover">
                      <td className="td mono">{index + 1}</td>
                      <td className="td mono text-primary">{r.a}</td>
                      <td className="td">
                        <p className="text-sm text-ink-soft">{r.d}</p>
                        <p className="text-xs text-ink-muted mono">{r.s}</p>
                      </td>
                      <td className="td text-right mono">{r.q}</td>
                      <td className="td">{r.st === 'parcial' ? <Badge tone="warn">Parcial → reabast.</Badge> : <Badge tone="ok">OK</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl bg-surface-sub p-3 text-xs text-ink-muted flex items-center gap-2">
              <Map className="h-4 w-4" /> Rota otimizada: o sistema ordena os endereços para minimizar deslocamento.
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!viagemDet} onClose={() => setViagemDet(null)} title={`Coleta ${viagemDet?.id}`} subtitle={viagemDet?.rota} size="lg">
        {viagemDet && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-4 gap-3">
              <Detail label="Transportadora" value={viagemDet.transportadora} />
              <Detail label="Veículo" value={`${viagemDet.veiculo} · ${viagemDet.placa}`} />
              <Detail label="Doca" value={viagemDet.doca} mono />
              <Detail label="Corte" value={viagemDet.cutOff} mono />
            </div>
            <InfoBand icon={<Route className="h-4 w-4" />} title="Fluxo recomendado" text="TMS envia viagem programada. WMS agrupa pedidos em onda, reserva estoque, gera OS de picking por estratégia e depois entrega volumes conferidos para expedição/TMS." />
            <div className="grid gap-3 sm:grid-cols-3">
              <Detail label="Picking" value={`${viagemDet.progressoPicking}%`} mono />
              <Detail label="Packing" value={`${viagemDet.progressoPacking}%`} mono />
              <Detail label="Carregamento" value={`${viagemDet.progressoCarregamento}%`} mono />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function InfoBand({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl bg-surface-sub border border-line p-3 text-sm flex items-start gap-2">
      <span className="text-primary mt-0.5">{icon}</span>
      <div>
        <p className="font-medium text-brand">{title}</p>
        <p className="text-ink-muted mt-0.5">{text}</p>
      </div>
    </div>
  )
}

function InfoPanel({ icon, title, lines }: { icon: ReactNode; title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary grid place-items-center">{icon}</div>
      <p className="text-sm font-semibold text-brand mt-4">{title}</p>
      <div className="mt-3 space-y-2">
        {lines.map((line) => (
          <div key={line} className="flex gap-2 text-sm text-ink-soft">
            <CalendarClock className="h-4 w-4 text-ink-muted mt-0.5 shrink-0" />
            <span>{line}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-sub border border-line p-3">
      <p className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={`text-sm font-medium text-brand mt-1 ${mono ? 'mono' : ''}`}>{value}</p>
    </div>
  )
}
