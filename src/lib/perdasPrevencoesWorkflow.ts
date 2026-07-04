import {
  avaliarTrackingEncomenda,
  type TrackingState,
  type TrackingUnit,
  type trackingEncomendaDemo,
} from './trackingEncomenda.ts'

export type PpTipoDocumento = 'carta-debito' | 'boleto' | 'nd'
export type PpStatusLeitura = 'encontrado' | 'nao_encontrado' | 'duplicado' | 'divergente'
export type PpStatusCobranca = 'importada' | 'importada_com_divergencia'
export type PpStatusCaso =
  | 'aguardando_analise'
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'enviado_financeiro'
export type PpDecisao = 'procedente' | 'improcedente' | 'parcial' | 'aguardar_evidencia' | 'abono'
export type PpStatusFinanceiro = 'pendente_lancamento' | 'lancado' | 'pago'

export interface PpItemReclamado {
  id: string
  cte: string
  nf: string
  pedido: string
  sku: string
  volume: string
  pallet: string
  valorNf: number
  valorReclamado: number
  motivoCliente?: string
  statusLeitura: PpStatusLeitura
}

export interface PpCobranca {
  id: string
  arquivoNome: string
  clientePagador: string
  numeroDocumento: string
  tipoDocumento: PpTipoDocumento
  vencimento: string
  valorTotalCobrado: number
  status: PpStatusCobranca
  itens: PpItemReclamado[]
}

export interface PpAprovacao {
  aprovador: string
  data: string
  justificativa: string
  valor: number
  impactoFinanceiro: string
}

export interface PpCasoIndenizacao {
  id: string
  cobrancaId: string
  titulo: string
  clientePagador: string
  status: PpStatusCaso
  valorCobrado: number
  valorAcatado: number
  decisao?: PpDecisao
  justificativa?: string
  responsavelFinanceiro?: string
  aprovacoes: PpAprovacao[]
}

export interface PpDossieItem {
  item: PpItemReclamado
  tracking: TrackingState
  evidenciaSuficiente: boolean
  sugestaoDecisao: PpDecisao
  responsavelProvavel: string
  fontesAutomaticas: string[]
  diagnosticoOperacional: string
}

export interface PpDossie {
  casoId: string
  itens: PpDossieItem[]
  resumo: {
    totalItens: number
    itensSemEvidencia: number
    valorReclamado: number
    valorSugerido: number
  }
}

export interface PpFinanceiroDebito {
  id: string
  casoId: string
  valorAprovado: number
  status: PpStatusFinanceiro
  debitoContra: string
  divergenciaCartaPedidos: number
}

export interface ImportarCobrancaCsvInput {
  arquivoNome: string
  clientePagador: string
  numeroDocumento: string
  tipoDocumento: PpTipoDocumento
  vencimento: string
  conteudo: string
}

const colunasChave = ['cte', 'nf', 'pedido', 'sku', 'volume', 'pallet']

interface PpRegistroOperacional {
  cte: string
  nf: string
  pedido: string
  sku: string
  volume: string
  pallet: string
  valorNf: number
  clientePagador: string
  fontes: string[]
}

