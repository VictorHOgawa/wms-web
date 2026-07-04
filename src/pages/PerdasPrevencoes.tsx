import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Landmark,
  Layers3,
  ListChecks,
  PackageX,
  Route as RouteIcon,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Timer,
  Upload,
} from 'lucide-react'
import { Badge, PageHeader, Progress, Tab, Tabs, type Tone } from '../components/ui'
import { cn } from '../lib/utils'
import { avaliarTrackingEncomenda, trackingEncomendaDemo } from '../lib/trackingEncomenda'
import {
  aprovarCasoPp,
  decidirCasoPp,
  enviarCasoPpParaFinanceiro,
  importarCobrancaPpCsv,
  montarDossiePp,
  type PpCobranca,
  type PpDossie,
  type PpFinanceiroDebito,
  type PpCasoIndenizacao,
} from '../lib/perdasPrevencoesWorkflow'
import { useStore } from '../store/useStore'

type AbaPp =
  | 'cockpit'
  | 'importacoes'
  | 'casos'
  | 'divergencias'
  | 'financeiro'
  | 'aprovacoes'
  | 'relatorios'
  | 'configuracoes'

type DecisaoCaso = 'procedente' | 'improcedente' | 'parcial' | 'aguardar evidencia' | 'abono'

interface CasoMesa {
  id: string
  documento: string
  cliente: string
  gatilho: string
  status: string
  statusTone: Tone
  etapa: string
  prioridade: string
  sla: string
  pedidos: number
  valorCobrado: number
  valorAcatado: number
  valorContestavel: number
  semEvidencia: number
  base: string
  rota: string
  responsavelProvavel: string
  diagnostico: string
  decisaoAtual: DecisaoCaso
  documentoFinanceiro: string
  desconto: string
  evidencia: number
  pendencias: string[]
  timeline: string[]
}

interface PpFluxoFuncional {
  cobranca: PpCobranca
  caso: PpCasoIndenizacao
  dossie: PpDossie
  financeiro: PpFinanceiroDebito | null
}

type ImportarCsvPpPayload = Parameters<typeof importarCobrancaPpCsv>[0]

const abaRoutes: Record<AbaPp, string> = {
  cockpit: '/perdas-prevencoes/cockpit',
  importacoes: '/perdas-prevencoes/importacoes',
  casos: '/perdas-prevencoes/casos',
  divergencias: '/perdas-prevencoes/divergencias',
  financeiro: '/perdas-prevencoes/financeiro',
  aprovacoes: '/perdas-prevencoes/aprovacoes',
  relatorios: '/perdas-prevencoes/relatorios',
  configuracoes: '/perdas-prevencoes/configuracoes',
}

const csvDemoPp = [
  'cte,nf,pedido,valorReclamado,motivoCliente',
  'CTE-789,NF-456,PED-123,980,Extravio informado pelo cliente',
  'CTE-790,NF-457,PED-124,440,Falta apontada pelo cliente',
  'CTE-791,NF-458,PED-125,1260,Cobranca contestavel por entrega',
  'CTE-792,NF-459,PED-126,900,Valor reclamado acima da NF',
  'CTE-999,NF-999,PED-999,120,Pedido nao localizado na base operacional',
].join('\n')

const casosMesa: CasoMesa[] = [
  {
    id: 'CASO-1236',
    documento: 'Carta 1236',
    cliente: 'Petlog',
    gatilho: 'Planilha do cliente',
    status: 'Aguardando evidencia',
    statusTone: 'bad',
    etapa: 'Dossie vivo',
    prioridade: 'P0',
    sla: '30/06 16:00',
    pedidos: 212,
    valorCobrado: 184320,
    valorAcatado: 0,
    valorContestavel: 144670,
    semEvidencia: 31,
    base: 'Base Guarulhos',
    rota: 'SP-Interior',
    responsavelProvavel: 'Trecho SP-Interior',
    diagnostico: 'Extravio cobrado com carga localizada em armazem errado',
    decisaoAtual: 'aguardar evidencia',
    documentoFinanceiro: 'Carta de debito sem aprovacao',
    desconto: 'Debito ainda nao preparado',
    evidencia: 62,
    pendencias: ['Checklist de saida', 'Foto de chegada', 'Retorno da base'],
    timeline: ['Cliente enviou carta', 'Sistema localizou CTEs', 'Dossie montado', 'Base acionada'],
  },
  {
    id: 'CASO-1237',
    documento: 'ND 8742',
    cliente: 'Farma Norte',
    gatilho: 'ND com avaria',
    status: 'Aguardando aprovacao',
    statusTone: 'warn',
    etapa: 'Aprovacao',
    prioridade: 'P1',
    sla: '01/07 11:00',
    pedidos: 48,
    valorCobrado: 42780,
    valorAcatado: 38900,
    valorContestavel: 3880,
    semEvidencia: 2,
    base: 'CD Recife',
    rota: 'PE-Capital',
    responsavelProvavel: 'CD Recife',
    diagnostico: 'Avaria com foto e perda de valor parcial',
    decisaoAtual: 'parcial',
    documentoFinanceiro: 'ND 8742 pendente de aprovacao',
    desconto: 'Desconto CD Recife em preparo',
    evidencia: 88,
    pendencias: ['Aprovacao de alcada', 'Confirmar salvado'],
    timeline: ['ND recebida', 'Fotos anexadas', 'Valor parcial definido', 'Aprovacao solicitada'],
  },
  {
    id: 'CASO-1238',
    documento: 'Boleto 5510',
    cliente: 'Eletro Hub',
    gatilho: 'Cobranca de extravio',
    status: 'Contestavel',
    statusTone: 'info',
    etapa: 'Resposta ao cliente',
    prioridade: 'P2',
    sla: '02/07 09:30',
    pedidos: 91,
    valorCobrado: 96340,
    valorAcatado: 0,
    valorContestavel: 96340,
    semEvidencia: 4,
    base: 'Base Campinas',
    rota: 'SP-Sul',
    responsavelProvavel: 'Cliente/atendimento P&P',
    diagnostico: 'Carga entregue com comprovante e assinatura',
    decisaoAtual: 'improcedente',
    documentoFinanceiro: 'Nao enviar ao financeiro',
    desconto: 'Nao aplicavel',
    evidencia: 74,
    pendencias: ['Enviar contestacao', 'Aguardar retorno do cliente'],
    timeline: ['Boleto recebido', 'Comprovante localizado', 'Contestacao preparada'],
  },
]

