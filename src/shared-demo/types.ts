export type DemoAppScope = 'admin' | 'frontend-supervisor' | 'mobile-operador' | 'demo' | 'remover'

export interface DemoWarehouse {
  id: string
  codigo: string
  nome: string
  cidade: string
  uf: string
  modo: 'simples' | 'completo'
  ativo: boolean
}

export interface DemoOwner {
  id: string
  codigo: string
  nome: string
  cnpj: string
  cor: string
  ativo: boolean
}

export interface DemoSku {
  id: string
  codigo: string
  ean: string
  descricao: string
  categoria: string
  curva: 'A' | 'B' | 'C'
  unidade: string
  unidadesPorCaixa: number
  peso: number
  altura: number
  largura: number
  profundidade: number
  controleLote: boolean
  controleValidade: boolean
  controleSerie: boolean
  ncm: string
  cest: string
  origem: number
  ownerId: string
  ativo: boolean
}

export interface DemoAddress {
  codigo: string
  armazemId: string
  zona: string
  tipo: 'picking' | 'pulmao' | 'recebimento' | 'expedicao' | 'avaria' | 'quarentena'
  bloqueado: boolean
}

export interface DemoProfile {
  id: string
  nome: string
  cor: string
  permissoes: string[]
}

export interface DemoUser {
  id: string
  nome: string
  email: string
  perfilId: string
  armazemIds: string[]
  ownerIds?: string[]
  ativo: boolean
}

export interface DemoOccurrenceReason {
  id: string
  codigo: string
  rotulo: string
  tipo:
    | 'falta'
    | 'sobra'
    | 'item-trocado'
    | 'avaria'
    | 'local-cheio'
    | 'local-vazio'
  exigeFoto?: boolean
  exigeAprovacao?: boolean
  bloqueiaFluxo?: boolean
  cor: string
}

export interface DemoEffectiveParameter {
  chave: string
  grupo: string
  label: string
  descricao: string
  valor: string
  valorLabel: string
  origem: 'global' | 'cd' | 'owner'
  escopoLabel: string
  gerenciadoPor: 'wms-admin-business'
  consumidoPor: Array<'wms-frontend' | 'wms-mobile'>
}

export interface DemoDevice {
  id: string
  nome: string
  tipo: 'coletor' | 'voice' | 'tablet'
  status: 'online' | 'offline' | 'manutencao'
  operador: string
  armazemId: string
}

export interface DemoOperationalTask {
  id: string
  fluxo:
    | 'receber'
    | 'bipagem'
    | 'guardar'
    | 'separar'
    | 'conferir'
    | 'carregar'
    | 'contar'
    | 'abastecer'
  prioridade: 'alta' | 'normal'
  status?: DemoOperationalTaskStatus
  resumo: string
  contexto: string
  conclusao: string
  ownerId: string
  armazemId: string
  origem: string
  destino: string
  skuCodigo: string
  quantidadeBase: number
  expedicao?: DemoExpeditionTaskContext
  recebimento?: DemoReceivingTaskContext
  passos: Array<{
    instrucao: string
    esperado: string
    rotulo: string
    tipo: 'scan' | 'quantidade' | 'confirmar'
    icon: string
    dica?: string
    unidade?: 'un' | 'cx' | 'plt'
    fatorBase?: number
    contagemMista?: boolean
  }>
}

export interface DemoAppResponsibility {
  tela: string
  app: 'wms-admin-business' | 'wms-frontend' | 'wms-mobile'
  classificacao: DemoAppScope
  papel: string
  acaoEsperada: string
}

export type DemoOperationalTaskStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'WAITING_SUPERVISOR'
  | 'DONE'
  | 'CANCELLED'
  | 'SYNC_PENDING'
  | 'SYNC_FAILED'

export type DemoChecklistFlow =
  | 'receber'
  | 'bipagem'
  | 'guardar'
  | 'separar'
  | 'conferir'
  | 'carregar'
  | 'contar'
  | 'abastecer'

export type DemoChecklistAnswerType = 'BOOLEAN' | 'OK_NOK_NA' | 'PHOTO'
export type DemoChecklistAnswerValue = 'YES' | 'NO' | 'OK' | 'NOK' | 'NA' | string | number

export interface DemoChecklistQuestion {
  id: string
  text: string
  type: DemoChecklistAnswerType
  required: boolean
  okLabel?: string
  failLabel?: string
  failValues?: DemoChecklistAnswerValue[]
  requiresPhotoOnFail?: boolean
  requiresObservationOnFail?: boolean
  blocksStep?: boolean
  requiresSupervisor?: boolean
  /** Item pode ser marcado "Não aplicável" (checklist por operação/equipamento). */
  permiteNA?: boolean
}

