import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { calcularEtiquetas } from '../src/lib/etiquetas.ts'
import { planejarBucketsPallets } from '../src/lib/palletPlanner.ts'
import type { Recebimento, TipoEmbalagemSku, ViagemEtiquetagem } from '../src/lib/types.ts'

const mockSource = readFileSync(new URL('../src/lib/mock.ts', import.meta.url), 'utf8')

const RECEBIMENTO_ID = 'REC-2070'
const VIAGEM_ID = 'VIA-IN-7810'

function trechoEntre(origem: string, inicio: string, fim: string) {
  const start = origem.indexOf(inicio)
  assert.notEqual(start, -1, `trecho ${inicio} deve existir no seed`)
  const end = origem.indexOf(fim, start)
  assert.notEqual(end, -1, `trecho ${fim} deve existir depois de ${inicio}`)
  return origem.slice(start, end)
}

const recebimentoSource = trechoEntre(mockSource, `id: '${RECEBIMENTO_ID}'`, "id: 'REC-2060'")
const viagemSource = trechoEntre(mockSource, `id: '${VIAGEM_ID}'`, "id: 'VIA-IN-7807'")

const skus = [
  {
    skuCodigo: 'SKU-10243',
    descricao: 'Cabo USB-C 2m',
    esperado: 5750,
    tipoEmbalagem: 'caixa-matriz' as TipoEmbalagemSku,
    unidadesPorVolume: 25,
    pesoUnitarioKg: 0.04,
    volumesDocumento: 230,
    dimensoesM: { comprimentoM: 0.32, larguraM: 0.22, alturaM: 0.18 },
  },
  {
    skuCodigo: 'SKU-10242',
    descricao: 'Carregador Turbo 30W',
    esperado: 1400,
    tipoEmbalagem: 'caixa-matriz' as TipoEmbalagemSku,
    unidadesPorVolume: 10,
    pesoUnitarioKg: 0.11,
    volumesDocumento: 140,
    dimensoesM: { comprimentoM: 0.26, larguraM: 0.18, alturaM: 0.14 },
  },
]

const numeroDoSeed = (source: string, skuCodigo: string, campo: string) => {
  const match = source.match(new RegExp(`skuCodigo: '${skuCodigo}'[\\s\\S]*?${campo}: (\\d+)`))
  assert.ok(match, `${skuCodigo} deve declarar ${campo} no seed`)
  return Number(match[1])
}

assert.ok(
  recebimentoSource.includes('ordemExecucaoAtual: 6'),
  `${RECEBIMENTO_ID} deve entrar direto na etapa 6 da montagem`,
)

assert.ok(
  viagemSource.includes("documentoStatus: 'aprovado'"),
  `${VIAGEM_ID} deve estar aprovado para a montagem calcular pallets`,
)

const recebimento: Recebimento = {
  id: RECEBIMENTO_ID,
  doca: 'Doca 07',
  fornecedor: 'Carga Teste Montagem',
  documento: 'ASN 5700',
  tipoDoc: 'ASN',
  ownerId: 'own-nano',
  vertente: 'ecommerce',
  eta: '10:35',
  status: 'em-conferencia',
  itens: skus.map((sku) => ({
    skuCodigo: sku.skuCodigo,
    descricao: sku.descricao,
    esperado: numeroDoSeed(recebimentoSource, sku.skuCodigo, 'esperado'),
    contado: numeroDoSeed(recebimentoSource, sku.skuCodigo, 'contado'),
    conferido: true,
  })),
}

const viagem: ViagemEtiquetagem = {
  id: VIAGEM_ID,
  recebimentoId: RECEBIMENTO_ID,
  ordemServicoId: 'OS-9113',
  ordemExecucaoAtual: 6,
  documentoStatus: 'aprovado',
  cte: 'CT-e 35260657000010',
  nf: 'ASN 5700',
  origemSigla: 'SC',
  destinoSigla: 'SP',
  embarcador: 'Carga Teste Montagem',
  destinatario: 'NanoTech Eletronicos - Montagem 2 pallets',
  endereco: 'Av. Tambore, 1512 - Barueri/SP',
  itens: skus.map((sku) => ({
    skuCodigo: sku.skuCodigo,
    tipoEmbalagem: sku.tipoEmbalagem,
    unidadesPorVolume: sku.unidadesPorVolume,
    pesoUnitarioKg: sku.pesoUnitarioKg,
    volumesDocumento: numeroDoSeed(viagemSource, sku.skuCodigo, 'volumesDocumento'),
  })),
}

const etiquetas = calcularEtiquetas(viagem, recebimento, '2026-06-30T10:35:00.000')
assert.equal(etiquetas.length, 370, `${RECEBIMENTO_ID} deve gerar 370 volumes de montagem`)

const dimensoesPorSku = new Map(skus.map((sku) => [sku.skuCodigo, sku.dimensoesM]))
const volumes = etiquetas.map((etiqueta) => {
  const dimensoes = dimensoesPorSku.get(etiqueta.skuCodigo)
  assert.ok(dimensoes, `dimensoes devem existir para ${etiqueta.skuCodigo}`)
  return {
    etiquetaId: etiqueta.id,
    skuCodigo: etiqueta.skuCodigo,
    pesoKg: etiqueta.kgValor,
    cubagemM3: dimensoes.comprimentoM * dimensoes.larguraM * dimensoes.alturaM,
    ...dimensoes,
  }
})

const buckets = planejarBucketsPallets(volumes, {
  limites: { comprimentoM: 1.2, larguraM: 1, alturaM: 3, pesoKg: 1500 },
  getPesoKg: (volume) => volume.pesoKg,
  getCubagemM3: (volume) => volume.cubagemM3,
  getDimensoes: (volume) => ({
    comprimentoM: volume.comprimentoM,
    larguraM: volume.larguraM,
    alturaM: volume.alturaM,
  }),
})

assert.equal(buckets.length, 2, `${RECEBIMENTO_ID} deve ser planejado em 2 pallets`)