const metricasCockpit = [
  { label: 'Casos novos', value: '8', tone: 'info' as Tone, icon: <FileText className="h-4 w-4" /> },
  { label: 'Cobrancas importadas', value: '3', tone: 'primary' as Tone, icon: <Upload className="h-4 w-4" /> },
  { label: 'Itens sem evidencia', value: '31', tone: 'bad' as Tone, icon: <PackageX className="h-4 w-4" /> },
  { label: 'Aguardando analise', value: '14', tone: 'warn' as Tone, icon: <Timer className="h-4 w-4" /> },
  { label: 'Aguardando aprovacao', value: '6', tone: 'warn' as Tone, icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'Enviados ao financeiro', value: '9', tone: 'primary' as Tone, icon: <Landmark className="h-4 w-4" /> },
  { label: 'Pagamentos pendentes', value: '5', tone: 'bad' as Tone, icon: <AlertTriangle className="h-4 w-4" /> },
  { label: 'Descontos pendentes', value: '7', tone: 'warn' as Tone, icon: <Scale className="h-4 w-4" /> },
]

const pipelineSteps = [
  { label: 'Entrada', detail: 'cliente ou operacao', tone: 'info' as Tone },
  { label: 'Identificacao', detail: 'CTE/NF/pedido', tone: 'primary' as Tone },
  { label: 'Dossie vivo', detail: 'WMS, TMS, fiscal', tone: 'accent' as Tone },
  { label: 'Analise humana', detail: 'decisao e valor', tone: 'warn' as Tone },
  { label: 'Aprovacao', detail: 'alcada e excecao', tone: 'warn' as Tone },
  { label: 'Financeiro', detail: 'processo decidido', tone: 'ok' as Tone },
]

const fluxoTecnicoPp =
  'CTE -> NFs -> pedidos/itens -> SKUs -> volumes/etiquetas -> pallets -> movimentacoes -> checklists -> evidencias -> financeiro -> decisao sugerida'

const divergenciasOperacionais = [
  ['PED-893301', 'Falta na chegada', 'Base Guarulhos', 'Ultima bipagem no staging', 'CASO-1236'],
  ['PED-893418', 'Avaria', 'CD Recife', 'Foto no checklist de recebimento', 'CASO-1237'],
  ['PED-893502', 'Carga localizada em armazem errado', 'Base Campinas', 'Redirecionamento pendente', 'Pre-caso'],
  ['PED-893610', 'Falta de evidencia', 'Parceiro RJ Norte', 'Sem leitura recente', 'Pre-caso'],
]

const rankingBases = [
  { base: 'Base Guarulhos', casos: 18, valor: 139870, tone: 'bad' as Tone },
  { base: 'CD Recife', casos: 11, valor: 38900, tone: 'warn' as Tone },
  { base: 'Base Campinas', casos: 9, valor: 24200, tone: 'warn' as Tone },
  { base: 'Parceiro RJ Norte', casos: 6, valor: 18750, tone: 'info' as Tone },
]

const relatorios = [
  ['Valor cobrado', 'R$ 323.440'],
  ['Valor acatado', 'R$ 178.770'],
  ['Valor contestado', 'R$ 144.670'],
  ['Valor abonado', 'R$ 12.400'],
  ['Valor descontado', 'R$ 152.270'],
  ['SLA medio de analise', '18h 40min'],
]

const configuracoes = [
  'Motivos de responsabilizacao',
  'Tipos de ocorrencia',
  'Problema de coleta, transferencia, entrega, devolucao, HUB e CD',
  'Bases, CDs, hubs e parceiros',
  'Clientes e pagadores',
  'Regras de SLA',
  'Regras de alcada',
  'Tipos de documento',
  'Layouts de importacao',
]

