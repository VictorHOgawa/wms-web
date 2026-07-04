export function selecionarMontagemPorClique<
  T extends { row: { viagem: { id: string }; recebimento?: { id: string } | null } },
>(
  montagens: readonly T[],
  selecionadaId: string,
) {
  if (!selecionadaId) return null
  return montagens.find((item) => item.row.recebimento?.id === selecionadaId || item.row.viagem.id === selecionadaId) ?? null
}

export function removerRequisicoesDoRecebimento<T>(
  requisicoesPorRecebimento: Record<string, T[]>,
  recebimentoId: string,
) {
  const proximas = { ...requisicoesPorRecebimento }
  delete proximas[recebimentoId]
  return proximas
}

export function reordenarIdsPallets(
  ids: readonly string[],
  palletId: string,
  direcao: 'up' | 'down',
) {
  const index = ids.indexOf(palletId)
  if (index === -1) return [...ids]

  const destino = direcao === 'up' ? index - 1 : index + 1
  if (destino < 0 || destino >= ids.length) return [...ids]

  const proximos = [...ids]
  const atual = proximos[index]
  proximos[index] = proximos[destino]
  proximos[destino] = atual
  return proximos
}

export function aplicarOrdemManualPallets<T extends { id: string }>(
  pallets: readonly T[],
  ordemManual: readonly string[],
) {
  if (!ordemManual.length) return [...pallets]

  const porId = new Map(pallets.map((pallet) => [pallet.id, pallet]))
  const ordenados = ordemManual
    .map((id) => porId.get(id))
    .filter((pallet): pallet is T => !!pallet)
  const ordenadosIds = new Set(ordenados.map((pallet) => pallet.id))
  const restantes = pallets.filter((pallet) => !ordenadosIds.has(pallet.id))

  return [...ordenados, ...restantes]
}
