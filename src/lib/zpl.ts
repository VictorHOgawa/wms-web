export interface ZplPrinterConfig {
  host: string
  port: number
  dpi: 203 | 300
  widthMm: number
  heightMm: number
}

export interface ZplEtiquetaInput {
  id: string
  viagemId: string
  skuCodigo: string
  descricao: string
  sequencia: string
  sequenciaSku: string
  quantidadeNoVolume: number
  emissaoIso: string
  origemDestino: string
  embarcador: string
  nf: string
  cte: string
  kg: string
  destinatario: string
  endereco: string
}

const mmToDots = (mm: number, dpi: number) => Math.round((mm / 25.4) * dpi)

export function normalizarTextoZpl(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\^~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function dataZpl(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR')
}

function codigoPrincipalZpl(id: string) {
  const numerico = id.replace(/\D/g, '')
  if (numerico.length >= 5) return numerico.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return id
}

export function gerarZplEtiqueta(etiqueta: ZplEtiquetaInput, config: ZplPrinterConfig) {
  const width = mmToDots(config.widthMm, config.dpi)
  const height = mmToDots(config.heightMm, config.dpi)
  const dot = (mm: number) => mmToDots(mm, config.dpi)
  const [origem = '', destino = ''] = etiqueta.origemDestino.split('/')
  const leftStrip = dot(17)
  const rightStrip = dot(10)
  const centerX = leftStrip + dot(1.2)
  const centerWidth = Math.max(dot(36), width - leftStrip - rightStrip - dot(2.4))
  const rightX = width - rightStrip
  const barcodeHeight = dot(28.5)
  const codigoPrincipal = codigoPrincipalZpl(etiqueta.id)

  return [
    '^XA',
    '^CI28',
    `^PW${width}`,
    `^LL${height}`,
    '^LH0,0',
    `^FO0,0^GB${width},${height},2^FS`,
    `^FO${leftStrip},0^GB1,${height},1^FS`,
    `^FO${rightX},0^GB${rightStrip},${height},${rightStrip}^FS`,
    `^FO${dot(2.2)},${dot(35)}^BY2,2,${barcodeHeight}^BCR,${barcodeHeight},N,N,N^FD${normalizarTextoZpl(etiqueta.id)}^FS`,
    `^FO${dot(1)},${height - dot(3.5)}^A0N,${dot(1.9)},${dot(1.9)}^FB${leftStrip - dot(2)},1,0,C^FD${normalizarTextoZpl(etiqueta.id)}^FS`,
    `^FO${centerX},${dot(0.9)}^A0N,${dot(1.55)},${dot(1.55)}^FB${dot(22)},1,0,L^FD${normalizarTextoZpl(etiqueta.nf)}^FS`,
    `^FO${centerX + dot(26)},${dot(0.8)}^A0N,${dot(1.8)},${dot(1.8)}^FD${dataZpl(etiqueta.emissaoIso)}^FS`,
    `^FO${centerX},${dot(4.5)}^A0N,${dot(7.2)},${dot(7.2)}^FDD-${normalizarTextoZpl(destino)}^FS`,
    `^FO${centerX + dot(23)},${dot(4.5)}^A0N,${dot(7.2)},${dot(7.2)}^FDO-${normalizarTextoZpl(origem)}^FS`,
    `^FO${centerX},${dot(12.7)}^A0N,${dot(1.65)},${dot(1.65)}^FB${centerWidth - dot(14)},1,0,L^FD${normalizarTextoZpl(etiqueta.embarcador)}^FS`,
    `^FO${centerX + dot(28.5)},${dot(12.7)}^A0N,${dot(1.35)},${dot(1.35)}^FDReimpressao: N^FS`,
    `^FO${centerX},${dot(15.4)}^A0N,${dot(4.7)},${dot(4.7)}^FB${dot(28)},1,0,L^FD${normalizarTextoZpl(codigoPrincipal)}^FS`,
    `^FO${centerX + dot(29.5)},${dot(15.7)}^A0N,${dot(3.8)},${dot(3.8)}^FD${normalizarTextoZpl(etiqueta.sequencia)}^FS`,
    `^FO${centerX},${dot(21.2)}^GB${centerWidth},1,1^FS`,
    `^FO${centerX},${dot(22.4)}^A0N,${dot(1.75)},${dot(1.75)}^FB${centerWidth - dot(13)},1,0,L^FD${normalizarTextoZpl(etiqueta.cte)}^FS`,
    `^FO${centerX},${dot(25.1)}^A0N,${dot(1.45)},${dot(1.45)}^FB${centerWidth - dot(13)},1,0,L^FD${normalizarTextoZpl(etiqueta.skuCodigo)}^FS`,
    `^FO${centerX + dot(31)},${dot(22.3)}^A0N,${dot(1.35)},${dot(1.35)}^FDKg.Calc.^FS`,
    `^FO${centerX + dot(31)},${dot(24.7)}^A0N,${dot(1.7)},${dot(1.7)}^FD${normalizarTextoZpl(etiqueta.kg.replace(/\s?kg$/, ''))}^FS`,
    `^FO${centerX},${dot(27.3)}^GB${centerWidth},1,1^FS`,
    `^FO${centerX},${dot(28.5)}^A0N,${dot(1.85)},${dot(1.85)}^FB${centerWidth},1,0,L^FD${normalizarTextoZpl(etiqueta.destinatario)}^FS`,
    `^FO${centerX},${dot(31.2)}^A0N,${dot(1.45)},${dot(1.45)}^FB${centerWidth},2,1,L^FD${normalizarTextoZpl(etiqueta.endereco)}^FS`,
    `^FO${centerX},${dot(36.5)}^A0N,${dot(1.35)},${dot(1.35)}^FB${centerWidth},1,0,L^FD${normalizarTextoZpl(`${etiqueta.skuCodigo} - ${etiqueta.quantidadeNoVolume} un - ${etiqueta.sequenciaSku}`)}^FS`,
    `^FO${rightX + dot(2.1)},${dot(6)}^GB${dot(5.5)},${dot(5.5)},1,W^FS`,
    `^FO${rightX + dot(1.7)},${height - dot(5)}^A0R,${dot(3.7)},${dot(3.7)}^FR^FDINTEGRA^FS`,
    `^FO${rightX + dot(5.7)},${height - dot(13)}^A0R,${dot(1.35)},${dot(1.35)}^FR^FDLOGISTICA^FS`,
    '^XZ',
  ].join('\n')
}

export function gerarZplLote(etiquetas: ZplEtiquetaInput[], config: ZplPrinterConfig) {
  return etiquetas.map((etiqueta) => gerarZplEtiqueta(etiqueta, config)).join('\n')
}

// ── Etiqueta IDENTITÁRIA (WmsEtiqueta) ──────────────────────────────────────
// Layout próprio para o volume do WMS real: o que identifica o volume é o
// CÓDIGO ÚNICO (Code128) — é ele que o coletor bipa na montagem de pallet,
// conferência e carregamento. O ZplEtiquetaInput acima é o layout antigo de
// etiqueta de transporte (viagem/NF/CT-e) e continua válido para aquele caso.

export interface ZplIdentidadeInput {
  /** Código único do volume (WmsEtiqueta.codigo) — vira o código de barras. */
  codigo: string
  skuCode: string
  descricao: string
  /** Nome do cliente (owner) da carga. */
  cliente: string
  /** CAIXA | UNIDADE */
  tipoVolume: string
  /** Posição no lote (1-based) e total, para conferência visual. */
  seq: number
  total: number
}

export function gerarZplIdentidade(et: ZplIdentidadeInput, config: ZplPrinterConfig) {
  const width = mmToDots(config.widthMm, config.dpi)
  const height = mmToDots(config.heightMm, config.dpi)
  const dot = (mm: number) => mmToDots(mm, config.dpi)
  const margem = dot(3)
  const larguraUtil = width - margem * 2
  const barcodeHeight = dot(Math.min(22, config.heightMm * 0.38))
  const volume = et.tipoVolume === 'CAIXA' ? 'CAIXA MESTRE' : 'UNIDADE'

  return [
    '^XA',
    '^CI28',
    `^PW${width}`,
    `^LL${height}`,
    '^LH0,0',
    `^FO0,0^GB${width},${height},2^FS`,
    // Cliente + volume/seq no topo
    `^FO${margem},${dot(2)}^A0N,${dot(2.6)},${dot(2.6)}^FB${larguraUtil - dot(24)},1,0,L^FD${normalizarTextoZpl(et.cliente)}^FS`,
    `^FO${width - margem - dot(24)},${dot(2)}^A0N,${dot(2.6)},${dot(2.6)}^FB${dot(24)},1,0,R^FD${volume} ${et.seq}/${et.total}^FS`,
    `^FO${margem},${dot(6)}^GB${larguraUtil},1,1^FS`,
    // SKU em destaque + descrição
    `^FO${margem},${dot(7.5)}^A0N,${dot(4.4)},${dot(4.4)}^FB${larguraUtil},1,0,L^FD${normalizarTextoZpl(et.skuCode)}^FS`,
    `^FO${margem},${dot(12.5)}^A0N,${dot(2.2)},${dot(2.2)}^FB${larguraUtil},2,0,L^FD${normalizarTextoZpl(et.descricao)}^FS`,
    // Código de barras central (Code128 do código único) + código legível
    `^FO${margem},${dot(18.5)}^BY2,2,${barcodeHeight}^BCN,${barcodeHeight},N,N,N^FD${normalizarTextoZpl(et.codigo)}^FS`,
    `^FO${margem},${height - dot(4.5)}^A0N,${dot(2.4)},${dot(2.4)}^FB${larguraUtil},1,0,C^FD${normalizarTextoZpl(et.codigo)}^FS`,
    '^XZ',
  ].join('\n')
}

export function gerarZplIdentidadesLote(itens: ZplIdentidadeInput[], config: ZplPrinterConfig) {
  return itens.map((et) => gerarZplIdentidade(et, config)).join('\n')
}
