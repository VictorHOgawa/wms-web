/**
 * Cliente da API real do WMS (spoke adapta-api), para a torre do supervisor.
 * Espelha o fluxo do coletor: login no Hub → escolhe tenant → troca por token
 * do spoke. Conexão é OPCIONAL: sem ela, as telas seguem com dados mock (demo).
 *
 * Configurar `VITE_HUB_API_URL` no .env (ex.: http://localhost:3334).
 */
const HUB = import.meta.env.VITE_HUB_API_URL ?? ''
// O `spokeUrl` do tenant no Hub pode apontar para um tunnel (usado pelo celular).
// No navegador da mesma máquina, preferimos o spoke local. Se setado, este
// override substitui o spokeUrl do tenant.
const SPOKE_OVERRIDE = import.meta.env.VITE_SPOKE_API_URL ?? ''
const KEY = 'wms.session'

interface Session {
  spokeToken: string
  spokeUrl: string
  tenantId: string
  email: string
}

export function getSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null')
  } catch {
    return null
  }
}
export function isConnected(): boolean {
  return !!getSession()?.spokeToken
}
export function disconnect(): void {
  localStorage.removeItem(KEY)
}

async function req<T>(url: string, init?: RequestInit): Promise<{ status: number; body: T | null }> {
  // Timeout para não travar a UI se um endpoint (ex.: tunnel morto) não responder.
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), 8000)
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal })
    const t = await r.text()
    return { status: r.status, body: t ? (JSON.parse(t) as T) : null }
  } catch {
    return { status: 0, body: null }
  } finally {
    clearTimeout(to)
  }
}

/** Conecta ao backend real com e-mail/senha do Hub. Retorna ok/erro. */
export async function wmsConnect(
  email: string,
  senha: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!HUB) return { ok: false, message: 'VITE_HUB_API_URL não configurada — seguindo em modo demo.' }

  const login = await req<{ accessToken?: string }>(`${HUB}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  })
  if (login.status !== 200 || !login.body?.accessToken) {
    return { ok: false, message: 'E-mail ou senha inválidos no Hub.' }
  }
  const hubToken = login.body.accessToken

  const tenants = await req<Array<{ id: string; spokeUrl?: string | null }>>(`${HUB}/tenants`, {
    headers: { Authorization: `Bearer ${hubToken}` },
  })
  const tenant = Array.isArray(tenants.body) ? tenants.body.find((t) => t.spokeUrl) : null
  if (!tenant?.spokeUrl) return { ok: false, message: 'Nenhuma empresa com spokeUrl disponível.' }
  const spokeUrl = SPOKE_OVERRIDE || tenant.spokeUrl

  const ex = await req<{ accessToken?: string }>(`${spokeUrl}/auth/token`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${hubToken}`,
      'Content-Type': 'application/json',
      'x-tenant-id': tenant.id,
    },
    // Corpo JSON vazio explícito (sem ele, alguns fetch enviam byte nulo e o
    // Nest rejeita com 400 "is not valid JSON").
    body: JSON.stringify({}),
  })
  if (ex.status !== 200 || !ex.body?.accessToken) {
    return { ok: false, message: 'Falha ao trocar o token do spoke.' }
  }

  localStorage.setItem(
    KEY,
    JSON.stringify({ spokeToken: ex.body.accessToken, spokeUrl, tenantId: tenant.id, email }),
  )
  return { ok: true }
}

/** GET autenticado no spoke (ex.: '/wms/stock-positions'). */
/** Mensagem de erro do backend (Nest devolve `message` string ou string[]). */
function erroDoBackend(body: unknown, path: string, status: number): string {
  const m = (body as { message?: string | string[] } | null)?.message
  const texto = Array.isArray(m) ? m[m.length - 1] : m
  return texto || `WMS ${path}: HTTP ${status}`
}

export async function wmsGet<T>(path: string): Promise<T> {
  const s = getSession()
  if (!s) throw new Error('WMS não conectado')
  const r = await req<T>(`${s.spokeUrl}${path}`, {
    headers: { Authorization: `Bearer ${s.spokeToken}`, 'x-tenant-id': s.tenantId },
  })
  if (r.status !== 200) throw new Error(erroDoBackend(r.body, path, r.status))
  return r.body as T
}