export interface DemoChecklistTemplate {
  id: string
  code: string
  name: string
  flow: DemoChecklistFlow
  /** Eixos do checklist por operação + tipo de equipamento (decisão 27). */
  operacao?: string | null
  tipoEquipamento?: string | null
  warehouseId: string
  ownerId: string | null
  active: boolean
  version: number
  blocksOnFailure: boolean
  questions: DemoChecklistQuestion[]
}

export type DemoOccurrenceStatus =
  | 'OPEN'
  | 'WAITING_PHOTO'
  | 'WAITING_SUPERVISOR'
  | 'IN_TREATMENT'
  | 'BLOCKING_FLOW'
  | 'WAITING_EXTERNAL'
  | 'RESOLVED'
  | 'REJECTED'
  | 'REOPENED'
  | 'CANCELLED'

export type DemoOccurrenceSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface DemoOperationalOccurrence {
  id: string
  warehouseId: string
  ownerId: string
  type: DemoOccurrenceReason['tipo'] | 'checklist' | 'veiculo-reprovado' | 'etiqueta'
  severity: DemoOccurrenceSeverity
  status: DemoOccurrenceStatus
  sourceFlow: DemoChecklistFlow
  sourceTaskId: string
  sourceDocumentId?: string
  handlingUnitId?: string
  productId?: string
  locationId?: string
  reasonCodeId: string
  title: string
  description: string
  blocksFlow: boolean
  blocksStock: boolean
  assignedTo?: string | null
  dueAt: string
  createdBy: string
  createdAt: string
  resolvedAt?: string | null
  resolutionCode?: string | null
  evidence: Array<{
    id: string
    type: 'PHOTO' | 'SIGNATURE' | 'NOTE'
    label: string
    capturedBy: string
    capturedAt: string
    deviceId: string
  }>
}

export interface DemoOperationalEvent {
  id: string
  objectType: 'task' | 'occurrence' | 'label' | 'staging' | 'integration' | 'expedition_load'
  objectId: string
  eventType: string
  message: string
  payload?: Record<string, string | number | boolean | null>
  userId: string
  timestamp: string
}

export interface DemoReceivingItem {
  skuCodigo: string
  descricao: string
  esperado: number
  unidadesPorCaixa?: number
}

export interface DemoReceivingOrder {
  id: string
  doca: string
  documento: string
  fornecedor: string
  placa?: string
  motorista?: string
  eta: string
  ordemExecucaoAtual: number
  itens: DemoReceivingItem[]
}

export interface DemoReceivingTaskContext {
  id: string
  documento: string
  fornecedor: string
  placaEsperada: string
  motoristaEsperado: string
  horarioAgendado: string
  ordemExecucaoAtual: number
  filaSeguranca: string
  filaAdministrativa: string
}

export type DemoExpeditionDestination = 'enderecamento' | 'cross-docking'

export type DemoExpeditionLoadStatus =
  | 'montagem-aprovada'
  | 'anexada-destino'
  | 'reservada'
  | 'conferencia'
  | 'pronta-expedicao'
  | 'carregando'
  | 'viagem-liberada'
  | 'bloqueada'

export type DemoExpeditionVehicleCondition = 'ok' | 'recusado'

export interface DemoExpeditionVolume {
  id: string
  pedidoId: string
  cte: string
  palletId: string
  cubagemM3: number
  pesoKg: number
  bipado: boolean
  descricao: string
  staging: string
  divergencia?: string
}

export interface DemoExpeditionLoad {
  id: string
  coletaId: string
  romaneioId: string
  destino: string
  destinoOperacional: DemoExpeditionDestination
  transportadora: string
  veiculo: string
  placa: string
  motorista: string
  horario: string
  doca: string
  status: DemoExpeditionLoadStatus
  capacidadeM3: number
  capacidadeKg: number
  tarefaConferenciaId: string
  tarefaCarregamentoId: string
  origem: {
    tipo: 'montagem'
    montagemId: string
    recebimentoId: string
    palletA4Id: string
    anexadoEm: string
  }
  volumes: DemoExpeditionVolume[]
}

export interface DemoExpeditionTaskContext {
  cargaId: string
  romaneioId: string
  origem: 'montagem'
  destinoOperacional: DemoExpeditionDestination
  tipoEventoFinal: 'expedicao.conferencia_finalizada' | 'expedicao.checklist_embarque'
}
