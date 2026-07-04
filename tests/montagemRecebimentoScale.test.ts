import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { calcularEtiquetas, resumoSkus } from '../src/lib/etiquetas.ts'
import type { Recebimento, ViagemEtiquetagem } from '../src/lib/types.ts'

const mockSource = readFileSync(new URL('../src/lib/mock.ts', import.meta.url), 'utf8')

function trechoEntre(origem: string, inicio: string, fim: string) {
  const start = origem.indexOf(inicio)
  assert.notEqual(start, -1, `trecho ${inicio} deve existir no seed`)
  const end = origem.indexOf(fim, start)
  assert.notEqual(end, -1, `trecho ${fim} deve existir depois de ${inicio}`)
  return origem.slice(start, end)
}

const recebimentoSource = trechoEntre(mockSource, "id: 'REC-2041'", "id: 'REC-2042'")
const viagemSource = trechoEntre(mockSource, "id: 'VIA-IN-7804'", "id: 'VIA-IN-7805'")

const quantidadesEsperadas = new Map([
  ['SKU-10241', 720],
  ['SKU-10242', 1200],
  ['SKU-10243', 2100],
  ['SKU-10244', 480],
])

const descricaoPorSku = new Map([
  ['SKU-10241', 'Fone Bluetooth Pulse X'],
  ['SKU-10242', 'Carregador Turbo 30W'],
  ['SKU-10243', 'Cabo USB-C 2m'],
  ['SKU-10244', 'Power Bank 10000mAh'],
])

const unidadesPorVolume = new Map([
  ['SKU-10241', 1],
  ['SKU-10242', 10],
  ['SKU-10243', 25],
  ['SKU-10244', 4],
])

const tipoEmbalagemPorSku = new Map([
  ['SKU-10241', 'unidade' as const],
  ['SKU-10242', 'caixa-matriz' as const],
  ['SKU-10243', 'caixa-matriz' as const],
  ['SKU-10244', 'caixa-matriz' as const],
])

const pesoPorSku = new Map([
  ['SKU-10241', 0.16],
  ['SKU-10242', 0.11],
  ['SKU-10243', 0.04],
  ['SKU-10244', 0.25],
])

const quantidadeDoSeed = (skuCodigo: string) => {
  const match = recebimentoSource.match(new RegExp(`skuCodigo: '${skuCodigo}'[\\s\\S]*?esperado: (\\d+)`))
  assert.ok(match, `${skuCodigo} deve existir no recebimento REC-2041`)
  return Number(match[1])
}

const volumesDocumentoDoSeed = (skuCodigo: string) => {
  const match = viagemSource.match(new RegExp(`skuCodigo: '${skuCodigo}'[\\s\\S]*?volumesDocumento: (\\d+)`))
  assert.ok(match, `${skuCodigo} deve existir na viagem VIA-IN-7804`)
  return Number(match[1])
}

const recebimento: Recebimento = {
  id: 'REC-2041',
  doca: 'Doca 03',
  fornecedor: 'Distribuidora Andrade',
  documento: 'NF-e 88.214',
  tipoDoc: 'NF-e',
  ownerId: 'own-nano',
  vertente: 'ecommerce',
  eta: '13:10',
  status: 'em-conferencia',
  itens: [...quantidadesEsperadas.keys()].map((skuCodigo) => ({
    skuCodigo,
    descricao: descricaoPorSku.get(skuCodigo)!,
    esperado: quantidadeDoSeed(skuCodigo),
    contado: null,
    conferido: false,
  })),
}

const viagem: ViagemEtiquetagem = {
  id: 'VIA-IN-7804',
  recebimentoId: 'REC-2041',
  ordemServicoId: 'OS-9101',
  ordemExecucaoAtual: 4,
  documentoStatus: 'aprovado',
  cte: 'CT-e 35260688214004',
  nf: 'NF-e 88.214',
  origemSigla: 'SC',
  destinoSigla: 'SP',
  embarcador: 'Distribuidora Andrade',
  destinatario: 'NanoTech Eletronicos - Recebimento Cajamar',
  endereco: 'Av. Tambore, 1512 - Barueri/SP',
  itens: [...quantidadesEsperadas.keys()].map((skuCodigo) => ({
    skuCodigo,
    tipoEmbalagem: tipoEmbalagemPorSku.get(skuCodigo)!,
    unidadesPorVolume: unidadesPorVolume.get(skuCodigo)!,
    pesoUnitarioKg: pesoPorSku.get(skuCodigo)!,
    volumesDocumento: volumesDocumentoDoSeed(skuCodigo),
  })),
}

for (const item of recebimento.itens) {
  assert.equal(
    item.esperado,
    quantidadesEsperadas.get(item.skuCodigo),
    `${item.skuCodigo} deve estar multiplicado em 6x no recebimento REC-2041`,
  )
}

const volumesPorSku = new Map(
  resumoSkus(viagem, recebimento).map((resumo) => [resumo.item.skuCodigo, resumo.volumesCalculados]),
)

for (const config of viagem.itens) {
  assert.equal(
    config.volumesDocumento,
    volumesPorSku.get(config.skuCodigo),
    `${config.skuCodigo} deve manter volumes do documento alinhados ao recebimento 6x`,
  )
}

assert.equal(
  calcularEtiquetas(viagem, recebimento, '2026-06-26T13:10:00.000').length,
  1044,
  'REC-2041 em 6x deve gerar 1044 etiquetas para montagem',
)