export async function wmsSend<T>(method: string, path: string, body?: unknown): Promise<T> {
  const s = getSession()
  if (!s) throw new Error('WMS não conectado')
  const r = await req<T>(`${s.spokeUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${s.spokeToken}`,
      'x-tenant-id': s.tenantId,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (r.status < 200 || r.status >= 300) throw new Error(erroDoBackend(r.body, path, r.status))
  return r.body as T
}

// --- Tipos de resposta do módulo /wms do spoke ---
export interface WmsStockPositionDTO {
  id: string
  warehouseCode: string
  addressCode: string
  addressType: string
  addressZone: string | null
  skuId: string
  skuCode: string
  skuDescription: string
  curve: string
  unit: string
  ownerId: string
  lote: string | null
  validade: string | null
  quantity: number
  status: string
}

export interface WmsMovementDTO {
  id: string
  type: string
  quantity: number
  skuCode: string
  skuDescription: string
  lote: string | null
  fromAddressCode: string | null
  toAddressCode: string | null
  userId: string | null
  createdAt: string
}

export interface WmsChecklistAnswerDTO {
  questionId?: string
  text?: string
  value?: string
  obs?: string
  foto?: string
}
export interface WmsChecklistExecutionDTO {
  id: string
  templateId: string | null
  templateCode: string | null
  warehouseId: string
  ownerId: string | null
  flow: string
  serviceOrderEventId: string | null
  responsavel: string | null
  condicao: string | null
  answers: WmsChecklistAnswerDTO[]
  geolocalizacao: string | null
  executedBy: string | null
  executedAt: string
}

export interface WmsDivergenceNota {
  quando: string
  quem: string
  texto: string | null
  anexo: { nome: string; url: string } | null
}
export interface WmsDivergenceDTO {
  id: string
  warehouseId: string
  serviceOrderEventId: string | null
  itemKey: string | null
  skuCode: string | null
  tipo: string
  esperada: number
  conferida: number
  divergencia: number
  observacao: string | null
  status: string
  tratativa: string | null
  responsavel: string | null
  segregado: boolean
  liberadoPor: string | null
  liberadoEm: string | null
  notificadoComercialEm: string | null
  notas: WmsDivergenceNota[] | null
  createdAt: string
}

export interface WmsOwnerLiteDTO {
  id: string
  nome: string
}
export interface WmsAddressLiteDTO {
  id: string
  code: string
  type: string
  blocked: boolean
  capacidadePaletes?: number
  capacidadePeso?: number
  vagasOcupadas?: number
  volumesOcupados?: number
  cheio?: boolean
  zoneRef?: { id: string; code: string; name: string } | null
}
export interface WmsSkuLiteDTO {
  id: string
  ownerId: string
  code: string
  description: string
  unitsPerBox: number
  boxVolumeM3: number | null
}
export interface WmsEtiquetaPreviewDTO {
  bloqueado: boolean
  motivo?: string
  skuId?: string
  skuCode?: string
  skuDescription?: string
  unitsPerBox?: number
  quantidadeUnidades?: number
  caixas?: number
  unidadesSoltas?: number
  nEtiquetas?: number
  cubagem?: {
    caixasParaCubagem: number
    volumeCaixaM3: number | null
    volumeCaixaDerivado: boolean
    cubagemCalculadaM3: number | null
    cubagemNotaM3: number | null
  }
}
export interface WmsEtiquetaLoteDTO {
  id: string
  ownerId: string | null
  skuCode: string
  skuDescription: string | null
  quantidadeUnidades: number
  unitsPerBox: number
  caixas: number
  unidadesSoltas: number
  nEtiquetas: number
  tipo: string
  responsavel: string | null
  createdAt: string
}

export interface WmsGeneralidadeDTO {
  id: string
  warehouseId: string
  ownerId: string | null
  papel: string
  texto: string
  active: boolean
}
export interface WmsSupplyScoreDTO {
  supplyId: string
  supplyCode: string | null
  supplyName: string | null
  unit: string | null
  custoUnitario: number | null
  ownerId: string | null
  enviado: number
  recebido: number
  consumo: number
  saldo: number
  prejuizoEstimado: number | null
}

/** CD do TMS (BusinessUnit isDistributionCenter) — destino físico do upload avulso. */
export interface BusinessUnitLiteDTO {
  id: string
  name: string
  code: string
}
/** Armazém real do WMS (para o seletor de CD do header quando conectado). */
export interface WmsWarehouseLiteDTO {
  id: string
  code: string
  name: string
  uf: string | null
  tipo: string
  mode: string
}

/** Resultado da importação avulsa de XML (POST /wms/documentos/importar-xml). */
export interface WmsImportacaoXmlDTO {
  fiscalDocumentId: string
  floorStockId: string
  chaveAcesso: string
  numero: string | null
  emitente: string | null
  destinatario: string | null
  produtos: number
  volumesDeclarados: number
  skusPreCadastrados: number
  skusJaConhecidos: number
  businessUnitId: string | null
  branchId: string | null
}

export interface WmsPalletDTO {
  id: string
  codigo: string
  warehouseId: string
  destino: string | null
  status: string // ABERTO | FECHADO
  fotoUrl: string | null
  nVolumes: number
  createdAt: string
  fechadoEm: string | null
  fechadoPor: string | null
}
export interface WmsEtiquetaIdentidadeDTO {
  id: string
  codigo: string
  skuCode: string
  seq: number
  tipoVolume: string
  palletId: string | null
  status: string
}
export interface WmsEtiquetasDocPreviewLinha {
  skuId?: string
  skuCode: string
  descricao: string
  quantidadeUnidades: number
  caixas?: number
  unidadesSoltas?: number
  nEtiquetas: number
  bloqueado: boolean
  motivo: string | null
}
export interface WmsEtiquetasDocPreviewDTO {
  fiscalDocumentId: string
  linhas: WmsEtiquetasDocPreviewLinha[]
  totalEtiquetas: number
  temBloqueio: boolean
}
export interface WmsCubagemDTO {
  fiscalDocumentId: string
  notaM3: number
  calculadaM3: number
  divergenciaM3: number
  divergenciaPct: number
  gatilhoCustoExtra: boolean
  itensSemSku: number
  notaInformada: boolean
}
export interface WmsCubagemGatilhoDTO {
  id: string
  fiscalDocumentId: string
  notaM3: number
  calculadaM3: number
  divergenciaM3: number
  divergenciaPct: number
  gatilhoCustoExtra: boolean
  tratado: boolean
  createdAt: string
}
export interface WmsTarefaArmazemDTO {
  eventId: string
  code: string
  status: string
  skuCode: string | null
  skuDescription: string | null
  quantidade: number
  fromAddressCode: string | null
  suggestedAddressCode: string | null
  done: unknown | null
}
export interface WmsCargaPisoDTO {
  floorStockId: string
  fiscalDocumentId: string
  docType: string
  docNumero: string | null
  destino: string | null
  unidade: string | null
  status: string
  arrivedAt: string
  volumes: number
  horasNoPiso: number
  freeTimeHoras: number
  estourou: boolean
  horasRestantes: number
  /** A9/A9+: pallets da carga — guarda parcial e relógio próprio por pallet. */
  pallets?: Array<{ codigo: string; volumes: number; guardado: boolean; horasNoPiso: number; estourou: boolean }>
}
/** Autorização de exceção (decisão A2): coletor solicita, supervisor decide aqui. */
export interface WmsAutorizacaoDTO {
  id: string
  serviceOrderId: string
  tipo: string
  status: 'PENDENTE' | 'APROVADA' | 'NEGADA'
  motivo: string | null
  solicitadoPorNome: string | null
  createdAt: string
}
export interface WmsTransferenciaArmazenagemDTO {
  floorStockId: string
  status: string
  enderecoStaging: string
  warehouseId: string
  ordens: { serviceOrderId: string; code: string; skuCode: string; quantity: number }[]
}
export interface WmsSeparacaoDTO {
  eventId: string
  code: string
  status: string
  skuCode: string | null
  skuDescription: string | null
  quantidade: number
  fromAddressCode: string | null
  separado: number | null
  parcial: boolean | null
}
export interface WmsConfrontoChaveDTO {
  chave: string
  temCarga: boolean
  temDescarga: boolean
  ultima: string
}
export interface WmsConfrontoDTO {
  chave: string
  carga: { total: number; quando: string; responsavel: string | null } | null
  descarga: { total: number; quando: string; responsavel: string | null } | null
  faltando: string[]
  sobrando: string[]
  bate: boolean
}
export interface WmsApontamentoItemDTO {
  categoria: string // MAO_DE_OBRA | INSUMO
  recurso: string
  quantidade: number
  unidade: string
  horas: number | null
  custoUnitario: number | null
  custoBRL: number
  sugerido: boolean
}
export interface WmsApontamentoDTO {
  id: string
  chave: string
  ownerId: string | null
  responsavel: string | null
  custoTotalBRL: number
  validado: boolean
  validadoPor: string | null
  validadoEm: string | null
  createdAt: string
  itens: WmsApontamentoItemDTO[]
}
export interface WmsApontamentoSugestaoDTO {
  itens: WmsApontamentoItemDTO[]
  base: { nPallets: number; regra: string }
}

// --- O.S de armazém da VIAGEM (eventos de torre; mesma fonte do coletor) ---
export interface WarehouseTaskDTO {
  serviceOrderId: string
  serviceOrderCode: string
  eventId: string
  eventCode: string
  eventLabel: string
  fluxo: string
  templateName: string | null
  temOcorrencia?: boolean
  bloqueada?: boolean
  bloqueadaPor?: string | null
  contexto: {
    itens: Array<{ chave: string | null; numero: string | null; produto: string | null; esperada: number; skuCode?: string }>
    destinoSugerido?: string | null
  }
}

/** Evento (passo) de uma O.S na visão de armazém — timeline completa. */
export interface OverviewEventoDTO {
  eventId: string
  code: string | null
  label: string | null
  status: 'PENDING' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  executedBy: string | null
  executedByNome: string | null
  completedAt: string | null
  /** `event.data` quando COMPLETED (ex.: linhas da conferência, checklist). */
  data: Record<string, unknown> | null
}
export interface OverviewDocumentoDTO {
  fiscalDocumentId: string | null
  tipo: string | null
  numero: string | null
  kind: 'pickup' | 'delivery' | string
  weightKg: number | null
  volumeM3: number | null
  /** Expedição por rota: sequência da parada de ENTREGA (embarque = inverso). */
  entregaSequencia?: number | null
}
/** O.S de armazém da viagem com a história completa (GET /service-orders/warehouse-overview). */
export interface WarehouseOverviewDTO {
  serviceOrderId: string
  code: string
  template: string | null
  status: string
  createdAt: string
  trip: { id: string; code: string; status: string } | null
  cd: { id: string; name: string } | null
  documentos: OverviewDocumentoDTO[]
  eventos: OverviewEventoDTO[]
  bloqueada: boolean
  bloqueadaPor: string | null
  ocorrenciasAbertas: number
}

export interface WmsDocaDTO {
  id: string
  code?: string | null
  name?: string | null
  nome?: string | null
  tipo?: string | null
}

export interface WmsParamValueDTO {
  chave: string
  escopo: string
  escopoId: string | null
  valor: unknown
}

export const wmsApi = {
  /** Eventos de O.S de armazém (AVAILABLE) por código — a torre executa os passos
   *  que não são do coletor (pré-aviso, bipagem, lista de separação, romaneio,
   *  carregamento). Mesma fonte do app (`/service-orders/warehouse-tasks`). */
  warehouseTasks: (codes: string[]) =>
    wmsGet<WarehouseTaskDTO[]>(`/service-orders/warehouse-tasks?codes=${codes.join(',')}`),
  /** Visão do armazém: O.S da viagem com timeline completa (telas de processo). */
  warehouseOverview: (template?: string) =>
    wmsGet<WarehouseOverviewDTO[]>(
      `/service-orders/warehouse-overview${template ? `?template=${encodeURIComponent(template)}` : ''}`,
    ),
  docas: () => wmsGet<WmsDocaDTO[]>('/wms/docas'),
  paramValues: () => wmsGet<WmsParamValueDTO[]>('/wms/param-values'),
  /** Conclui um evento de O.S (rota genérica de execução). */
  executeOsEvent: (serviceOrderId: string, eventId: string, data: Record<string, unknown>) =>
    wmsSend<unknown>('POST', `/service-orders/${serviceOrderId}/events/${eventId}/execute`, { data }),
  stockPositions: () => wmsGet<WmsStockPositionDTO[]>('/wms/stock-positions'),
  businessUnits: () => wmsGet<BusinessUnitLiteDTO[]>('/business-units?onlyCD=true'),
  pallets: (status?: string) => wmsGet<WmsPalletDTO[]>(`/wms/pallets${status ? `?status=${status}` : ''}`),
  abrirPallet: (dto: Record<string, unknown>) => wmsSend<WmsPalletDTO>('POST', '/wms/pallets', dto),
  addVolumePallet: (id: string, codigo: string) =>
    wmsSend<{ nVolumes: number }>('POST', `/wms/pallets/${id}/volumes`, { codigo }),
  fecharPallet: (id: string, dto: Record<string, unknown>) =>
    wmsSend<WmsPalletDTO>('POST', `/wms/pallets/${id}/fechar`, dto),
  palletVolumes: (palletId: string) =>
    wmsGet<WmsEtiquetaIdentidadeDTO[]>(`/wms/etiquetas/identidades?palletId=${palletId}`),
  loteIdentidades: (loteId: string) =>
    wmsGet<WmsEtiquetaIdentidadeDTO[]>(`/wms/etiquetas/identidades?loteId=${loteId}`),
  cubagem: (fiscalDocumentId: string) =>
    wmsGet<WmsCubagemDTO>(`/wms/documentos/${fiscalDocumentId}/cubagem`),
  etiquetasPreviewDoc: (fiscalDocumentId: string) =>
    wmsGet<WmsEtiquetasDocPreviewDTO>(`/wms/documentos/${fiscalDocumentId}/etiquetas-preview`),
  emitEtiquetasDoc: (fiscalDocumentId: string, dto: Record<string, unknown>) =>
    wmsSend<{ lotes: number; ignoradosBloqueados: number }>('POST', `/wms/documentos/${fiscalDocumentId}/etiquetas`, dto),
  registrarGatilhoCubagem: (fiscalDocumentId: string) =>
    wmsSend<WmsCubagemGatilhoDTO>('POST', `/wms/documentos/${fiscalDocumentId}/cubagem/gatilho`, {}),
  cubagemGatilhos: () => wmsGet<WmsCubagemGatilhoDTO[]>('/wms/cubagem/gatilhos'),
  confrontoChaves: () => wmsGet<WmsConfrontoChaveDTO[]>('/wms/confronto'),
  confronto: (chave: string) => wmsGet<WmsConfrontoDTO>(`/wms/confronto/${encodeURIComponent(chave)}`),
  registrarConfronto: (dto: Record<string, unknown>) => wmsSend<unknown>('POST', '/wms/confronto', dto),
  autorizacoes: (status?: string) =>
    wmsGet<WmsAutorizacaoDTO[]>(`/wms/autorizacoes${status ? `?status=${status}` : ''}`),
  decidirAutorizacao: (id: string, status: 'APROVADA' | 'NEGADA') =>
    wmsSend<WmsAutorizacaoDTO>('PATCH', `/wms/autorizacoes/${id}`, { status }),
  cargasEmPiso: (freeTimeHoras = 24) => wmsGet<WmsCargaPisoDTO[]>(`/wms/cargas-piso?freeTimeHoras=${freeTimeHoras}`),
  transferirArmazenagem: (floorStockId: string, opts?: { addressCode?: string; palletCodigo?: string }) =>
    wmsSend<WmsTransferenciaArmazenagemDTO & { pallet?: string; palletsRestantes?: number }>(
      'POST',
      `/wms/cargas-piso/${floorStockId}/transferir-armazenagem`,
      opts ?? {},
    ),
  abastecimentos: () => wmsGet<WmsTarefaArmazemDTO[]>('/wms/abastecimentos'),
  gerarAbastecimento: (dto: Record<string, unknown>) => wmsSend<{ code: string }>('POST', '/wms/abastecimentos', dto),
  contagens: () => wmsGet<WmsTarefaArmazemDTO[]>('/wms/contagens'),
  gerarContagem: (dto: Record<string, unknown>) => wmsSend<{ code: string }>('POST', '/wms/contagens', dto),
  separacoes: () => wmsGet<WmsSeparacaoDTO[]>('/wms/separacoes'),
  gerarSeparacao: (dto: Record<string, unknown>) =>
    wmsSend<{ code?: string; modo?: string; ordens?: { code: string }[] }>('POST', '/wms/separacoes', dto),
  apontamentos: (chave?: string) => wmsGet<WmsApontamentoDTO[]>(`/wms/apontamentos${chave ? `?chave=${encodeURIComponent(chave)}` : ''}`),
  registrarApontamento: (dto: Record<string, unknown>) => wmsSend<WmsApontamentoDTO>('POST', '/wms/apontamentos', dto),
  validarApontamento: (id: string, dto: Record<string, unknown>) => wmsSend<WmsApontamentoDTO>('POST', `/wms/apontamentos/${id}/validar`, dto),
  sugestaoApontamento: (nPallets: number) => wmsGet<WmsApontamentoSugestaoDTO>(`/wms/apontamentos/sugestao?nPallets=${nPallets}`),
  importarXml: (dto: { xml: string; businessUnitId?: string; branchId?: string; dataChegada?: string }) =>
    wmsSend<WmsImportacaoXmlDTO>('POST', '/wms/documentos/importar-xml', dto),
  movements: (limit = 100) => wmsGet<WmsMovementDTO[]>(`/wms/movements?limit=${limit}`),
  divergences: (status?: string) =>
    wmsGet<WmsDivergenceDTO[]>(`/wms/divergences${status ? `?status=${status}` : ''}`),
  owners: () => wmsGet<WmsOwnerLiteDTO[]>('/wms/owners'),
  skus: () => wmsGet<WmsSkuLiteDTO[]>('/wms/skus'),
  addresses: () => wmsGet<WmsAddressLiteDTO[]>('/wms/addresses'),
  entradaStaging: (dto: Record<string, unknown>) =>
    wmsSend<WmsStockPositionDTO>('POST', '/wms/stock-positions/entrada', dto),
  guardarPosicao: (dto: Record<string, unknown>) =>
    wmsSend<{ destinoPosId: string }>('POST', '/wms/stock-positions/guardar', dto),
  supplyScore: (ownerId?: string) =>
    wmsGet<WmsSupplyScoreDTO[]>(`/wms/supplies/score${ownerId ? `?ownerId=${ownerId}` : ''}`),
  etiquetaPreview: (ownerId: string, skuCode: string, qtd: number) =>
    wmsGet<WmsEtiquetaPreviewDTO>(`/wms/etiquetas/preview?ownerId=${ownerId}&skuCode=${encodeURIComponent(skuCode)}&qtd=${qtd}`),
  etiquetas: () => wmsGet<WmsEtiquetaLoteDTO[]>('/wms/etiquetas'),
  emitEtiqueta: (dto: Record<string, unknown>) => wmsSend<WmsEtiquetaLoteDTO>('POST', '/wms/etiquetas', dto),
  generalidades: (ownerId?: string) =>
    wmsGet<WmsGeneralidadeDTO[]>(`/wms/generalidades${ownerId ? `?ownerId=${ownerId}` : ''}`),
  updateDivergence: (id: string, dto: Record<string, unknown>) =>
    wmsSend<WmsDivergenceDTO>('PATCH', `/wms/divergences/${id}`, dto),
  addDivergenceNote: (id: string, dto: Record<string, unknown>) =>
    wmsSend<WmsDivergenceDTO>('POST', `/wms/divergences/${id}/notas`, dto),
  liberarDivergence: (id: string, dto: Record<string, unknown>) =>
    wmsSend<WmsDivergenceDTO>('POST', `/wms/divergences/${id}/liberar`, dto),
  checklistExecutions: (flow = 'receber', limit = 200) =>
    wmsGet<WmsChecklistExecutionDTO[]>(`/wms/checklists/executions?flow=${flow}&limit=${limit}`),
  warehouses: () => wmsGet<WmsWarehouseLiteDTO[]>('/wms/warehouses'),
}
