export type TrackingUnitType = 'item' | 'volume' | 'pallet' | 'cte' | 'carga'

export type TrackingEventType =
  | 'etiqueta_criada'
  | 'bipagem'
  | 'checkin'
  | 'checklist_chegada'
  | 'checklist_saida'
  | 'foto'
  | 'lacre'
  | 'carregamento'
  | 'ocorrencia'
  | 'comprovante'

export type TrackingStatus =
  | 'no_prazo'
  | 'local_incorreto_corrigivel'
  | 'local_incorreto_risco_sla'
  | 'cobranca_contestavel_carga_localizada'
  | 'analise_indenizacao'
  | 'sem_leitura_recente'

export type TrackingProximaAcao =
  | 'seguir_monitorando'
  | 'gerar_tarefa_redirecionamento'
  | 'abrir_ocorrencia_sla_cliente'
  | 'contestar_cobranca'
  | 'abrir_analise_indenizacao'
  | 'investigar_sem_leitura'

export interface TrackingLocal {
  id: string
  nome: string
  cidade: string
}

export interface TrackingUnit {
  id: string
  tipo: TrackingUnitType
  cte?: string
  nf?: string
  pedido?: string
  sku?: string
  volume?: string
  pallet?: string
  cliente: string
  valor: number
  prazoCliente: string
  tempoMinimoCorrecaoMinutos: number
}

export interface TrackingPlanStep {
  id: string
  unitId: string
  localEsperado: TrackingLocal
  inicioJanela: string
  fimJanela: string
  acaoEsperada: string
  responsavelEsperado: string
  proximoLocal?: TrackingLocal
}

export interface TrackingEvent {
  id: string
  unitId: string
  eventType: TrackingEventType
  local: TrackingLocal
  timestamp: string
  origem: 'wms' | 'tms' | 'mobile' | 'manual'
  operador?: string
  deviceId?: string
  evidenceId?: string
  confianca: number
  danoOuPerdaValor?: boolean
}

export interface TrackingState {
  unitId: string
  status: TrackingStatus
  localAtual: TrackingLocal | null
  localEsperado: TrackingLocal | null
  ultimoEvento: TrackingEvent | null
  atrasoMinutos: number
  proximaAcao: TrackingProximaAcao
  responsavelProvavel: string
  geraIndenizacaoAutomatica: boolean
  conclusao: string
}

export interface AvaliarTrackingInput {
  unidade: TrackingUnit
  plano: TrackingPlanStep[]
  eventos: TrackingEvent[]
  agora: string
  reclamacaoCliente?: 'extravio' | 'avaria' | 'atraso'
}

const cdSaoPaulo: TrackingLocal = { id: 'cd-sp', nome: 'CD Sao Paulo', cidade: 'Sao Paulo' }
const cdCuritiba: TrackingLocal = { id: 'cd-curitiba', nome: 'CD Curitiba', cidade: 'Curitiba' }
const transitoSpCuritiba: TrackingLocal = {
  id: 'transito-sp-curitiba',
  nome: 'Transito Sao Paulo -> Curitiba',
  cidade: 'Rota SP/PR',
}

export const trackingEncomendaDemo: {
  unidades: TrackingUnit[]
  plano: TrackingPlanStep[]
  eventos: TrackingEvent[]
} = {
  unidades: [
    {
      id: 'PAL-001',
      tipo: 'pallet',
      cte: 'CTE-789',
      nf: 'NF-456',
      pedido: 'PED-123',
      sku: 'SKU-123',
      volume: 'VOL-123-1',
      pallet: 'PAL-001',
      cliente: 'Cliente Demo',
      valor: 980,
      prazoCliente: '2026-06-20T18:00:00-03:00',
      tempoMinimoCorrecaoMinutos: 360,
    } satisfies TrackingUnit,
  ],
  plano: [
    {
      id: 'plan-pal-001-sp',
      unitId: 'PAL-001',
      localEsperado: cdSaoPaulo,
      inicioJanela: '2026-06-18T00:00:00-03:00',
      fimJanela: '2026-06-18T23:59:59-03:00',
      acaoEsperada: 'receber/conferir',
      responsavelEsperado: 'CD Sao Paulo',
      proximoLocal: transitoSpCuritiba,
    },
    {
      id: 'plan-pal-001-transito',
      unitId: 'PAL-001',
      localEsperado: transitoSpCuritiba,
      inicioJanela: '2026-06-19T00:00:00-03:00',
      fimJanela: '2026-06-19T23:59:59-03:00',
      acaoEsperada: 'transferir',
      responsavelEsperado: 'Trecho Sao Paulo -> Curitiba',
      proximoLocal: cdCuritiba,
    },
    {
      id: 'plan-pal-001-curitiba',
      unitId: 'PAL-001',
      localEsperado: cdCuritiba,
      inicioJanela: '2026-06-20T00:00:00-03:00',
      fimJanela: '2026-06-20T23:59:59-03:00',
      acaoEsperada: 'receber no destino',
      responsavelEsperado: 'CD Curitiba',
    },
  ],
  eventos: [
    {
      id: 'evt-pal-001-etiqueta',
      unitId: 'PAL-001',
      eventType: 'etiqueta_criada',
      local: cdSaoPaulo,
      timestamp: '2026-06-18T08:10:00-03:00',
      origem: 'wms',
      operador: 'operador-demo',
      deviceId: 'printer-01',
      evidenceId: 'zpl-pal-001',
      confianca: 0.9,
    },
    {
      id: 'evt-pal-001-bipagem-sp',
      unitId: 'PAL-001',
      eventType: 'bipagem',
      local: cdSaoPaulo,
      timestamp: '2026-06-18T11:20:00-03:00',
      origem: 'mobile',
      operador: 'conferente-demo',
      deviceId: 'rf-01',
      evidenceId: 'scan-pal-001',
      confianca: 0.98,
    },
  ],
}