const baseOperacionalPp: PpRegistroOperacional[] = [
  {
    cte: 'CTE-789',
    nf: 'NF-456',
    pedido: 'PED-123',
    sku: 'SKU-123',
    volume: 'VOL-123-1',
    pallet: 'PAL-001',
    valorNf: 980,
    clientePagador: 'Petlog',
    fontes: ['WMS/checklists', 'Fiscal/NF', 'TMS/CT-e', 'Financeiro'],
  },
  {
    cte: 'CTE-790',
    nf: 'NF-457',
    pedido: 'PED-124',
    sku: 'SKU-456',
    volume: 'VOL-124-1',
    pallet: 'PAL-002',
    valorNf: 440,
    clientePagador: 'Petlog',
    fontes: ['WMS/checklists', 'Fiscal/NF', 'TMS/CT-e'],
  },
  {
    cte: 'CTE-791',
    nf: 'NF-458',
    pedido: 'PED-125',
    sku: 'SKU-789',
    volume: 'VOL-125-1',
    pallet: 'PAL-003',
    valorNf: 1260,
    clientePagador: 'Petlog',
    fontes: ['WMS/checklists', 'Fiscal/NF', 'Comprovante entrega'],
  },
  {
    cte: 'CTE-792',
    nf: 'NF-459',
    pedido: 'PED-126',
    sku: 'SKU-321',
    volume: 'VOL-126-1',
    pallet: 'PAL-004',
    valorNf: 700,
    clientePagador: 'Petlog',
    fontes: ['Fiscal/NF', 'Financeiro'],
  },
  {
    cte: 'CTE-793',
    nf: 'NF-460',
    pedido: 'PED-127',
    sku: 'SKU-654',
    volume: 'VOL-127-1',
    pallet: 'PAL-005',
    valorNf: 1530,
    clientePagador: 'Petlog',
    fontes: ['WMS/checklists', 'TMS/CT-e', 'Financeiro'],
  },
]

export function importarCobrancaPpCsv(input: ImportarCobrancaCsvInput) {
  const rows = parseCsv(input.conteudo)
  const vistos = new Set<string>()
  const itens = rows.map((row, index): PpItemReclamado => {
    const registro = localizarRegistroOperacional(row)
    const itemEnriquecido = enriquecerItemReclamado(row, registro)
    const chave = [
      itemEnriquecido.cte,
      itemEnriquecido.nf,
      itemEnriquecido.pedido,
      itemEnriquecido.sku,
      itemEnriquecido.volume,
      itemEnriquecido.pallet,
    ].join('|')
    const statusLeitura = statusLeituraItem(itemEnriquecido, Boolean(registro), vistos.has(chave))
    vistos.add(chave)

    return {
      id: `item-${index + 1}`,
      ...itemEnriquecido,
      statusLeitura,
    }
  })
  const valorTotalCobrado = itens.reduce((total, item) => total + item.valorReclamado, 0)
  const temDivergencia = itens.some((item) => item.statusLeitura !== 'encontrado')
  const cobranca: PpCobranca = {
    id: `cob-${slug(input.numeroDocumento)}`,
    arquivoNome: input.arquivoNome,
    clientePagador: input.clientePagador,
    numeroDocumento: input.numeroDocumento,
    tipoDocumento: input.tipoDocumento,
    vencimento: input.vencimento,
    valorTotalCobrado,
    status: temDivergencia ? 'importada_com_divergencia' : 'importada',
    itens,
  }
  const caso: PpCasoIndenizacao = {
    id: `caso-${slug(input.numeroDocumento)}`,
    cobrancaId: cobranca.id,
    titulo: `${input.numeroDocumento} - ${input.clientePagador} - ${itens.length} itens`,
    clientePagador: input.clientePagador,
    status: 'aguardando_analise',
    valorCobrado: valorTotalCobrado,
    valorAcatado: 0,
    aprovacoes: [],
  }

  return { cobranca, caso }
}

