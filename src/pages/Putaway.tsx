import { useMemo, useState, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Lightbulb,
  MapPin,
  PackageOpen,
  RefreshCw,
  Repeat2,
  Search,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Badge, EmptyState, Modal, PageHeader, ScanInput, Tab, Tabs, type Tone } from '../components/ui'
import OrdemServicoPanel from '../components/OrdemServicoPanel'
import { ownerName } from '../lib/mock'
import {
  ORDEM_CLASSIFICACAO_DESTINO_ENDERECAMENTO,
  recebimentoLiberadoParaPutaway,
  tarefaPutawayLiberada,
} from '../lib/skuControle'
import { cn } from '../lib/utils'
import { ADMIN_BUSINESS_DOCAS, ADMIN_BUSINESS_PUTAWAY, sugerirEnderecoPutaway } from '../lib/adminBusinessLocations'
import type { ItemRecebimento, Recebimento, Tarefa } from '../lib/types'

type AbaPutaway = 'piso' | 'os' | 'recorrentes'
type StatusPallet = 'sem-os' | 'parcial' | 'em-execucao' | 'guardado' | 'problema'

const REGRAS_RECORRENTES_INICIAIS = [
  { id: 'REG-01', sku: 'SKU-30011', descricao: 'Azeite Extra Virgem 500ml', ownerId: 'own-verde', origem: ADMIN_BUSINESS_DOCAS.recebimento01, destino: ADMIN_BUSINESS_PUTAWAY.verdePrincipal, ativo: true, regra: 'FEFO + alimentos' },
  { id: 'REG-02', sku: 'SKU-20056', descricao: 'Base Líquida Tom 02', ownerId: 'own-bella', origem: ADMIN_BUSINESS_DOCAS.recebimento02, destino: ADMIN_BUSINESS_PUTAWAY.bellaSecundario, ativo: true, regra: 'Cosméticos em picking B' },
  { id: 'REG-03', sku: 'SKU-10241', descricao: 'Fone Bluetooth Pulse X', ownerId: 'own-nano', origem: ADMIN_BUSINESS_DOCAS.expedicao03, destino: ADMIN_BUSINESS_PUTAWAY.nanoPrincipal, ativo: true, regra: 'Curva A perto do packing' },
  { id: 'REG-04', sku: 'MP-7781', descricao: 'Resina PET grau A', ownerId: 'own-forte', origem: ADMIN_BUSINESS_DOCAS.mista04, destino: ADMIN_BUSINESS_PUTAWAY.excecaoQualidade, ativo: false, regra: 'Qualidade antes de estoque' },
]

type RegraRecorrente = (typeof REGRAS_RECORRENTES_INICIAIS)[number]
type MercadoriaPiso = {
  rec: Recebimento
  item: ItemRecebimento
  osExistente: Tarefa | undefined
  recorrente: RegraRecorrente | undefined
  origem: string
  destino: string
}
type PalletEnderecamento = {
  id: string
  rec: Recebimento
  origem: string
  destinos: string[]
  destinoResumo: string
  linhas: MercadoriaPiso[]
  totalUnidades: number
  skus: number
  osCriadas: number
  osPendentes: number
  status: StatusPallet
  proximaAcao: string
  recorrente: boolean
}

const statusPalletMeta: Record<StatusPallet, { label: string; tone: Tone }> = {
  'sem-os': { label: 'Sem OS', tone: 'neutral' },
  parcial: { label: 'OS abertas', tone: 'primary' },
  'em-execucao': { label: 'Em execução', tone: 'primary' },
  guardado: { label: 'Guardado', tone: 'ok' },
  problema: { label: 'Problema', tone: 'bad' },
}

function origemPutaway(rec: Recebimento) {
  if (rec.status === 'na-doca') return rec.doca
  if (rec.status === 'concluido') return `STG-${rec.doca.replace(/\s/g, '-')}`
  return `PISO-${rec.doca.replace(/\s/g, '-')}`
}

