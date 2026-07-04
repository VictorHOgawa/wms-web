import type { EtiquetaVolume } from './etiquetas'

export type TipoDivergenciaEtiqueta = 'faltou-etiqueta' | 'sobrou-etiqueta'
export type DestinoDivergenciaEtiqueta = 'administrativo' | 'devolucao'

export interface ItemDivergenciaEtiqueta {
  skuCodigo: string
  descricao: string
  quantidade: number
}

export interface EtiquetaDivergente extends EtiquetaVolume {
  divergenciaId: string
  tipoDivergencia: TipoDivergenciaEtiqueta
  tituloDivergencia: 'DEVOLUCAO'
  instrucao: string
}

export interface RegistroDivergenciaEtiqueta {
  id: string
  viagemId: string
  recebimentoId: string
  usuario: string
  quandoIso: string
  tipo: TipoDivergenciaEtiqueta
  itens: ItemDivergenciaEtiqueta[]
  etiquetasCanceladasIds: string[]
  etiquetasGeradas: EtiquetaDivergente[]
  envioAdministrativo: {
    status: 'enviado-mock'
    destino: 'Administrativo / Tratativa fiscal'
    recebimentoId: string
    documento: string
    fornecedor: string
    owner: string
  }
}

export const tipoDivergenciaMeta = {
  'sobrou-etiqueta': {
    label: 'Sobrou etiqueta',
    destino: 'administrativo',
    instrucao:
      'Produto a menos: registrar a sobra de etiqueta, enviar ao administrativo e seguir com a carga valida.',
  },
  'faltou-etiqueta': {
    label: 'Faltou etiqueta',
    destino: 'devolucao',
    instrucao:
      'Produto excedente: aplicar etiqueta DEVOLUCAO e separar em pallet exclusivo de devolucao.',
  },
} as const satisfies Record<
  TipoDivergenciaEtiqueta,
  { label: string; destino: DestinoDivergenciaEtiqueta; instrucao: string }
>

export function destinoDaDivergencia(tipo: TipoDivergenciaEtiqueta): DestinoDivergenciaEtiqueta {
  return tipoDivergenciaMeta[tipo].destino
}

export function deveGerarEtiquetaDivergente(tipo: TipoDivergenciaEtiqueta) {
  return destinoDaDivergencia(tipo) === 'devolucao'
}

export function tituloEtiquetaDivergente(tipo: TipoDivergenciaEtiqueta) {
  return deveGerarEtiquetaDivergente(tipo) ? 'DEVOLUCAO' : null
}

export function selecionarEtiquetasCanceladasPorSobra(
  etiquetas: EtiquetaVolume[],
  itens: ItemDivergenciaEtiqueta[],
) {
  const canceladas: string[] = []

  itens.forEach((item) => {
    const candidatas = etiquetas
      .filter((etiqueta) => etiqueta.skuCodigo === item.skuCodigo)
      .filter((etiqueta) => !canceladas.includes(etiqueta.id))
      .slice(0, item.quantidade)

    canceladas.push(...candidatas.map((etiqueta) => etiqueta.id))
  })

  return canceladas
}
