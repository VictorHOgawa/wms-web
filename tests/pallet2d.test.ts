import assert from 'node:assert/strict'
import {
  projetarCaixaPallet2D,
  projetarAlturaPallet2D,
  type CaixaProjetavel2D,
} from '../src/lib/pallet2d.ts'

const caixa: CaixaProjetavel2D = {
  id: 'CX-1',
  x: 0,
  z: 0,
  comprimentoM: 0.6,
  larguraM: 0.4,
  alturaM: 0.25,
  bottomM: 0.5,
}

assert.deepEqual(
  projetarCaixaPallet2D(caixa, { comprimentoM: 1.2, larguraM: 1 }),
  {
    leftPct: 25,
    topPct: 30,
    widthPct: 50,
    heightPct: 40,
  },
  'deve converter a caixa centralizada para percentuais da vista superior',
)

assert.deepEqual(
  projetarAlturaPallet2D(caixa, 3),
  {
    bottomPct: 16.666666666666664,
    heightPct: 8.333333333333332,
  },
  'deve converter base e altura da caixa para percentuais da regua lateral',
)

