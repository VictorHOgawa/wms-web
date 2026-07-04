import type {
  DemoOperationalEvent,
  DemoReceivingOrder,
  DemoReceivingTaskContext,
} from './types.ts'

export const ORDEM_EXECUCAO_RECEBIMENTO = [
  'Encostar veiculo',
  'Conferencia geral',
  'Conferencia de documentos',
  'Geracao de etiquetas',
  'Conferencia fisica',
  'Montagem de pallets',
  'Classificacao de destino + enderecamento',
] as const

export interface DemoReceivingMobileTask {
  id: string
  fluxo: 'receber'
  prioridade: 'alta' | 'normal'
  resumo: string
  contexto: string
  conclusao: string
  recebimento: DemoReceivingTaskContext
  passos: Array<{
    instrucao: string
    esperado: string
    rotulo: string
    tipo: 'scan' | 'quantidade' | 'confirmar'
    icon: string
    dica?: string
    unidade?: 'un' | 'cx' | 'plt'
    fatorBase?: number
  }>
}

export interface DemoReceivingScanRequest {
  recebimentoId: string
  tarefaId: string
  passoRotulo: string
  codigoEsperado: string
  codigoLido: string
  operadorId: string
  deviceId: string
  timestamp: string
}

export const DEMO_RECEBIMENTOS_WEB: DemoReceivingOrder[] = [
  {
    id: 'REC-2041',
    doca: 'Doca 03',
    documento: 'NF-e 88.214',
    fornecedor: 'Distribuidora Andrade',
    placa: 'FJD-3A21',
    motorista: 'Marcos Almeida',
    eta: '13:10',
    ordemExecucaoAtual: 4,
    itens: [
      { skuCodigo: 'SKU-10241', descricao: 'Fone Bluetooth Pulse X', esperado: 120, unidadesPorCaixa: 12 },
      { skuCodigo: 'SKU-10242', descricao: 'Carregador Turbo 30W', esperado: 200, unidadesPorCaixa: 20 },
    ],
  },
]

export function validarCodigoBipado(codigoEsperado: string, codigoLido: string) {
  return normalizarCodigoBipagem(codigoEsperado) === normalizarCodigoBipagem(codigoLido)
}

export function criarEventoBipagemRecebimento(input: DemoReceivingScanRequest): DemoOperationalEvent {
  const ok = validarCodigoBipado(input.codigoEsperado, input.codigoLido)

  return {
    id: `evt-${input.tarefaId}-${input.passoRotulo}-${normalizarCodigoBipagem(input.codigoLido)}`.toLowerCase(),
    objectType: 'task',
    objectId: input.recebimentoId,
    eventType: ok ? 'recebimento.codigo_bipado' : 'recebimento.codigo_divergente',
    message: ok
      ? `${input.passoRotulo} ${input.codigoLido} bipado no APP.`
      : `${input.passoRotulo} ${input.codigoLido} diverge do esperado ${input.codigoEsperado}.`,
    payload: {
      origemApp: 'wms-mobile',
      tarefaId: input.tarefaId,
      recebimentoId: input.recebimentoId,
      passoRotulo: input.passoRotulo,
      codigoEsperado: input.codigoEsperado,
      codigoLido: input.codigoLido,
      resultado: ok ? 'ok' : 'divergente',
      deviceId: input.deviceId,
      syncStatus: 'SYNC_PENDING',
    },
    userId: input.operadorId,
    timestamp: input.timestamp,
  }
}

export function criarTarefaMobileRecebimento(recebimento: DemoReceivingOrder): DemoReceivingMobileTask {
  return {
    id: 'T-9011',
    fluxo: 'receber',
    prioridade: recebimento.ordemExecucaoAtual <= 3 ? 'alta' : 'normal',
    resumo: `${recebimento.doca} - ${recebimento.id}`,
    contexto: `${recebimento.documento} - ${recebimento.fornecedor}`,
    conclusao: 'Checklist de chegada concluido. WEB libera a conferencia documental e gera OS de bipagem.',
    recebimento: criarContextoRecebimento(recebimento),
    passos: [
      {
        instrucao: 'Bipe a doca',
        esperado: formatarDocaParaBipagem(recebimento.doca),
        rotulo: 'Doca',
        tipo: 'scan',
        icon: 'car',
      },
    ],
  }
}

export function criarContextoRecebimento(recebimento: DemoReceivingOrder): DemoReceivingTaskContext {
  return {
    id: recebimento.id,
    documento: recebimento.documento,
    fornecedor: recebimento.fornecedor,
    placaEsperada: recebimento.placa ?? 'NAO-INFORMADA',
    motoristaEsperado: recebimento.motorista ?? 'Nao informado',
    horarioAgendado: recebimento.eta,
    ordemExecucaoAtual: recebimento.ordemExecucaoAtual,
    filaSeguranca: 'GR - Gerenciamento de Risco',
    filaAdministrativa: 'Administrativo - Tratativa de recebimento',
  }
}

export const DEMO_RECEBIMENTO_POR_TAREFA: Record<string, DemoReceivingTaskContext> = {
  'T-9011': criarContextoRecebimento(DEMO_RECEBIMENTOS_WEB[0]),
}

function normalizarCodigoBipagem(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function formatarDocaParaBipagem(doca: string) {
  const match = doca.match(/(\d+)/)
  if (!match) return doca.toUpperCase()
  return `DOCA-${match[1].padStart(2, '0')}`
}