function criarFluxoPpDemo(): PpFluxoFuncional {
  return criarFluxoPp({
    arquivoNome: 'carta-1236.csv',
    clientePagador: 'Petlog',
    numeroDocumento: 'Carta 1236',
    tipoDocumento: 'carta-debito',
    vencimento: '2026-07-05',
    conteudo: csvDemoPp,
  })
}

function criarFluxoPp(input: ImportarCsvPpPayload): PpFluxoFuncional {
  const importacao = importarCobrancaPpCsv(input)

  return {
    ...importacao,
    dossie: montarDossiePp({
      caso: importacao.caso,
      cobranca: importacao.cobranca,
      tracking: trackingEncomendaDemo,
      agora: '2026-06-20T12:00:00-03:00',
    }),
    financeiro: null,
  }
}

export default function PerdasPrevencoes({ abaInicial = 'cockpit' }: { abaInicial?: AbaPp }) {
  const navigate = useNavigate()
  const toast = useStore((state) => state.toast)
  const [casoId, setCasoId] = useState(casosMesa[0].id)
  const [ppFluxo, setPpFluxo] = useState<PpFluxoFuncional>(() => criarFluxoPpDemo())
  const casoAtual = useMemo(() => casosMesa.find((caso) => caso.id === casoId) ?? casosMesa[0], [casoId])

  const importarCsv = (input: ImportarCsvPpPayload) => {
    const fluxo = criarFluxoPp(input)
    setPpFluxo(fluxo)
    toast({
      tipo: fluxo.cobranca.status === 'importada' ? 'sucesso' : 'aviso',
      titulo: 'Cobranca importada',
      texto: `${fluxo.cobranca.itens.length} itens lidos em ${fluxo.cobranca.arquivoNome}`,
    })
  }

  const registrarCteManual = ({
    cte,
    nf,
    pedido,
    valorReclamado,
    motivoCliente,
  }: {
    cte: string
    nf: string
    pedido: string
    valorReclamado: string
    motivoCliente: string
  }) => {
    const fluxo = criarFluxoPp({
      arquivoNome: 'entrada-manual-cte-nf-pedido',
      clientePagador: 'Petlog',
      numeroDocumento: `Manual ${cte || nf || pedido}`,
      tipoDocumento: 'carta-debito',
      vencimento: '2026-07-05',
      conteudo: [
        'cte,nf,pedido,valorReclamado,motivoCliente',
        `${cte},${nf},${pedido},${valorReclamado},${motivoCliente}`,
      ].join('\n'),
    })
    setPpFluxo(fluxo)
    navigate(abaRoutes.casos)
    toast({
      tipo: 'sucesso',
      titulo: 'Dossie montado',
      texto: `${fluxo.caso.id} criado a partir de CTE/NF/pedido`,
    })
  }

  const registrarBoletoOuNd = ({
    numeroDocumento,
    tipoDocumento,
    vencimento,
  }: {
    numeroDocumento: string
    tipoDocumento: 'carta-debito' | 'boleto' | 'nd'
    vencimento: string
  }) => {
    const linhas = ppFluxo.cobranca.itens.map((item) =>
      [item.cte, item.nf, item.pedido, item.valorReclamado, item.motivoCliente ?? 'Documento financeiro vinculado'].join(','),
    )
    const fluxo = criarFluxoPp({
      arquivoNome: ppFluxo.cobranca.arquivoNome,
      clientePagador: ppFluxo.cobranca.clientePagador,
      numeroDocumento,
      tipoDocumento,
      vencimento,
      conteudo: ['cte,nf,pedido,valorReclamado,motivoCliente', ...linhas].join('\n'),
    })
    setPpFluxo(fluxo)
    toast({
      tipo: 'sucesso',
      titulo: 'Documento atualizado',
      texto: `${fluxo.cobranca.numeroDocumento} vinculado ao ${fluxo.caso.id}`,
    })
  }

  const decidirParcial = () => {
    setPpFluxo((fluxo) => {
      const valorManual = fluxo.dossie.resumo.valorSugerido || Math.round(fluxo.caso.valorCobrado * 0.45)
      const casoDecidido = decidirCasoPp({
        caso: fluxo.caso,
        decisao: 'parcial',
        valorAprovado: valorManual,
        responsavelFinanceiro: fluxo.dossie.itens[0]?.responsavelProvavel ?? 'Operacao',
        justificativa: 'Decisao parcial registrada apos revisao das evidencias e pendencias do dossie.',
      })
      toast({ tipo: 'info', titulo: 'Decisao registrada', texto: `${casoDecidido.id} aguardando aprovacao` })
      return { ...fluxo, caso: casoDecidido }
    })
  }

  const aprovarCaso = () => {
    setPpFluxo((fluxo) => {
      const casoAprovado = aprovarCasoPp({
        caso: fluxo.caso,
        aprovador: 'Aprovador de alcada',
        justificativa: 'Aprovacao registrada com justificativa e impacto financeiro.',
      })
      toast({ tipo: 'sucesso', titulo: 'Caso aprovado', texto: casoAprovado.id })
      return { ...fluxo, caso: casoAprovado }
    })
  }

  const enviarFinanceiro = () => {
    setPpFluxo((fluxo) => {
      const financeiroGerado = enviarCasoPpParaFinanceiro(fluxo.caso)
      toast({
        tipo: 'sucesso',
        titulo: 'Enviado ao financeiro',
        texto: `${formatMoney(financeiroGerado.valorAprovado)} contra ${financeiroGerado.debitoContra}`,
      })
      return { ...fluxo, caso: { ...fluxo.caso, status: 'enviado_financeiro' }, financeiro: financeiroGerado }
    })
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Perdas e Prevencoes"
        subtitle="Esteira de decisao para cobrancas, divergencias, dossies, aprovacoes e consequencia financeira."
      >
        <Badge tone="bad" dot>SLA vencido: 4</Badge>
      </PageHeader>

      <Pipeline />

      <div className="border-b border-line">
        <Tabs value={abaInicial} onChange={(value) => navigate(abaRoutes[value as AbaPp])}>
          <Tab id="cockpit">Cockpit</Tab>
          <Tab id="importacoes">Cobrancas / Importacoes</Tab>
          <Tab id="casos">Casos de Indenizacao</Tab>
          <Tab id="divergencias">Divergencias Operacionais</Tab>
          <Tab id="financeiro">Financeiro / Debitos</Tab>
          <Tab id="aprovacoes">Aprovacoes</Tab>
          <Tab id="relatorios">Relatorios</Tab>
          <Tab id="configuracoes">Configuracoes</Tab>
        </Tabs>
      </div>

      {abaInicial === 'cockpit' && <Cockpit casoAtual={casoAtual} onSelectCaso={setCasoId} />}
      {abaInicial === 'importacoes' && (
        <Importacoes
          cobranca={ppFluxo.cobranca}
          onImportar={importarCsv}
          onCteManual={registrarCteManual}
          onBoletoOuNd={registrarBoletoOuNd}
        />
      )}
      {abaInicial === 'casos' && (
        <Casos casoAtual={casoAtual} ppFluxo={ppFluxo} onSelectCaso={setCasoId} onDecidir={decidirParcial} />
      )}
      {abaInicial === 'divergencias' && <Divergencias />}
      {abaInicial === 'financeiro' && (
        <Financeiro caso={ppFluxo.caso} financeiroGerado={ppFluxo.financeiro} onEnviar={enviarFinanceiro} />
      )}
      {abaInicial === 'aprovacoes' && <Aprovacoes caso={ppFluxo.caso} onAprovar={aprovarCaso} />}
      {abaInicial === 'relatorios' && <RelatoriosPp />}
      {abaInicial === 'configuracoes' && <Configuracoes />}
    </div>
  )
}