export function montarDossiePp({
  caso,
  cobranca,
  tracking,
  agora,
}: {
  caso: PpCasoIndenizacao
  cobranca: PpCobranca
  tracking: typeof trackingEncomendaDemo
  agora: string
}): PpDossie {
  const itens = cobranca.itens.map((item): PpDossieItem => {
    const unidade = localizarUnidadeTracking(item, tracking.unidades)
    const trackingState = unidade
      ? avaliarTrackingEncomenda({
          unidade,
          plano: tracking.plano.filter((plan) => plan.unitId === unidade.id),
          eventos: tracking.eventos.filter((event) => event.unitId === unidade.id),
          agora,
        })
      : trackingSemEvidencia(item)
    const sugestaoDecisao = sugerirDecisao(item, trackingState)
    const fontesAutomaticas = fontesAutomaticasItem(item)

    return {
      item,
      tracking: trackingState,
      evidenciaSuficiente: item.statusLeitura !== 'nao_encontrado' && trackingState.status !== 'sem_leitura_recente',
      sugestaoDecisao,
      responsavelProvavel: trackingState.responsavelProvavel,
      fontesAutomaticas,
      diagnosticoOperacional: diagnosticarOperacao(trackingState),
    }
  })

  return {
    casoId: caso.id,
    itens,
    resumo: {
      totalItens: itens.length,
      itensSemEvidencia: itens.filter((item) => !item.evidenciaSuficiente).length,
      valorReclamado: cobranca.valorTotalCobrado,
      valorSugerido: itens.reduce(
        (total, item) => total + (item.sugestaoDecisao === 'procedente' ? item.item.valorReclamado : 0),
        0,
      ),
    },
  }
}

export function decidirCasoPp({
  caso,
  decisao,
  valorAprovado,
  responsavelFinanceiro,
  justificativa,
}: {
  caso: PpCasoIndenizacao
  decisao: PpDecisao
  valorAprovado: number
  responsavelFinanceiro: string
  justificativa: string
}): PpCasoIndenizacao {
  if (!justificativa.trim()) {
    throw new Error('Justificativa obrigatoria para decisao P&P.')
  }

  return {
    ...caso,
    decisao,
    valorAcatado: valorAprovado,
    responsavelFinanceiro,
    justificativa,
    status: decisao === 'improcedente' ? 'aprovado' : 'aguardando_aprovacao',
  }
}

export function aprovarCasoPp({
  caso,
  aprovador,
  justificativa,
}: {
  caso: PpCasoIndenizacao
  aprovador: string
  justificativa: string
}): PpCasoIndenizacao {
  if (!justificativa.trim()) {
    throw new Error('Justificativa obrigatoria para aprovacao P&P.')
  }

  return {
    ...caso,
    status: 'aprovado',
    aprovacoes: [
      ...caso.aprovacoes,
      {
        aprovador,
        data: new Date().toISOString(),
        justificativa,
        valor: caso.valorAcatado,
        impactoFinanceiro: caso.responsavelFinanceiro
          ? `Debito preparado contra ${caso.responsavelFinanceiro}`
          : 'Sem responsavel financeiro definido',
      },
    ],
  }
}

export function enviarCasoPpParaFinanceiro(caso: PpCasoIndenizacao): PpFinanceiroDebito {
  if (caso.status !== 'aprovado') {
    throw new Error('Caso precisa estar aprovado antes de enviar ao financeiro.')
  }

  return {
    id: `fin-${caso.id}`,
    casoId: caso.id,
    valorAprovado: caso.valorAcatado,
    status: 'pendente_lancamento',
    debitoContra: caso.responsavelFinanceiro ?? 'Sem responsavel definido',
    divergenciaCartaPedidos: Math.max(0, caso.valorCobrado - caso.valorAcatado),
  }
}

function parseCsv(conteudo: string) {
  const [headerLine, ...lines] = conteudo.trim().split(/\r?\n/)
  const headers = headerLine.split(',').map((header) => header.trim())
  if (!headers.includes('valorReclamado')) {
    throw new Error('Coluna obrigatoria ausente: valorReclamado')
  }
  if (!colunasChave.some((coluna) => headers.includes(coluna))) {
    throw new Error(`Informe ao menos uma chave de busca: ${colunasChave.join(', ')}`)
  }

  return lines.filter(Boolean).map((line) => {
    const values = line.split(',').map((value) => value.trim())
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])) as Record<string, string>
  })
}

function localizarRegistroOperacional(row: Record<string, string>) {
  return baseOperacionalPp.find((registro) =>
    colunasChave.some((chave) => row[chave] && registro[chave as keyof PpRegistroOperacional] === row[chave]),
  )
}

