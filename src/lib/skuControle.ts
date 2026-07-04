import type { Recebimento, SkuControle, SkuPendenteRecebimento, Tarefa } from './types'

export const ORDEM_CONFERENCIA_DOCUMENTOS = 3
export const ETAPA_CONFERENCIA_DOCUMENTOS = 'Conferência de documentos' as const
export const ORDEM_MONTAGEM_PALLETS = 6
export const ETAPA_MONTAGEM_PALLETS = 'Montagem de pallets' as const
export const ORDEM_CLASSIFICACAO_DESTINO_ENDERECAMENTO = 7
export const ETAPA_CLASSIFICACAO_DESTINO_ENDERECAMENTO = 'Classificação de destino + endereçamento' as const

const normalizarSku = (codigo: string) => codigo.trim().toUpperCase()

export const EMPRESA_TODAS_SKU = 'emp-todas'

export function filtrarSkusControlePorEmpresa(
  skusControle: SkuControle[],
  empresaId: string,
) {
  if (!empresaId || empresaId === EMPRESA_TODAS_SKU) return skusControle
  return skusControle.filter((sku) => sku.empresaId === empresaId)
}

export function recebimentoLiberadoParaPutaway(recebimento: Pick<Recebimento, 'ordemExecucaoAtual'>) {
  return (recebimento.ordemExecucaoAtual ?? 0) >= ORDEM_CLASSIFICACAO_DESTINO_ENDERECAMENTO
}

export function tarefaPutawayLiberada(tarefa: Tarefa, recebimentos: Recebimento[]) {
  if (tarefa.tipo !== 'putaway') return true
  if (tarefa.referenciaTipo !== 'recebimento' || !tarefa.referenciaId) return true

  const recebimento = recebimentos.find((rec) => rec.id === tarefa.referenciaId)
  return !!recebimento && recebimentoLiberadoParaPutaway(recebimento)
}

export function skuExisteNoControle(
  skusControle: SkuControle[],
  ownerId: string,
  skuCodigo: string,
) {
  const codigo = normalizarSku(skuCodigo)
  return skusControle.some(
    (sku) => sku.codigo.toUpperCase() === codigo && sku.ownerId === ownerId,
  )
}

export function skusPendentesDoRecebimento(
  recebimento: Recebimento,
  skusControle: SkuControle[],
): SkuPendenteRecebimento[] {
  if (recebimento.status === 'concluido') return []

  return recebimento.itens
    .filter((item) => !skuExisteNoControle(skusControle, recebimento.ownerId, item.skuCodigo))
    .map((item) => ({
      id: `${recebimento.id}-${normalizarSku(item.skuCodigo)}`,
      recebimentoId: recebimento.id,
      skuCodigo: normalizarSku(item.skuCodigo),
      descricao: item.descricao,
      ownerId: recebimento.ownerId,
      doca: recebimento.doca,
      eta: recebimento.eta,
      data: recebimento.data,
      janela: recebimento.janela,
      documento: recebimento.documento,
      tipoDoc: recebimento.tipoDoc,
      fornecedor: recebimento.fornecedor,
      prioridade: 'maxima',
      etapaBloqueio: ETAPA_CONFERENCIA_DOCUMENTOS,
      ordemExecucaoBloqueada: ORDEM_CONFERENCIA_DOCUMENTOS,
    }))
}

export function skusPendentesRecebimentos(
  recebimentos: Recebimento[],
  skusControle: SkuControle[],
) {
  return recebimentos.flatMap((recebimento) =>
    skusPendentesDoRecebimento(recebimento, skusControle),
  )
}

export function resumoSkusPendentes(pendencias: SkuPendenteRecebimento[]) {
  const codigos = [...new Set(pendencias.map((pendencia) => pendencia.skuCodigo))]
  if (codigos.length === 0) return ''
  if (codigos.length === 1) return `SKU ${codigos[0]} não existe no Controle SKU`
  return `SKUs ${codigos.slice(0, 3).join(', ')}${codigos.length > 3 ? ` +${codigos.length - 3}` : ''} não existem no Controle SKU`
}