function statusDoPallet(linhas: MercadoriaPiso[]): StatusPallet {
  if (linhas.some((linha) => linha.osExistente?.status === 'problema' || linha.item.ocorrencia)) return 'problema'
  if (linhas.length > 0 && linhas.every((linha) => linha.osExistente?.status === 'feito')) return 'guardado'
  if (linhas.some((linha) => linha.osExistente?.status === 'fazendo')) return 'em-execucao'
  if (linhas.some((linha) => linha.osExistente)) return 'parcial'
  return 'sem-os'
}

function proximaAcaoDoPallet(status: StatusPallet, osPendentes: number) {
  if (status === 'problema') return 'Tratar divergência'
  if (status === 'guardado') return 'Pallet guardado'
  if (osPendentes > 0) return osPendentes === 1 ? 'OS pendente' : 'OS pendentes'
  if (status === 'em-execucao') return 'Acompanhar execução'
  return 'Atribuir / executar OS'
}

function agruparPallets(linhas: MercadoriaPiso[]): PalletEnderecamento[] {
  const grupos = new Map<string, MercadoriaPiso[]>()
  linhas.forEach((linha) => {
    const chave = `${linha.rec.id}-${linha.origem}`
    grupos.set(chave, [...(grupos.get(chave) ?? []), linha])
  })

  const ordemPorRecebimento = new Map<string, number>()
  return [...grupos.values()].map((grupo) => {
    const rec = grupo[0].rec
    const ordem = (ordemPorRecebimento.get(rec.id) ?? 0) + 1
    ordemPorRecebimento.set(rec.id, ordem)
    const destinos = [...new Set(grupo.map((linha) => linha.destino))]
    const osCriadas = grupo.filter((linha) => linha.osExistente).length
    const osPendentes = grupo.length - osCriadas
    const status = statusDoPallet(grupo)

    return {
      id: `PLT-${rec.id.replace('REC-', '')}-${String(ordem).padStart(2, '0')}`,
      rec,
      origem: grupo[0].origem,
      destinos,
      destinoResumo: destinos.length === 1 ? destinos[0] : `${destinos.length} destinos`,
      linhas: grupo,
      totalUnidades: grupo.reduce((total, linha) => total + (linha.item.contado ?? linha.item.esperado), 0),
      skus: new Set(grupo.map((linha) => linha.item.skuCodigo)).size,
      osCriadas,
      osPendentes,
      status,
      proximaAcao: proximaAcaoDoPallet(status, osPendentes),
      recorrente: grupo.some((linha) => linha.recorrente),
    }
  })
}