function Pipeline() {
  return (
    <section className="rounded-lg border border-line bg-surface px-4 py-3">
      <div className="space-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="primary">Esteira de decisao</Badge>
            <span className="text-xs font-semibold uppercase text-ink-muted">Caso como agregador principal</span>
          </div>
          <p className="mt-2 break-words text-xs font-semibold text-ink-muted">{fluxoTecnicoPp}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {pipelineSteps.map((step, index) => (
            <div key={step.label} className="min-h-[76px] min-w-0 rounded-lg border border-line bg-surface-sub px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={step.tone}>{index + 1}</Badge>
                {index < pipelineSteps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-ink-muted" />}
              </div>
              <p className="mt-2 text-xs font-semibold text-brand">{step.label}</p>
              <p className="text-[11px] leading-snug text-ink-muted">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Cockpit({ casoAtual, onSelectCaso }: { casoAtual: CasoMesa; onSelectCaso: (id: string) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricasCockpit.map((metrica) => (
          <MetricCard key={metrica.label} {...metrica} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)]">
        <section className="overflow-hidden rounded-lg border border-line bg-surface">
          <SectionTitle icon={<ListChecks className="h-4 w-4" />} title="Fila do que resolver agora" />
          <div className="divide-y divide-line">
            {casosMesa.map((caso) => (
              <button
                key={caso.id}
                onClick={() => onSelectCaso(caso.id)}
                className={cn(
                  'grid w-full gap-3 px-4 py-3 text-left transition-colors lg:grid-cols-[120px_minmax(0,1fr)_160px_140px]',
                  casoAtual.id === caso.id ? 'bg-accent-50/60' : 'hover:bg-surface-sub',
                )}
              >
                <div>
                  <p className="mono text-sm font-semibold text-brand">{caso.id}</p>
                  <Badge tone={caso.statusTone}>{caso.prioridade}</Badge>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-brand">{caso.documento}</span>
                    <Badge tone={caso.statusTone} dot>{caso.status}</Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-ink-muted">
                    {caso.cliente} - {caso.gatilho} - {caso.diagnostico}
                  </p>
                </div>
                <div>
                  <p className="mono text-sm font-semibold text-brand">{formatMoney(caso.valorCobrado)}</p>
                  <p className="text-xs text-ink-muted">{caso.semEvidencia} itens sem evidencia</p>
                </div>
                <div className="lg:text-right">
                  <p className="text-sm font-semibold text-brand">{caso.etapa}</p>
                  <p className="text-xs text-ink-muted">SLA {caso.sla}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-brand">Mapa de impacto</h3>
              <p className="text-xs text-ink-muted">Ranking por valor e reincidencia</p>
            </div>
            <RouteIcon className="h-5 w-5 text-accent" />
          </div>
          <div className="mt-4 space-y-4">
            {rankingBases.map((item) => (
              <div key={item.base}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-brand">{item.base}</span>
                  <span className="mono text-xs text-ink-muted">{item.casos} casos</span>
                </div>
                <Progress value={(item.casos / rankingBases[0].casos) * 100} tone={item.tone} />
                <p className="mt-1 text-xs text-ink-muted">{formatMoney(item.valor)} acatado ou em risco</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Importacoes({
  cobranca,
  onImportar,
  onCteManual,
  onBoletoOuNd,
}: {
  cobranca: PpCobranca
  onImportar: (input: ImportarCsvPpPayload) => void
  onCteManual: (input: {
    cte: string
    nf: string
    pedido: string
    valorReclamado: string
    motivoCliente: string
  }) => void
  onBoletoOuNd: (input: {
    numeroDocumento: string
    tipoDocumento: 'carta-debito' | 'boleto' | 'nd'
    vencimento: string
  }) => void
}) {
  const [arquivoNome, setArquivoNome] = useState('carta-cliente.csv')
  const [clientePagador, setClientePagador] = useState(cobranca.clientePagador)
  const [numeroDocumento, setNumeroDocumento] = useState(cobranca.numeroDocumento)
  const [tipoDocumento, setTipoDocumento] = useState<'carta-debito' | 'boleto' | 'nd'>(cobranca.tipoDocumento)
  const [vencimento, setVencimento] = useState(cobranca.vencimento)
  const [csvTexto, setCsvTexto] = useState(csvDemoPp)
  const [manualCte, setManualCte] = useState('CTE-789')
  const [manualNf, setManualNf] = useState('NF-456')
  const [manualPedido, setManualPedido] = useState('PED-123')
  const [manualValor, setManualValor] = useState('980')
  const [manualMotivo, setManualMotivo] = useState('Extravio informado pelo cliente')
  const [financeiroNumero, setFinanceiroNumero] = useState(cobranca.numeroDocumento)
  const [financeiroTipo, setFinanceiroTipo] = useState<'carta-debito' | 'boleto' | 'nd'>(cobranca.tipoDocumento)
  const [financeiroVencimento, setFinanceiroVencimento] = useState(cobranca.vencimento)

  const importarPlanilha = (event: FormEvent) => {
    event.preventDefault()
    onImportar({ arquivoNome, clientePagador, numeroDocumento, tipoDocumento, vencimento, conteudo: csvTexto })
  }

  const escolherArquivoCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setArquivoNome(file.name)
    setCsvTexto(await file.text())
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <form onSubmit={importarPlanilha} className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-brand">Planilha minima do cliente</h2>
            <p className="mt-1 text-sm text-ink-muted">CTE/NF/pedido + valor reclamado</p>
          </div>
          <label className="btn-outline cursor-pointer">
            <FileSpreadsheet className="h-4 w-4" /> Escolher arquivo CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={escolherArquivoCsv} />
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <TextField label="Arquivo" value={arquivoNome} onChange={setArquivoNome} />
          <TextField label="Cliente/pagador" value={clientePagador} onChange={setClientePagador} />
          <TextField label="Documento" value={numeroDocumento} onChange={setNumeroDocumento} />
          <TextField label="Vencimento" value={vencimento} onChange={setVencimento} />
          <TextField label="Tipo" value={tipoDocumento} onChange={(value) => setTipoDocumento(value as 'carta-debito' | 'boleto' | 'nd')} />
        </div>

        <label className="mt-4 block">
          <span className="label">Colar planilha CSV</span>
          <textarea
            className="input min-h-[180px] resize-y font-mono text-xs"
            value={csvTexto}
            onChange={(event) => setCsvTexto(event.target.value)}
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge tone={cobranca.status === 'importada' ? 'ok' : 'warn'}>{cobranca.status}</Badge>
            <Badge tone="primary">{cobranca.itens.length} itens</Badge>
            <Badge tone="accent">Enriquecimento automatico WMS/fiscal</Badge>
          </div>
          <button className="btn-primary" type="submit">
            <Upload className="h-4 w-4" /> Importar planilha
          </button>
        </div>
      </form>

      <div className="space-y-5">
        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-brand">Pesquisar CTE/NF/pedido</h2>
          <div className="mt-3 grid gap-3">
            <TextField label="CTE" value={manualCte} onChange={setManualCte} />
            <TextField label="NF" value={manualNf} onChange={setManualNf} />
            <TextField label="Pedido" value={manualPedido} onChange={setManualPedido} />
            <TextField label="Valor reclamado" value={manualValor} onChange={setManualValor} />
            <TextField label="Motivo do cliente" value={manualMotivo} onChange={setManualMotivo} />
          </div>
          <button
            className="btn-primary mt-4 w-full"
            type="button"
            onClick={() =>
              onCteManual({
                cte: manualCte,
                nf: manualNf,
                pedido: manualPedido,
                valorReclamado: manualValor,
                motivoCliente: manualMotivo,
              })
            }
          >
            <Search className="h-4 w-4" /> Montar dossie
          </button>
        </section>

        <section className="rounded-lg border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold text-brand">Vincular documento financeiro</h2>
          <div className="mt-3 grid gap-3">
            <TextField label="Numero" value={financeiroNumero} onChange={setFinanceiroNumero} />
            <TextField label="Tipo" value={financeiroTipo} onChange={(value) => setFinanceiroTipo(value as 'carta-debito' | 'boleto' | 'nd')} />
            <TextField label="Vencimento" value={financeiroVencimento} onChange={setFinanceiroVencimento} />
          </div>
          <button
            className="btn-outline mt-4 w-full"
            type="button"
            onClick={() =>
              onBoletoOuNd({
                numeroDocumento: financeiroNumero,
                tipoDocumento: financeiroTipo,
                vencimento: financeiroVencimento,
              })
            }
          >
            <Landmark className="h-4 w-4" /> Atualizar documento
          </button>
        </section>
      </div>

      <section className="xl:col-span-2">
        <SimpleTable
          title="Lista de CTEs/documentos do caso atual"
          headers={['CTE', 'NF', 'Pedido', 'Valor reclamado', 'Status de leitura']}
          rows={cobranca.itens.map((item) => [
            item.cte || '-',
            item.nf || '-',
            item.pedido || '-',
            formatMoney(item.valorReclamado),
            item.statusLeitura,
          ])}
        />
      </section>
    </div>
  )
}

function Casos({
  casoAtual,
  ppFluxo,
  onSelectCaso,
  onDecidir,
}: {
  casoAtual: CasoMesa
  ppFluxo: PpFluxoFuncional
  onSelectCaso: (id: string) => void
  onDecidir: () => void
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-3">
        {casosMesa.map((caso) => (
          <button
            key={caso.id}
            onClick={() => onSelectCaso(caso.id)}
            className={cn(
              'w-full rounded-lg border p-3 text-left transition-colors',
              casoAtual.id === caso.id ? 'border-accent bg-accent-50' : 'border-line bg-surface hover:bg-surface-sub',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="mono text-sm font-semibold text-brand">{caso.id}</span>
              <Badge tone={caso.statusTone}>{caso.status}</Badge>
            </div>
            <p className="mt-2 text-sm font-medium text-brand">{caso.cliente}</p>
            <p className="mt-1 text-xs text-ink-muted">{caso.documento} - {formatMoney(caso.valorCobrado)}</p>
          </button>
        ))}
      </aside>

      <section className="space-y-5">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">Caso de Indenizacao</Badge>
                <Badge tone={casoAtual.statusTone}>{casoAtual.etapa}</Badge>
              </div>
              <h2 className="mt-3 text-lg font-semibold text-brand">{casoAtual.id} - {casoAtual.cliente}</h2>
              <p className="mt-1 text-sm text-ink-muted">{casoAtual.diagnostico}</p>
            </div>
            <button className="btn-primary shrink-0" type="button" onClick={onDecidir}>
              <ClipboardCheck className="h-4 w-4" /> Decidir parcial
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <InfoTile label="Valor cobrado" value={formatMoney(casoAtual.valorCobrado)} />
            <InfoTile label="Valor acatado" value={formatMoney(casoAtual.valorAcatado)} />
            <InfoTile label="Valor contestavel" value={formatMoney(casoAtual.valorContestavel)} />
            <InfoTile label="Evidencia operacional" value={`${casoAtual.evidencia}%`} />
          </div>
        </div>

        <DossieVivo casoAtual={casoAtual} ppFluxo={ppFluxo} />
      </section>
    </div>
  )
}

function DossieVivo({ casoAtual, ppFluxo }: { casoAtual: CasoMesa; ppFluxo: PpFluxoFuncional }) {
  const trackingDia18 = avaliarTrackingEncomenda({
    unidade: trackingEncomendaDemo.unidades[0],
    plano: trackingEncomendaDemo.plano,
    eventos: trackingEncomendaDemo.eventos,
    agora: '2026-06-18T12:00:00-03:00',
  })
  const trackingDia20 = avaliarTrackingEncomenda({
    unidade: trackingEncomendaDemo.unidades[0],
    plano: trackingEncomendaDemo.plano,
    eventos: trackingEncomendaDemo.eventos,
    agora: '2026-06-20T12:00:00-03:00',
  })

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-brand">Dossie vivo</h2>
            <p className="mt-1 text-sm text-ink-muted">Cliente, Sistema e Analise humana separados para auditoria.</p>
          </div>
          <Badge tone="warn">Falta de evidencia: {ppFluxo.dossie.resumo.itensSemEvidencia}</Badge>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <SourceColumn
            title="Cliente"
            icon={<FileSpreadsheet className="h-4 w-4" />}
            rows={[
              ['Documento', ppFluxo.cobranca.numeroDocumento],
              ['Tipo', ppFluxo.cobranca.tipoDocumento],
              ['Valor cobrado', formatMoney(ppFluxo.cobranca.valorTotalCobrado)],
              ['Motivo', ppFluxo.cobranca.itens[0]?.motivoCliente ?? 'Nao informado'],
            ]}
          />
          <SourceColumn
            title="Sistema"
            icon={<Layers3 className="h-4 w-4" />}
            rows={[
              ['Fontes puxadas automaticamente', ppFluxo.dossie.itens[0]?.fontesAutomaticas.join(', ') || 'Pendente'],
              ['Local atual', ppFluxo.dossie.itens[0]?.tracking.localAtual?.nome ?? 'Sem leitura'],
              ['Checklist de chegada', 'Checklist WMS vinculado'],
              ['Checklist de saida', 'Saida/TMS vinculado'],
              ['Ultima bipagem', ppFluxo.dossie.itens[0]?.tracking.ultimoEvento?.timestamp ?? 'Sem leitura'],
            ]}
          />
          <SourceColumn
            title="Analise humana"
            icon={<ShieldCheck className="h-4 w-4" />}
            rows={[
              ['Sugestao', ppFluxo.dossie.itens[0]?.sugestaoDecisao ?? '-'],
              ['Decisao atual', casoAtual.decisaoAtual],
              ['Responsavel provavel', casoAtual.responsavelProvavel],
              ['Historico auditavel', casoAtual.timeline.join(' / ')],
            ]}
          />
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        {ppFluxo.dossie.itens.map((dossieItem) => {
          const item = dossieItem.item
          const tracking = dossieItem.tracking
          return (
            <article key={item.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mono truncate text-xs font-semibold text-ink-muted">{item.cte} / {item.nf}</p>
                  <h3 className="mt-1 text-sm font-semibold text-brand">{item.pedido}</h3>
                  <p className="mt-1 text-xs text-ink-muted">{item.sku || 'SKU pendente'} - {item.volume || 'volume pendente'}</p>
                </div>
                <Badge tone={dossieItem.evidenciaSuficiente ? 'ok' : 'warn'}>
                  {dossieItem.evidenciaSuficiente ? 'Evidencia suficiente' : 'Falta de evidencia'}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniInfo label="Valor NF" value={formatMoney(item.valorNf)} />
                <MiniInfo label="Valor reclamado" value={formatMoney(item.valorReclamado)} />
                <MiniInfo label="Status atual" value={tracking.status} />
                <MiniInfo label="Localizacao atual" value={tracking.localAtual?.nome ?? 'Sem leitura'} />
                <MiniInfo label="Posicao fisica" value={tracking.localAtual?.cidade ?? 'Nao localizada'} />
                <MiniInfo label="Base/CD/parceiro provavel responsavel" value={dossieItem.responsavelProvavel} />
                <MiniInfo label="Placa/motorista" value="Consultar TMS/mobile" />
                <MiniInfo label="Quem conferiu" value={tracking.ultimoEvento?.operador ?? '-'} />
                <MiniInfo label="Divergencias de falta/sobra" value={dossieItem.diagnosticoOperacional} wide />
                <MiniInfo label="Timeline completa" value={tracking.ultimoEvento ? 'Eventos operacionais carregados' : 'Timeline pendente'} wide />
              </div>

              <div className="mt-4 rounded-lg border border-accent/30 bg-accent-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="accent">Resposta ao cliente</Badge>
                  <Badge tone="warn">Nao indeniza automaticamente</Badge>
                </div>
                <p className="mt-2 text-sm text-brand">
                  {tracking.conclusao} Sugestao: {dossieItem.sugestaoDecisao}. Local errado ou carga localizada exige evidencia,
                  redirecionamento, contestacao ou aprovacao antes de qualquer pagamento.
                </p>
              </div>
            </article>
          )
        })}
      </section>

      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-brand">Tracking leve de encomenda</h2>
            <p className="mt-1 text-sm text-ink-muted">Plano esperado x leitura real para separar correcao operacional de indenizacao.</p>
          </div>
          <Badge tone="bad">local_incorreto_risco_sla</Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <TrackingSnapshot
            label="18/06 12:00"
            expected={trackingDia18.localEsperado?.nome ?? '-'}
            actual={trackingDia18.localAtual?.nome ?? '-'}
            status={trackingDia18.status}
            action={trackingDia18.proximaAcao}
          />
          <TrackingSnapshot
            label="20/06 12:00"
            expected={trackingDia20.localEsperado?.nome ?? '-'}
            actual={trackingDia20.localAtual?.nome ?? '-'}
            status={trackingDia20.status}
            action={trackingDia20.proximaAcao}
          />
        </div>
        <div className="mt-4 rounded-lg border border-warn/30 bg-warn-50 px-3 py-2 text-sm text-warn">
          Carga localizada em armazem errado: redirecionar ou tratar SLA. Indenizacao somente com decisao, justificativa e alcada.
        </div>
      </section>
    </div>
  )
}

function Divergencias() {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-brand">Pre-casos operacionais</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Falta, sobra, avaria, sem leitura e carga localizada em local errado entram aqui antes da cobranca formal.
            </p>
          </div>
          <Badge tone="warn">pendencias operacionais</Badge>
        </div>
      </section>
      <SimpleTable
        headers={['Pedido/Nota', 'Tipo', 'Base/CD/parceiro', 'Evidencia operacional', 'Caso']}
        rows={divergenciasOperacionais}
      />
    </div>
  )
}

function Financeiro({
  caso,
  financeiroGerado,
  onEnviar,
}: {
  caso: PpCasoIndenizacao
  financeiroGerado: PpFinanceiroDebito | null
  onEnviar: () => void
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-brand">Financeiro recebe processo decidido</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {financeiroGerado
                ? `${financeiroGerado.status} - ${formatMoney(financeiroGerado.valorAprovado)} contra ${financeiroGerado.debitoContra}`
                : `Caso ${caso.id} em status ${caso.status}.`}
            </p>
          </div>
          <button className="btn-primary" disabled={caso.status !== 'aprovado'} type="button" onClick={onEnviar}>
            <Landmark className="h-4 w-4" /> Enviar ao financeiro
          </button>
        </div>
      </section>
      <SimpleTable
        headers={['Caso', 'Documento financeiro', 'Valor aprovado', 'Status financeiro', 'Debito/desconto']}
        rows={casosMesa.map((item) => [
          item.id,
          item.documentoFinanceiro,
          formatMoney(item.valorAcatado),
          item.etapa === 'Financeiro' ? 'Enviado ao financeiro' : 'Nao enviado',
          item.desconto,
        ])}
      />
    </div>
  )
}

function Aprovacoes({ caso, onAprovar }: { caso: PpCasoIndenizacao; onAprovar: () => void }) {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-surface p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-brand">Decisao sensivel exige justificativa</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Abono, parcial, pagamento sem evidencia e nao cobranca do responsavel passam por alcada.
            </p>
          </div>
          <button className="btn-primary" disabled={caso.status !== 'aguardando_aprovacao'} type="button" onClick={onAprovar}>
            <ClipboardCheck className="h-4 w-4" /> Aprovar caso
          </button>
        </div>
      </section>
      <SimpleTable
        headers={['Caso', 'Motivo de aprovacao', 'Valor', 'Impacto financeiro', 'Status']}
        rows={[
          ['CASO-1237', 'Decisao parcial', formatMoney(38900), 'Contestacao parcial mantida', 'Aguardando aprovacao'],
          ['CASO-1241', 'Abono', formatMoney(12400), 'Nao cobrar base/parceiro', 'Aguardando gerencia'],
          ['CASO-1242', 'Sem evidencia', formatMoney(8700), 'Pagamento com excecao', 'Aguardando diretoria'],
        ]}
      />
    </div>
  )
}

function RelatoriosPp() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {relatorios.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-ink-muted">{label}</p>
          <p className="mono mt-2 text-2xl font-semibold text-brand">{value}</p>
        </div>
      ))}
    </div>
  )
}

function Configuracoes() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {configuracoes.map((item) => (
        <div key={item} className="flex min-h-[76px] items-center gap-3 rounded-lg border border-line bg-surface p-4">
          <Settings className="h-4 w-4 shrink-0 text-accent" />
          <span className="text-sm font-medium text-brand">{item}</span>
        </div>
      ))}
    </div>
  )
}

function MetricCard({ label, value, tone, icon }: { label: string; value: string; tone: Tone; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{label}</p>
        <Badge tone={tone}>{icon}</Badge>
      </div>
      <p className="mono mt-3 text-2xl font-semibold text-brand">{value}</p>
    </div>
  )
}

function SourceColumn({
  title,
  icon,
  rows,
}: {
  title: string
  icon: ReactNode
  rows: [string, string][]
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-sub p-4">
      <div className="flex items-center gap-2 text-brand">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <SourceRow key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  )
}

function SourceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2">
      <p className="text-[11px] font-medium text-ink-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-snug text-brand">{value}</p>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-sub px-3 py-2">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-brand">{value}</p>
    </div>
  )
}

function MiniInfo({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('rounded-lg bg-surface-sub px-2.5 py-2', wide && 'col-span-2')}>
      <p className="text-[10px] font-semibold uppercase text-ink-muted">{label}</p>
      <p className="mt-1 break-words text-xs font-medium text-brand">{value}</p>
    </div>
  )
}

function TrackingSnapshot({
  label,
  expected,
  actual,
  status,
  action,
}: {
  label: string
  expected: string
  actual: string
  status: string
  action: string
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-sub p-3">
      <p className="text-xs font-semibold uppercase text-ink-muted">{label}</p>
      <div className="mt-3 grid gap-2 text-sm">
        <InfoPair label="Esperado" value={expected} />
        <InfoPair label="Real" value={actual} />
        <InfoPair label="Status" value={status} />
        <InfoPair label="Proxima acao" value={action} />
      </div>
    </div>
  )
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="max-w-[58%] text-right font-medium text-brand">{value}</span>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-line px-4 py-3">
      <span className="text-accent">{icon}</span>
      <h3 className="text-sm font-semibold text-brand">{title}</h3>
    </div>
  )
}

function SimpleTable({
  title,
  headers,
  rows,
}: {
  title?: string
  headers: string[]
  rows: (string | number)[][]
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {title && (
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-brand">{title}</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr>{headers.map((header) => <th key={header} className="th">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="row-hover">
                {row.map((cell, cellIndex) => (
                  <td key={`${index}-${cellIndex}`} className={cn('td', cellIndex === 0 && 'mono font-semibold text-brand')}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}
