export type Vertente = 'ecommerce' | 'industria' | '3pl'

export type {
  DemoOperationalEvent as OperationalEvent,
  DemoOperationalOccurrence as OperationalOccurrence,
  DemoOccurrenceSeverity as OccurrenceSeverity,
  DemoOccurrenceStatus as OccurrenceStatus,
} from '../../../wms-shared-demo'

export type StatusEstoque =
  | 'disponivel'
  | 'quarentena'
  | 'avaria'
  | 'qualidade'
  | 'reservado'

export interface Owner {
  id: string
  nome: string
  cor: string
}

export interface EmpresaSku {
  id: string
  nome: string
  cor: string
}

export interface CD {
  id: string
  nome: string
  uf: string
}

export interface SKU {
  id: string
  codigo: string
  descricao: string
  curva: 'A' | 'B' | 'C'
  unidade: string
  controleLote: boolean
  controleSerie: boolean
  peso: number
}

export interface Lote {
  lote: string
  validade: string
}

export interface PosicaoEstoque {
  id: string
  skuCodigo: string
  descricao: string
  endereco: string
  lote: string | null
  validade: string | null
  ownerId: string
  curva: 'A' | 'B' | 'C'
  quantidade: number
  status: StatusEstoque
}

export interface ConfiguracaoPallets {
  total: number
  minimoLivre: number
  atualizadoPor: string
  atualizadoEm: string
}

export type StatusRecebimento =
  | 'agendado'
  | 'na-doca'
  | 'em-conferencia'
  | 'divergencia'
  | 'concluido'

export interface ItemRecebimento {
  skuCodigo: string
  descricao: string
  esperado: number
  contado: number | null
  lote?: string
  validade?: string
  conferido: boolean
  ocorrencia?: Ocorrencia
}

export interface Recebimento {
  id: string
  doca: string
  fornecedor: string
  documento: string
  tipoDoc: 'NF-e' | 'ASN'
  ownerId: string
  vertente: Vertente
  data?: string
  janela?: string
  responsavel?: string
  placa?: string
  ordemDoca?: number
  ordemExecucaoAtual?: number
  eta: string
  status: StatusRecebimento
  itens: ItemRecebimento[]
}

export type StatusDocumentoEtiquetagem = 'aguardando' | 'aprovado' | 'bloqueado'
export type TipoEmbalagemSku = 'unidade' | 'caixa-matriz'

export interface SkuEtiquetagem {
  skuCodigo: string
  tipoEmbalagem: TipoEmbalagemSku
  unidadesPorVolume: number
  pesoUnitarioKg: number
  volumesDocumento?: number
}

export interface SkuControle {
  id: string
  ownerId: string
  empresaId: string
  codigo: string
  descricao: string
  tipo: TipoEmbalagemSku
  skuUnidadeConteudo: string | null
  unidadesPorCaixa: number | null
  comprimentoCm: number
  larguraCm: number
  alturaCm: number
  cubagemM3: number
  criadoPor: string
  criadoEm: string
  atualizadoPor: string
  atualizadoEm: string
}

export type SkuControleInput = Omit<
  SkuControle,
  'id' | 'criadoPor' | 'criadoEm' | 'atualizadoPor' | 'atualizadoEm'
>

export interface SkuControleAlteracao {
  campo: string
  antes: string
  depois: string
}

export interface SkuControleHistorico {
  id: string
  skuId: string
  skuCodigo: string
  acao: 'criacao' | 'edicao'
  usuario: string
  quando: string
  resumo: string
  alteracoes: SkuControleAlteracao[]
}

export interface SkuPendenteRecebimento {
  id: string
  recebimentoId: string
  skuCodigo: string
  descricao: string
  ownerId: string
  doca: string
  eta: string
  data?: string
  janela?: string
  documento: string
  tipoDoc: Recebimento['tipoDoc']
  fornecedor: string
  prioridade: 'maxima'
  etapaBloqueio: 'Conferência de documentos'
  ordemExecucaoBloqueada: 3
}

export interface ViagemEtiquetagem {
  id: string
  recebimentoId: string
  ordemServicoId: string
  ordemExecucaoAtual: number
  documentoStatus: StatusDocumentoEtiquetagem
  cte: string
  nf: string
  origemSigla: string
  destinoSigla: string
  embarcador: string
  destinatario: string
  endereco: string
  itens: SkuEtiquetagem[]
}

