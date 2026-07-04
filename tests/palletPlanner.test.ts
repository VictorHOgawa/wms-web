import assert from 'node:assert/strict'
import {
  estimarAlturaPallet,
  planejarBucketsPallets,
  volumeCabeNoPallet,
  type LimitesPallet,
} from '../src/lib/palletPlanner.ts'

interface VolumeTeste {
  id: string
  pesoKg: number
  cubagemM3: number
  comprimentoM: number
  larguraM: number
  alturaM: number
}

const limites: LimitesPallet = {
  comprimentoM: 1.2,
  larguraM: 1,
  alturaM: 3,
  pesoKg: 1500,
}

const dimensoes = (volume: VolumeTeste) => ({
  comprimentoM: volume.comprimentoM,
  larguraM: volume.larguraM,
  alturaM: volume.alturaM,
})

const volume = (id: string, alturaM: number): VolumeTeste => ({
  id,
  pesoKg: 20,
  cubagemM3: 1.2 * alturaM,
  comprimentoM: 1.2,
  larguraM: 1,
  alturaM,
})

const buckets = planejarBucketsPallets(
  [volume('A', 1.65), volume('B', 1.35), volume('C', 1.25), volume('D', 1.05)],
  {
    limites,
    getPesoKg: (item) => item.pesoKg,
    getCubagemM3: (item) => item.cubagemM3,
    getDimensoes: dimensoes,
  },
)

assert.equal(buckets.length, 2, 'deve usar a quantidade minima de pallets viavel')

const alturas = buckets
  .map((bucket) => estimarAlturaPallet(bucket, limites, dimensoes))
  .sort((a, b) => a - b)

assert.ok(
  alturas[1] - alturas[0] <= 0.25,
  `deve balancear a altura entre pallets; alturas calculadas: ${alturas.join(', ')}`,
)

assert.equal(
  volumeCabeNoPallet(
    { pesoKg: 10, cubagemM3: 0.5, comprimentoM: 1.3, larguraM: 0.9, alturaM: 0.4 },
    limites,
    dimensoes,
  ),
  false,
  'deve rejeitar volume que nao cabe na base do pallet em nenhuma orientacao',
)
