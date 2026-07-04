import assert from 'node:assert/strict'
import {
  criarDadosDestinoA4,
  tipoDestinoA4Label,
  type TipoDestinoA4,
} from '../src/lib/montagemDestinoA4.ts'

assert.equal(
  tipoDestinoA4Label.armazenagem,
  'Armazenagem',
  'deve manter o label de armazenagem para o fluxo normal',
)

assert.equal(
  tipoDestinoA4Label['cross-docking'],
  'Cross-docking',
  'deve identificar o fluxo de cross-docking',
)

assert.deepEqual(
  criarDadosDestinoA4({
    tipo: 'armazenagem',
    cliente: 'Verde Alimentos',
    entradaStagingIso: '2026-06-29T18:30:00.000Z',
  }),
  {
    destino: 'armazenagem',
    destinoLabel: 'Armazenagem',
  },
  'armazenagem deve gerar somente o destino normal do A4',
)

const crossDocking = criarDadosDestinoA4({
  tipo: 'cross-docking',
  cliente: 'Verde Alimentos',
  entradaStagingIso: '2026-06-29T18:30:00.000Z',
})

assert.deepEqual(
  crossDocking,
  {
    destino: 'cross-docking',
    destinoLabel: 'Cross-docking',
    cliente: 'Verde Alimentos',
    entradaStagingIso: '2026-06-29T18:30:00.000Z',
  },
  'cross-docking deve levar cliente e data de entrada no staging para o A4',
)

assert.throws(
  () =>
    criarDadosDestinoA4({
      tipo: 'cross-docking',
      cliente: '   ',
      entradaStagingIso: '2026-06-29T18:30:00.000Z',
    }),
  /cliente/i,
  'cross-docking deve exigir cliente para rastreio no A4',
)

assert.throws(
  () =>
    criarDadosDestinoA4({
      tipo: 'cross-docking',
      cliente: 'Verde Alimentos',
      entradaStagingIso: '',
    }),
  /staging/i,
  'cross-docking deve exigir data de entrada no staging',
)

const tipo: TipoDestinoA4 = 'armazenagem'
assert.equal(tipo, 'armazenagem', 'tipo deve aceitar armazenagem')
