import assert from 'node:assert/strict'
import {
  criarTransformacoesCaixas3D,
  type CaixaInstanciavel3D,
} from '../src/lib/pallet3dInstancing.ts'

const caixas: CaixaInstanciavel3D[] = [
  {
    id: 'CX-1',
    x: 0.25,
    y: 0.4,
    z: -0.15,
    comprimentoM: 0.6,
    alturaM: 0.25,
    larguraM: 0.4,
    cor: '#2563eb',
  },
]

assert.deepEqual(
  criarTransformacoesCaixas3D(caixas),
  [
    {
      id: 'CX-1',
      position: [0.25, 0.4, -0.15],
      scale: [0.6, 0.25, 0.4],
      color: '#2563eb',
    },
  ],
  'deve preservar dimensoes reais em metros ao preparar instancias 3D',
)

