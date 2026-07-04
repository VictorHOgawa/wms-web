import type {
  ItemRecebimento,
  Recebimento,
  SkuEtiquetagem,
  TipoEmbalagemSku,
  ViagemEtiquetagem,
} from './types'

export interface ViagemComRecebimento {
  viagem: ViagemEtiquetagem
  recebimento: Recebimento | null
}

export interface EtiquetaVolume {
  id: string
  viagemId: string
  recebimentoId: string
  skuCodigo: string
  descricao: string
  tipoEmbalagem: TipoEmbalagemSku
  quantidadeNoVolume: number
  sequencia: string
  sequenciaSku: string
  emissaoIso: string
  origemDestino: string
  embarcador: string
  nf: string
  cte: string
  kg: string
  kgValor: number
  destinatario: string
  endereco: string
}

export interface ResumoSku {
  item: ItemRecebimento
  config: SkuEtiquetagem | null
  quantidadeBase: number
  volumesCalculados: number
  kgTotal: string
  divergenteDocumento: boolean
}

export function isoLocal(data = new Date()) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function formatarData(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('pt-BR')
}

export function formatarDataHora(iso: string) {
  const data = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`)
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatarKg(valor: number) {
  return `${valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kg`
}

function hashTexto(texto: string) {
  let hash = 0
  for (let i = 0; i < texto.length; i += 1) {
    hash = (hash * 31 + texto.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function gerarEtiquetaId(seed: string, index: number) {
  const hash = hashTexto(`${seed}-${index}`)
  const letraA = String.fromCharCode(65 + (hash % 26))
  const letraB = String.fromCharCode(65 + (Math.floor(hash / 26) % 26))
  const numero = String((hash + index * 9973) % 100000).padStart(5, '0')
  return `${letraA}${letraB}${numero}`
}

export function configDoSku(viagem: ViagemEtiquetagem, skuCodigo: string) {
  return viagem.itens.find((item) => item.skuCodigo === skuCodigo) ?? null
}

export function quantidadeBase(item: ItemRecebimento) {
  return item.contado ?? item.esperado
}

export function resumoSkus(viagem: ViagemEtiquetagem, recebimento: Recebimento): ResumoSku[] {
  return recebimento.itens.map((item) => {
    const config = configDoSku(viagem, item.skuCodigo)
    const base = quantidadeBase(item)
    const volumesCalculados = config ? Math.ceil(base / config.unidadesPorVolume) : 0
    return {
      item,
      config,
      quantidadeBase: base,
      volumesCalculados,
      kgTotal: config ? formatarKg(base * config.pesoUnitarioKg) : formatarKg(0),
      divergenteDocumento: !!config?.volumesDocumento && config.volumesDocumento !== volumesCalculados,
    }
  })
}

export function calcularEtiquetas(
  viagem: ViagemEtiquetagem,
  recebimento: Recebimento,
  emissaoIso: string,
) {
  const base = recebimento.itens.flatMap((item) => {
    const config = configDoSku(viagem, item.skuCodigo)
    if (!config) return []
    const quantidade = quantidadeBase(item)
    const totalSku = Math.ceil(quantidade / config.unidadesPorVolume)
    return Array.from({ length: totalSku }, (_, index) => {
      const volumeNumero = index + 1
      const restante = quantidade - index * config.unidadesPorVolume
      const quantidadeNoVolume = Math.min(config.unidadesPorVolume, restante)
      const kgValor = quantidadeNoVolume * config.pesoUnitarioKg
      return {
        viagemId: viagem.id,
        recebimentoId: recebimento.id,
        skuCodigo: item.skuCodigo,
        descricao: item.descricao,
        tipoEmbalagem: config.tipoEmbalagem,
        quantidadeNoVolume,
        sequenciaSku: `${volumeNumero}/${totalSku}`,
        emissaoIso,
        origemDestino: `${viagem.origemSigla}/${viagem.destinoSigla}`,
        embarcador: viagem.embarcador,
        nf: viagem.nf,
        cte: viagem.cte,
        kg: formatarKg(kgValor),
        kgValor,
        destinatario: viagem.destinatario,
        endereco: viagem.endereco,
      }
    })
  })

  const usados = new Set<string>()
  return base.map((etiqueta, index): EtiquetaVolume => {
    let tentativa = 0
    let id = gerarEtiquetaId(`${etiqueta.viagemId}-${etiqueta.skuCodigo}-${etiqueta.sequenciaSku}`, index)
    while (usados.has(id)) {
      tentativa += 1
      id = gerarEtiquetaId(`${etiqueta.viagemId}-${etiqueta.skuCodigo}-${etiqueta.sequenciaSku}-${tentativa}`, index)
    }
    usados.add(id)
    return {
      ...etiqueta,
      id,
      sequencia: `${index + 1}/${base.length}`,
    }
  })
}

export function descricaoSkuRecebimento(recebimento: Recebimento, skuCodigo: string) {
  return recebimento.itens.find((item) => item.skuCodigo === skuCodigo)?.descricao ?? 'SKU informado manualmente'
}

export function emissaoAutomaticaIso(row: ViagemComRecebimento) {
  const data = row.recebimento?.data ?? isoLocal()
  const hora = row.recebimento?.eta && /^\d{2}:\d{2}$/.test(row.recebimento.eta)
    ? row.recebimento.eta
    : '00:00'
  return `${data}T${hora}:00.000`
}

export function emissaoAtualIso(row: ViagemComRecebimento, historico: Array<{ quandoIso: string }>) {
  return historico[0]?.quandoIso ?? emissaoAutomaticaIso(row)
}