function enriquecerItemReclamado(
  row: Record<string, string>,
  registro: PpRegistroOperacional | undefined,
): Omit<PpItemReclamado, 'id' | 'statusLeitura'> {
  return {
    cte: row.cte || registro?.cte || '',
    nf: row.nf || registro?.nf || '',
    pedido: row.pedido || registro?.pedido || '',
    sku: row.sku || registro?.sku || '',
    volume: row.volume || registro?.volume || '',
    pallet: row.pallet || registro?.pallet || '',
    valorNf: Number(row.valorNf || registro?.valorNf || 0),
    valorReclamado: Number(row.valorReclamado),
    motivoCliente: row.motivoCliente || undefined,
  }
}

function statusLeituraItem(
  row: Omit<PpItemReclamado, 'id' | 'statusLeitura'>,
  encontrouRegistro: boolean,
  duplicado: boolean,
): PpStatusLeitura {
  if (duplicado) return 'duplicado'
  if (!encontrouRegistro) return 'nao_encontrado'
  if (row.valorReclamado > row.valorNf) return 'divergente'
  if (row.pallet || row.volume || row.cte || row.nf || row.pedido) return 'encontrado'
  return 'nao_encontrado'
}

function fontesAutomaticasItem(item: PpItemReclamado) {
  const registro = localizarRegistroOperacional({
    cte: item.cte,
    nf: item.nf,
    pedido: item.pedido,
    sku: item.sku,
    volume: item.volume,
    pallet: item.pallet,
  })
  return registro?.fontes ?? []
}

function diagnosticarOperacao(tracking: TrackingState) {
  if (tracking.status === 'cobranca_contestavel_carga_localizada') {
    return 'Carga localizada; cobrança de extravio é contestável.'
  }
  if (tracking.status === 'local_incorreto_corrigivel') {
    return 'Carga localizada em local incorreto; redirecionar antes de indenizar.'
  }
  if (tracking.status === 'local_incorreto_risco_sla') {
    return 'Carga localizada fora do ponto esperado; corrigir ou tratar SLA antes de indenizar.'
  }
  if (tracking.status === 'analise_indenizacao') {
    return 'Há dano, avaria ou perda de valor; abrir análise de indenização.'
  }
  if (tracking.status === 'sem_leitura_recente') {
    return 'Sem evidência operacional suficiente; investigar antes de decidir.'
  }
  if (tracking.status === 'no_prazo') {
    return 'Carga no local esperado; cobrança tende a ser contestável.'
  }
  return 'nao_encontrado'
}

function localizarUnidadeTracking(item: PpItemReclamado, unidades: TrackingUnit[]) {
  return unidades.find(
    (unidade) =>
      unidade.cte === item.cte ||
      unidade.nf === item.nf ||
      unidade.pedido === item.pedido ||
      unidade.volume === item.volume ||
      unidade.pallet === item.pallet,
  )
}

function sugerirDecisao(item: PpItemReclamado, tracking: TrackingState): PpDecisao {
  if (item.statusLeitura === 'nao_encontrado') return 'aguardar_evidencia'
  if (tracking.status === 'cobranca_contestavel_carga_localizada') return 'improcedente'
  if (tracking.status === 'analise_indenizacao') return 'procedente'
  if (tracking.status === 'local_incorreto_corrigivel' || tracking.status === 'local_incorreto_risco_sla') {
    return 'aguardar_evidencia'
  }
  return 'improcedente'
}

function trackingSemEvidencia(item: PpItemReclamado): TrackingState {
  return {
    unitId: item.id,
    status: 'sem_leitura_recente',
    localAtual: null,
    localEsperado: null,
    ultimoEvento: null,
    atrasoMinutos: 0,
    proximaAcao: 'investigar_sem_leitura',
    responsavelProvavel: 'Operacao',
    geraIndenizacaoAutomatica: false,
    conclusao: 'Item reclamado ainda sem evidencia operacional vinculada.',
  }
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