export interface Ocorrencia {
  tipo: 'falta' | 'sobra' | 'item-trocado' | 'avaria'
  quantidadeReal: number
  observacao: string
  foto: boolean
}

export type StatusTarefa = 'a-fazer' | 'fazendo' | 'feito' | 'problema'
export type TipoTarefa =
  | 'recebimento'
  | 'putaway'
  | 'picking'
  | 'packing'
  | 'carregamento'
  | 'reabastecimento'
  | 'contagem'
  | 'recontagem'
  | 'divergencia'
  | 'cross-docking'
export type ReferenciaTarefa =
  | 'recebimento'
  | 'pedido'
  | 'romaneio'
  | 'onda'
  | 'endereco'
  | 'contagem'
  | 'manual'

export interface Tarefa {
  id: string
  tipo: TipoTarefa
  prioridade: 'alta' | 'media' | 'baixa'
  operador: string | null
  status: StatusTarefa
  origem: string
  destino: string
  sku: string
  descricao: string
  quantidade: number
  lote?: string | null
  sla?: string
  ondaId?: string
  etapa?: string
  referenciaTipo?: ReferenciaTarefa
  referenciaId?: string
  problema?: string
}

export interface Onda {
  id: string
  estrategia: 'discreto' | 'batch' | 'wave' | 'zona' | 'cluster'
  pedidos: number
  linhas: number
  itens: number
  status: 'planejada' | 'liberada' | 'em-separacao' | 'concluida'
  corte: string
  progresso: number
  coletaId?: string
  rota?: string
  transportadora?: string
  doca?: string
}

export type StatusPedido =
  | 'aguardando'
  | 'em-separacao'
  | 'em-packing'
  | 'expedido'

export interface ItemPedido {
  skuCodigo: string
  descricao: string
  quantidade: number
  conferido: number
}

export interface Pedido {
  id: string
  cliente: string
  ownerId: string
  transportadora: string
  rota: string
  status: StatusPedido
  itens: ItemPedido[]
  peso: number
  volumes: number
  prazo: string
  coletaId?: string
  ondaId?: string
  reservaStatus?: 'pendente' | 'reservado' | 'parcial' | 'bloqueado'
}

export interface ContagemItem {
  id: string
  endereco: string
  skuCodigo: string
  descricao: string
  sistemico: number
  contado: number | null
  recontagem: number | null
  status: 'pendente' | 'ok' | 'divergente' | 'aguardando-aprovacao' | 'ajustado'
  ownerId: string
}

export interface FaturaServico {
  ownerId: string
  armazenagem: number
  movimentacaoEntrada: number
  movimentacaoSaida: number
  pickingLinhas: number
  vas: number
  paletesDia: number
  total: number
}

export interface Integracao {
  id: string
  nome: string
  tipo: 'ERP' | 'TMS' | 'Marketplace' | 'EDI' | 'Transportadora'
  status: 'conectado' | 'erro' | 'sincronizando'
  ultimaSync: string
  registros: number
}

export interface RomaneioVolume {
  pedido: string
  volumes: number
  peso: number
  carregado: boolean
  codigoVolume?: string
  lacre?: string
  staging?: string
}
export interface Romaneio {
  id: string
  transportadora: string
  rota: string
  veiculo: string
  volumes: RomaneioVolume[]
  status: 'montando' | 'em-carregamento' | 'despachado'
  coletaId?: string
  doca?: string
  janela?: string
  placa?: string
}

export type StatusColetaTms =
  | 'recebida'
  | 'validando'
  | 'em-separacao'
  | 'em-packing'
  | 'pronta-doca'
  | 'carregando'
  | 'despachada'
  | 'risco'

export interface ColetaTms {
  id: string
  viagemIdTms: string
  cotacaoId: string
  transportadora: string
  rota: string
  veiculo: string
  placa: string
  tipoVeiculo: string
  capacidadeKg: number
  capacidadeVolumes: number
  doca: string
  janelaColeta: string
  cutOff: string
  status: StatusColetaTms
  risco: 'baixo' | 'medio' | 'alto'
  pedidos: string[]
  ondaId: string
  romaneioId: string
  volumesPrevistos: number
  volumesProntos: number
  pesoPrevisto: number
  pesoPronto: number
  progressoPicking: number
  progressoPacking: number
  progressoCarregamento: number
  ultimaMensagemTms: string
}