export default function Putaway() {
  const {
    tarefas,
    recebimentos,
    assumirTarefa,
    concluirTarefa,
    toast,
  } = useStore()
  const [aba, setAba] = useState<AbaPutaway>('piso')
  const [exec, setExec] = useState<string | null>(null)
  const [buscaPiso, setBuscaPiso] = useState('')
  const [palletSelecionadoId, setPalletSelecionadoId] = useState<string | null>(null)
  const [regras, setRegras] = useState(REGRAS_RECORRENTES_INICIAIS)
  const tarefa = tarefas.find((t) => t.id === exec) ?? null
  const fila = useMemo(
    () => tarefas.filter((t) => t.tipo === 'putaway' && tarefaPutawayLiberada(t, recebimentos)),
    [recebimentos, tarefas],
  )
  const putawayBloqueados = useMemo(
    () => tarefas.filter((t) => t.tipo === 'putaway' && !tarefaPutawayLiberada(t, recebimentos)).length,
    [recebimentos, tarefas],
  )
  const mercadoriasPiso = useMemo<MercadoriaPiso[]>(
    () =>
      recebimentos
        .filter(recebimentoLiberadoParaPutaway)
        .flatMap((rec) =>
          rec.itens.map((item) => {
            const osExistente = fila.find((t) => t.referenciaId === rec.id && t.sku === item.skuCodigo)
            const recorrente = regras.find((regra) => regra.sku === item.skuCodigo && regra.ativo)
            return {
              rec,
              item,
              osExistente,
              recorrente,
              origem: origemPutaway(rec),
              destino: recorrente?.destino ?? osExistente?.destino ?? sugerirEnderecoPutaway(item.skuCodigo),
            }
          }),
        ),
    [fila, recebimentos, regras],
  )
  const palletsPiso = useMemo(() => agruparPallets(mercadoriasPiso), [mercadoriasPiso])
  const palletsFiltrados = useMemo(() => {
    const q = buscaPiso.trim().toLowerCase()
    if (!q) return palletsPiso

    return palletsPiso.filter((pallet) => {
      const alvo = [
        pallet.id,
        pallet.rec.id,
        pallet.rec.documento,
        pallet.rec.fornecedor,
        pallet.rec.doca,
        ownerName(pallet.rec.ownerId),
        pallet.origem,
        ...pallet.destinos,
        ...pallet.linhas.map((linha) => `${linha.item.skuCodigo} ${linha.item.descricao} ${linha.osExistente?.id ?? ''}`),
      ].join(' ').toLowerCase()

      return alvo.includes(q)
    })
  }, [buscaPiso, palletsPiso])
  const palletSelecionado =
    palletsFiltrados.find((pallet) => pallet.id === palletSelecionadoId) ?? palletsFiltrados[0] ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Endereçamento / Putaway"
        subtitle="Pallet montado no recebimento → Sistema sugere destino → Operador transporta → Bipa → Disponível (DEMO — dados de exemplo)"
      >
        <Badge tone="info" dot>
          {fila.filter((t) => t.status !== 'feito').length} OS pendentes
        </Badge>
        {putawayBloqueados > 0 && (
          <Badge tone="warn" dot>
            {putawayBloqueados} bloqueadas até etapa {ORDEM_CLASSIFICACAO_DESTINO_ENDERECAMENTO}
          </Badge>
        )}
      </PageHeader>

      <div className="card p-4 flex items-start gap-3 bg-primary-50/40 border-primary/10">
        <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-ink-soft">
          <span className="font-medium text-brand">Unidade de trabalho:</span> o recebimento agrupa itens em pallets; o supervisor acompanha
          o pallet e abre o detalhe só quando precisa validar SKU, lote, quantidade, destino ou OS. A liberação continua na ordem{' '}
          {ORDEM_CLASSIFICACAO_DESTINO_ENDERECAMENTO}, classificação de destino + endereçamento.
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 pt-1">
          <Tabs value={aba} onChange={(value) => setAba(value as AbaPutaway)}>
            <Tab id="piso">Pallets / staging</Tab>
            <Tab id="os">OS abertas</Tab>
            <Tab id="recorrentes">Recorrentes</Tab>
          </Tabs>
        </div>

        <div className="p-4">
          {aba === 'piso' && (
            <PalletsPisoView
              palletsTodos={palletsPiso}
              pallets={palletsFiltrados}
              selecionado={palletSelecionado}
              busca={buscaPiso}
              putawayBloqueados={putawayBloqueados}
              onBuscaChange={setBuscaPiso}
              onSelecionar={setPalletSelecionadoId}
            />
          )}

          {aba === 'os' && (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[640px] overflow-y-auto pr-1">
              {fila.map((t) => (
                <div key={t.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <span className="mono text-xs font-medium text-ink-muted">{t.id}</span>
                    {t.status === 'feito' ? (
                      <Badge tone="ok" dot>Guardado</Badge>
                    ) : t.status === 'fazendo' ? (
                      <Badge tone="primary" dot>Em execução</Badge>
                    ) : t.status === 'problema' ? (
                      <Badge tone="bad" dot>Problema</Badge>
                    ) : (
                      <Badge tone={t.prioridade === 'alta' ? 'bad' : 'neutral'}>Prioridade {t.prioridade}</Badge>
                    )}
                  </div>
                  <p className="mt-2 font-medium text-brand">{t.descricao}</p>
                  <p className="text-xs text-ink-muted mono">{t.sku} · {t.quantidade} un</p>

                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-sub p-2.5 text-sm">
                    <span className="mono text-ink-soft">{t.origem}</span>
                    <ArrowRight className="h-4 w-4 text-ink-muted" />
                    <span className="mono font-semibold text-primary">{t.destino}</span>
                  </div>
                  {t.problema && <p className="mt-2 text-xs text-bad">{t.problema}</p>}

                  <button
                    onClick={() => {
                      if (t.status === 'a-fazer') assumirTarefa(t.id, 'Operador Demo')
                      setExec(t.id)
                    }}
                    disabled={t.status === 'feito'}
                    className="btn-primary w-full mt-3 py-2"
                  >
                    {t.status === 'feito' ? <><CheckCircle2 className="h-4 w-4" /> Concluído</> : 'Executar putaway'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {aba === 'recorrentes' && (
            <div className="grid lg:grid-cols-[1fr_0.8fr] gap-4">
              <div className="space-y-3">
                {regras.map((regra) => (
                  <div key={regra.id} className="rounded-2xl border border-line p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="mono text-sm font-semibold text-brand">{regra.id}</p>
                          <Badge tone={regra.ativo ? 'ok' : 'neutral'}>{regra.ativo ? 'ativa' : 'pausada'}</Badge>
                          <Badge tone="info">{regra.regra}</Badge>
                        </div>
                        <p className="text-sm text-ink-soft mt-2">{regra.descricao}</p>
                        <p className="text-xs text-ink-muted mt-1">{ownerName(regra.ownerId)} · {regra.sku}</p>
                      </div>
                      <button
                        className={cn('relative h-6 w-11 rounded-full transition-colors shrink-0', regra.ativo ? 'bg-primary' : 'bg-slate-300')}
                        onClick={() => setRegras((atual) => atual.map((item) => item.id === regra.id ? { ...item, ativo: !item.ativo } : item))}
                      >
                        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', regra.ativo ? 'left-[22px]' : 'left-0.5')} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-sub p-2.5 text-sm">
                      <span className="mono text-ink-soft">{regra.origem}</span>
                      <ArrowRight className="h-4 w-4 text-ink-muted" />
                      <span className="mono font-semibold text-primary">{regra.destino}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-line bg-accent-50/40 p-4">
                <div className="h-10 w-10 rounded-xl bg-white border border-accent/20 grid place-items-center text-accent">
                  <Repeat2 className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-brand mt-4">Como funciona a recorrência</p>
                <div className="mt-3 space-y-3 text-sm text-ink-soft">
                  <InfoLine>Ao bipar a chegada de um SKU recorrente, o WMS já cria a OS de putaway.</InfoLine>
                  <InfoLine>A regra pode fixar endereço, zona, temperatura, quarentena ou FEFO.</InfoLine>
                  <InfoLine>O operador no mobile recebe apenas origem, SKU, destino e quantidade.</InfoLine>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <InfoCard icon={<PackageOpen className="h-4 w-4" />} title="Pallet no staging" text="Pallet montado no recebimento, ainda sem endereço final confirmado." />
        <InfoCard icon={<ClipboardList className="h-4 w-4" />} title="OS de putaway" text="Tarefa operacional enviada ao app para bipar origem, SKU e destino." />
        <InfoCard icon={<Repeat2 className="h-4 w-4" />} title="Recorrência" text="Regra para SKU que sempre gera OS automática na chegada." />
      </div>

      <OrdemServicoPanel
        title="Gestão de OS de putaway"
        subtitle="O supervisor cria e atribui ordens; o operador confirma origem, SKU e destino no app."
        tipos={['putaway']}
      />

      {tarefa && (
        <PutawayExec
          tarefa={tarefa}
          onClose={() => setExec(null)}
          onConcluir={() => {
            concluirTarefa(tarefa.id)
            toast({ tipo: 'sucesso', titulo: 'Estoque disponível', texto: `${tarefa.sku} em ${tarefa.destino}` })
            setExec(null)
          }}
        />
      )}
    </div>
  )
}

function PalletsPisoView({
  palletsTodos,
  pallets,
  selecionado,
  busca,
  putawayBloqueados,
  onBuscaChange,
  onSelecionar,
}: {
  palletsTodos: PalletEnderecamento[]
  pallets: PalletEnderecamento[]
  selecionado: PalletEnderecamento | null
  busca: string
  putawayBloqueados: number
  onBuscaChange: (value: string) => void
  onSelecionar: (id: string) => void
}) {
  const totalSkus = palletsTodos.reduce((total, pallet) => total + pallet.skus, 0)
  const osPendentes = palletsTodos.reduce((total, pallet) => total + pallet.osPendentes, 0)
  const palletsComOs = palletsTodos.filter((pallet) => pallet.osCriadas > 0).length

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MiniStat label="Pallets no staging" value={palletsTodos.length} />
        <MiniStat label="Pallets com OS" value={palletsComOs} />
        <MiniStat label="SKUs dentro dos pallets" value={totalSkus} />
        <MiniStat label="OS faltantes" value={osPendentes + putawayBloqueados} tone={osPendentes + putawayBloqueados ? 'bad' : 'neutral'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="min-w-0 space-y-3">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <label htmlFor="busca-pallet-putaway" className="label">Buscar pallet</label>
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-2.5">
              <Search className="h-4 w-4 text-ink-muted" />
              <input
                id="busca-pallet-putaway"
                value={busca}
                onChange={(event) => onBuscaChange(event.target.value)}
                placeholder="Pallet, recebimento, SKU, cliente, destino..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <div className="max-h-[660px] space-y-2 overflow-y-auto pr-1">
            {pallets.map((pallet) => (
              <PalletListItem
                key={pallet.id}
                pallet={pallet}
                selected={selecionado?.id === pallet.id}
                onClick={() => onSelecionar(pallet.id)}
              />
            ))}
            {!pallets.length && (
              <div className="rounded-2xl border border-line bg-surface">
                <EmptyState
                  icon={<PackageOpen className="h-6 w-6" />}
                  title="Nenhum pallet encontrado"
                  text="Ajuste a busca para ver os pallets liberados para endereçamento."
                />
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {selecionado ? (
            <PalletDetail pallet={selecionado} />
          ) : (
            <div className="rounded-2xl border border-line bg-surface">
              <EmptyState
                icon={<Boxes className="h-6 w-6" />}
                title="Selecione um pallet"
                text="Os pallets aparecem quando o recebimento chega na etapa de classificação de destino e endereçamento."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PalletListItem({
  pallet,
  selected,
  onClick,
}: {
  pallet: PalletEnderecamento
  selected: boolean
  onClick: () => void
}) {
  const meta = statusPalletMeta[pallet.status]

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border bg-surface p-4 text-left transition-colors',
        selected ? 'border-primary shadow-sm' : 'border-line hover:border-primary/40',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mono truncate text-sm font-semibold text-brand">{pallet.id}</p>
            <Badge tone={meta.tone} dot>{meta.label}</Badge>
            {pallet.recorrente && <Badge tone="accent">recorrente</Badge>}
          </div>
          <p className="mt-1 truncate text-sm text-ink-soft">{pallet.rec.id} · {ownerName(pallet.rec.ownerId)}</p>
          <p className="mt-0.5 truncate text-xs text-ink-muted">{pallet.rec.documento} · {pallet.rec.doca} · {pallet.rec.eta}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-brand">{pallet.skus} SKU</p>
          <p className="text-xs text-ink-muted mono">{pallet.totalUnidades} un</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-sub p-2.5 text-xs">
        <span className="mono min-w-0 truncate text-ink-soft">{pallet.origem}</span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
        <span className="mono min-w-0 truncate font-semibold text-primary">{pallet.destinoResumo}</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <PalletMiniInfo label="OS" value={`${pallet.osCriadas}/${pallet.linhas.length}`} />
        <PalletMiniInfo label="Faltam" value={String(pallet.osPendentes)} />
        <PalletMiniInfo label="Ação" value={pallet.proximaAcao} />
      </div>
    </button>
  )
}

function PalletDetail({
  pallet,
}: {
  pallet: PalletEnderecamento
}) {
  const meta = statusPalletMeta[pallet.status]

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mono text-base font-semibold text-brand">{pallet.id}</h2>
              <Badge tone={meta.tone} dot>{meta.label}</Badge>
              <Badge tone="info">{pallet.linhas.length} linha(s)</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              {pallet.rec.id} · {pallet.rec.fornecedor} · {ownerName(pallet.rec.ownerId)}
            </p>
          </div>
          <Badge tone={pallet.osPendentes === 0 ? 'ok' : 'warn'}>
            {pallet.osPendentes === 0 ? 'OS completas' : `${pallet.osPendentes} OS pendente(s)`}
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <DetailPill label="Recebimento" value={pallet.rec.id} mono />
          <DetailPill label="Documento" value={pallet.rec.documento} />
          <DetailPill label="Janela" value={pallet.rec.janela ? `${pallet.rec.data ?? '—'} · ${pallet.rec.janela}` : pallet.rec.eta} />
          <DetailPill label="Cliente" value={ownerName(pallet.rec.ownerId)} />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <RouteBox label="Origem atual" value={pallet.origem} helper={`${pallet.rec.doca} · ${pallet.rec.status}`} />
          <div className="hidden place-items-center text-ink-muted lg:grid">
            <ArrowRight className="h-5 w-5" />
          </div>
          <RouteBox
            label="Destino sugerido"
            value={pallet.destinoResumo}
            helper={pallet.destinos.length === 1 ? 'Destino único do pallet' : pallet.destinos.join(' · ')}
            emphasis
          />
        </div>

        {pallet.destinos.length > 1 && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn/20 bg-warn-50 px-3 py-2.5 text-sm text-warn">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Este pallet tem SKUs com destinos diferentes. Revise a tabela antes de liberar a movimentação física.</span>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex flex-col gap-2 border-b border-line bg-surface-sub px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand">Conteúdo do pallet</p>
            <p className="text-xs text-ink-muted">{pallet.totalUnidades.toLocaleString('pt-BR')} unidades · {pallet.skus} SKU(s)</p>
          </div>
          <Badge tone={pallet.osPendentes ? 'warn' : 'ok'}>
            {pallet.osPendentes ? `${pallet.osPendentes} OS faltante(s)` : 'OS completas'}
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr>
                <th className="th">SKU</th>
                <th className="th">Lote / validade</th>
                <th className="th">Origem</th>
                <th className="th">Destino sugerido</th>
                <th className="th text-right">Qtde</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {pallet.linhas.map((row) => (
                <tr key={`${row.rec.id}-${row.item.skuCodigo}`} className="row-hover">
                  <td className="td">
                    <p className="mono text-xs font-semibold text-primary">{row.item.skuCodigo}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{row.item.descricao}</p>
                  </td>
                  <td className="td">
                    <p className="mono text-xs text-ink-soft">{row.item.lote ?? '—'}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{row.item.validade ?? 'sem validade'}</p>
                  </td>
                  <td className="td mono text-xs">{row.origem}</td>
                  <td className="td mono text-xs">{row.destino}</td>
                  <td className="td text-right mono">{row.item.contado ?? row.item.esperado}</td>
                  <td className="td">
                    <LinhaPutawayStatus row={row} />
                  </td>
                  <td className="td text-right">
                    <LinhaPutawayStatus row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function LinhaPutawayStatus({ row }: { row: MercadoriaPiso }) {
  if (row.osExistente) {
    const tone = row.osExistente.status === 'problema' ? 'bad' : row.osExistente.status === 'feito' ? 'ok' : 'primary'
    const label = row.osExistente.status === 'a-fazer' ? 'a fazer' : row.osExistente.status
    return <Badge tone={tone}>OS {row.osExistente.id} · {label}</Badge>
  }
  if (row.recorrente) return <Badge tone="accent">recorrente</Badge>
  return <Badge tone="neutral">sem OS</Badge>
}

function PalletMiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-surface-sub px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-brand">{value}</p>
    </div>
  )
}

function DetailPill({
  label,
  value,
  mono,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="rounded-xl border border-line bg-surface-sub px-3 py-2.5">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={cn('mt-1 truncate text-sm font-semibold text-brand', mono && 'mono')}>{value}</p>
    </div>
  )
}

function RouteBox({
  label,
  value,
  helper,
  emphasis,
}: {
  label: string
  value: string
  helper: string
  emphasis?: boolean
}) {
  return (
    <div className={cn('rounded-xl border px-4 py-3', emphasis ? 'border-primary/20 bg-primary-50/60' : 'border-line bg-surface-sub')}>
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className={cn('mt-1 mono text-lg font-semibold', emphasis ? 'text-primary' : 'text-brand')}>{value}</p>
      <p className="mt-1 truncate text-xs text-ink-muted">{helper}</p>
    </div>
  )
}

function MiniStat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: 'neutral' | 'bad' }) {
  return (
    <div className={cn('rounded-xl border p-3', tone === 'bad' ? 'bg-bad-50 border-bad/20' : 'bg-surface-sub border-line')}>
      <p className="text-2xl font-semibold text-brand mono">{value}</p>
      <p className="text-xs text-ink-muted mt-0.5">{label}</p>
    </div>
  )
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="card p-4">
      <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary grid place-items-center">{icon}</div>
      <p className="text-sm font-semibold text-brand mt-3">{title}</p>
      <p className="text-xs text-ink-muted mt-1">{text}</p>
    </div>
  )
}

function InfoLine({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <CheckCircle2 className="h-4 w-4 text-ok mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function PutawayExec({
  tarefa,
  onClose,
  onConcluir,
}: {
  tarefa: Tarefa
  onClose: () => void
  onConcluir: () => void
}) {
  const [validado, setValidado] = useState(false)
  const [destino, setDestino] = useState(tarefa.destino)
  const [alternativo, setAlternativo] = useState(false)

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Executar putaway"
      subtitle={tarefa.id}
      footer={
        <>
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={onConcluir} disabled={!validado} className="btn-primary">
            Confirmar guarda
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-line p-3">
          <p className="text-xs text-ink-muted mb-1">Instrução ao operador</p>
          <p className="text-sm">
            Guardar <span className="font-medium text-brand">{tarefa.descricao}</span>{' '}
            (<span className="mono">{tarefa.quantidade} un</span>) no endereço{' '}
            <span className="mono font-semibold text-primary">{destino}</span>
          </p>
        </div>

        {!alternativo && (
          <button
            onClick={() => {
              const novo = ADMIN_BUSINESS_PUTAWAY.alternativa
              setDestino(novo)
              setAlternativo(true)
              setValidado(false)
            }}
            className="flex items-center gap-2 text-xs text-accent hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Endereço ocupado/inacessível? Sugerir alternativa
          </button>
        )}
        {alternativo && (
          <div className="rounded-xl bg-accent-50 border border-accent/20 px-3 py-2 text-xs text-accent flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" /> Alternativa sugerida pelo sistema: <span className="mono">{destino}</span>
          </div>
        )}

        {!validado ? (
          <ScanInput
            expected={destino}
            label="Bipe o endereço de destino"
            onValid={() => setValidado(true)}
          />
        ) : (
          <div className="flex items-center gap-2 text-sm text-ok rounded-xl bg-ok-50 px-3 py-2.5 animate-fade-in">
            <CheckCircle2 className="h-4 w-4" /> Endereço <span className="mono">{destino}</span> validado
          </div>
        )}
      </div>
    </Modal>
  )
}