export function avaliarTrackingEncomenda(input: AvaliarTrackingInput): TrackingState {
  const agoraMs = Date.parse(input.agora)
  const planoOrdenado = [...input.plano].sort(
    (a, b) => Date.parse(a.inicioJanela) - Date.parse(b.inicioJanela),
  )
  const etapaEsperada =
    planoOrdenado.find(
      (etapa) => Date.parse(etapa.inicioJanela) <= agoraMs && agoraMs <= Date.parse(etapa.fimJanela),
    ) ?? planoOrdenado.find((etapa) => Date.parse(etapa.inicioJanela) > agoraMs) ?? planoOrdenado.at(-1) ?? null
  const ultimoEvento =
    input.eventos
      .filter((evento) => Date.parse(evento.timestamp) <= agoraMs)
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0] ?? null

  if (!ultimoEvento) {
    return montarEstado({
      input,
      etapaEsperada,
      ultimoEvento,
      status: 'sem_leitura_recente',
      proximaAcao: 'investigar_sem_leitura',
      responsavelProvavel: etapaEsperada?.responsavelEsperado ?? 'Operacao',
      conclusao: 'Sem leitura confiavel ate o momento avaliado.',
    })
  }

  if (ultimoEvento.danoOuPerdaValor || input.reclamacaoCliente === 'avaria') {
    return montarEstado({
      input,
      etapaEsperada,
      ultimoEvento,
      status: 'analise_indenizacao',
      proximaAcao: 'abrir_analise_indenizacao',
      responsavelProvavel: etapaEsperada?.responsavelEsperado ?? 'Operacao',
      conclusao: 'Ha indicio de dano, avaria ou perda de valor. Exige decisao de indenizacao.',
    })
  }

  if (input.reclamacaoCliente === 'extravio') {
    return montarEstado({
      input,
      etapaEsperada,
      ultimoEvento,
      status: 'cobranca_contestavel_carga_localizada',
      proximaAcao: 'contestar_cobranca',
      responsavelProvavel: 'Cliente/atendimento P&P',
      conclusao: `Carga cobrada como extravio, mas localizada em ${ultimoEvento.local.nome}.`,
    })
  }

  if (etapaEsperada && ultimoEvento.local.id === etapaEsperada.localEsperado.id) {
    return montarEstado({
      input,
      etapaEsperada,
      ultimoEvento,
      status: 'no_prazo',
      proximaAcao: 'seguir_monitorando',
      responsavelProvavel: etapaEsperada.responsavelEsperado,
      conclusao: `Local atual confere com o esperado: ${ultimoEvento.local.nome}.`,
    })
  }

  const minutosAtePrazo = Math.floor((Date.parse(input.unidade.prazoCliente) - agoraMs) / 60_000)
  const aindaCorrige = minutosAtePrazo > input.unidade.tempoMinimoCorrecaoMinutos

  return montarEstado({
    input,
    etapaEsperada,
    ultimoEvento,
    status: aindaCorrige ? 'local_incorreto_corrigivel' : 'local_incorreto_risco_sla',
    proximaAcao: aindaCorrige ? 'gerar_tarefa_redirecionamento' : 'abrir_ocorrencia_sla_cliente',
    responsavelProvavel: etapaEsperada?.responsavelEsperado ?? 'Operacao',
    conclusao: etapaEsperada
      ? `Carga localizada em ${ultimoEvento.local.nome}, mas deveria estar em ${etapaEsperada.localEsperado.nome}.`
      : `Carga localizada em ${ultimoEvento.local.nome}, sem etapa esperada vigente.`,
  })
}

function montarEstado({
  input,
  etapaEsperada,
  ultimoEvento,
  status,
  proximaAcao,
  responsavelProvavel,
  conclusao,
}: {
  input: AvaliarTrackingInput
  etapaEsperada: TrackingPlanStep | null
  ultimoEvento: TrackingEvent | null
  status: TrackingStatus
  proximaAcao: TrackingProximaAcao
  responsavelProvavel: string
  conclusao: string
}): TrackingState {
  const atrasoMinutos =
    etapaEsperada && Date.parse(input.agora) > Date.parse(etapaEsperada.fimJanela)
      ? Math.floor((Date.parse(input.agora) - Date.parse(etapaEsperada.fimJanela)) / 60_000)
      : 0

  return {
    unitId: input.unidade.id,
    status,
    localAtual: ultimoEvento?.local ?? null,
    localEsperado: etapaEsperada?.localEsperado ?? null,
    ultimoEvento,
    atrasoMinutos,
    proximaAcao,
    responsavelProvavel,
    geraIndenizacaoAutomatica: false,
    conclusao,
  }
}
